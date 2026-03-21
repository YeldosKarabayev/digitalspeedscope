import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Client, ClientChannel } from "ssh2";

export class BandwidthTestError extends Error {
  constructor(
    message: string,
    public readonly raw?: string,
  ) {
    super(message);
    this.name = "BandwidthTestError";
  }
}

export type RemoteSpeedRunParams = {
  targetHost: string;
  durationSec?: number;
  protocol?: "tcp" | "udp";
  direction?: "both" | "transmit" | "receive";
  user?: string;
  password?: string;
};

export type RemoteSpeedResult = {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs?: number;
  packetLoss?: number;
  raw: string;
  localCpuLoad?: number | null;
  remoteCpuLoad?: number | null;
  connectionCount?: number | null;
};

type SshConn = {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeoutMs?: number;
};

type ParsedLiveStats = {
  txTotalAverage?: number;
  tx10SecondAverage?: number;
  txCurrent?: number;
  rxTotalAverage?: number;
  rx10SecondAverage?: number;
  rxCurrent?: number;
  localCpuLoad?: number | null;
  remoteCpuLoad?: number | null;
  connectionCount?: number | null;
  authenticationFailed?: boolean;
  invalidUserOrPassword?: boolean;
  couldNotConnect?: boolean;
};

function parseRateToMbps(value: string | undefined): number {
  if (!value) return 0;

  const s = value.trim().toLowerCase();
  const n = Number.parseFloat(s);

  if (!Number.isFinite(n)) return 0;

  if (s.endsWith("gbps")) return Math.round(n * 1000 * 100) / 100;
  if (s.endsWith("mbps")) return Math.round(n * 100) / 100;
  if (s.endsWith("kbps")) return Math.round((n / 1000) * 100) / 100;
  if (s.endsWith("bps")) return Math.round((n / 1_000_000) * 100) / 100;

  return Math.round(n * 100) / 100;
}

function parsePercent(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value.replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseIntSafe(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeCliOutput(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildBandwidthCommand(p: RemoteSpeedRunParams): string {
  const duration = `${Math.max(3, Math.min(p.durationSec ?? 5, 60))}s`;
  const protocol = (p.protocol ?? "tcp").toLowerCase();
  const direction = (p.direction ?? "transmit").toLowerCase();

  const parts = [
    `/tool bandwidth-test`,
    `address=${p.targetHost}`,
    `duration=${duration}`,
    `protocol=${protocol}`,
    `direction=${direction}`,
  ];

  if (p.user) parts.push(`user=${p.user}`);
  if (p.password) parts.push(`password="${p.password}"`);

  return parts.join(" ");
}

function parseKeyValueLine(line: string): { key: string; value: string } | null {
  const idx = line.indexOf(":");
  if (idx <= 0) return null;

  const key = line.slice(0, idx).trim().toLowerCase();
  const value = line.slice(idx + 1).trim();

  if (!key) return null;
  return { key, value };
}

function parseLiveStats(raw: string): ParsedLiveStats {
  const normalized = normalizeCliOutput(raw);
  const lines = normalized.split("\n").map((s) => s.trim()).filter(Boolean);

  const stats: ParsedLiveStats = {};

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes("authentication failed")) {
      stats.authenticationFailed = true;
    }
    if (lower.includes("invalid user name or password")) {
      stats.invalidUserOrPassword = true;
    }
    if (lower.includes("could not connect")) {
      stats.couldNotConnect = true;
    }

    const kv = parseKeyValueLine(line);
    if (!kv) continue;

    switch (kv.key) {
      case "tx-total-average":
        stats.txTotalAverage = parseRateToMbps(kv.value);
        break;
      case "tx-10-second-average":
        stats.tx10SecondAverage = parseRateToMbps(kv.value);
        break;
      case "tx-current":
        stats.txCurrent = parseRateToMbps(kv.value);
        break;
      case "rx-total-average":
        stats.rxTotalAverage = parseRateToMbps(kv.value);
        break;
      case "rx-10-second-average":
        stats.rx10SecondAverage = parseRateToMbps(kv.value);
        break;
      case "rx-current":
        stats.rxCurrent = parseRateToMbps(kv.value);
        break;
      case "local-cpu-load":
        stats.localCpuLoad = parsePercent(kv.value);
        break;
      case "remote-cpu-load":
        stats.remoteCpuLoad = parsePercent(kv.value);
        break;
      case "connection-count":
        stats.connectionCount = parseIntSafe(kv.value);
        break;
      default:
        break;
    }
  }

  return stats;
}

function execBandwidthShell(conn: SshConn, command: string, durationSec: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const chunks: Buffer[] = [];
    const errs: Buffer[] = [];

    const readyTimeout = conn.timeoutMs ?? 30_000;
    const testTimeoutMs = Math.max(10_000, durationSec * 1000 + 8_000);

    let settled = false;
    let timeoutTimer: NodeJS.Timeout | null = null;
    let stream: ClientChannel | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;

      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }

      try {
        stream?.close();
      } catch { }
      try {
        client.end();
      } catch { }
      try {
        client.destroy();
      } catch { }

      fn();
    };

    client
      .on("ready", () => {
        client.shell({ term: "vt100", cols: 200, rows: 40 }, (err, shell) => {
          if (err) {
            finish(() => reject(err));
            return;
          }

          stream = shell;

          shell.on("data", (data: Buffer) => {
            chunks.push(data);
          });

          shell.stderr.on("data", (data: Buffer) => {
            errs.push(data);
          });

          shell.on("error", (shellErr) => {
            finish(() => reject(shellErr));
          });

          shell.on("close", () => {
            const stdout = Buffer.concat(chunks).toString("utf8");
            const stderr = Buffer.concat(errs).toString("utf8");

            finish(() => {
              if (stderr.trim()) {
                reject(new Error(stderr.trim()));
                return;
              }
              resolve(stdout);
            });
          });

          shell.write(command + "\n");

          timeoutTimer = setTimeout(() => {
            try {
              shell.write("\u0003"); // Ctrl+C
            } catch { }

            setTimeout(() => {
              const stdout = Buffer.concat(chunks).toString("utf8");
              finish(() => resolve(stdout));
            }, 1200);
          }, testTimeoutMs);
        });
      })
      .on("error", (err) => {
        finish(() => reject(err));
      })
      .connect({
        host: conn.host,
        port: conn.port ?? 22,
        username: conn.username,
        password: conn.password,
        readyTimeout,
      });
  });
}

@Injectable()
export class MikrotikSpeedRunner {
  async runBandwidthTest(
    conn: SshConn,
    p: RemoteSpeedRunParams,
  ): Promise<RemoteSpeedResult> {
    const durationSec = Math.max(3, Math.min(p.durationSec ?? 5, 60));
    const command = buildBandwidthCommand({
      ...p,
      durationSec,
    });

    const raw = await execBandwidthShell(conn, command, durationSec);
    const normalized = normalizeCliOutput(raw);
    const stats = parseLiveStats(normalized);

    if (stats.authenticationFailed) {
      throw new BandwidthTestError("Bandwidth-test authentication failed", normalized);
    }

    if (stats.invalidUserOrPassword) {
      throw new BandwidthTestError("RouterOS SSH authentication failed", normalized);
    }

    if (stats.couldNotConnect) {
      throw new BandwidthTestError("Bandwidth-test could not connect to target", normalized);
    }

    const txAvg =
      stats.txTotalAverage ||
      stats.tx10SecondAverage ||
      stats.txCurrent ||
      0;

    const rxAvg =
      stats.rxTotalAverage ||
      stats.rx10SecondAverage ||
      stats.rxCurrent ||
      0;

    const hasAnyTraffic = txAvg > 0 || rxAvg > 0;

    console.error("=== BTEST NORMALIZED OUTPUT START ===");
    console.error(normalized);
    console.error("=== BTEST NORMALIZED OUTPUT END ===");

    if (!hasAnyTraffic) {
      throw new BandwidthTestError("Bandwidth-test finished with zero traffic", normalized);
    }

    console.error("BTEST PARSED", {
      txTotalAverage: stats.txTotalAverage,
      tx10SecondAverage: stats.tx10SecondAverage,
      txCurrent: stats.txCurrent,
      rxTotalAverage: stats.rxTotalAverage,
      rx10SecondAverage: stats.rx10SecondAverage,
      rxCurrent: stats.rxCurrent,
    });

    return {
      downloadMbps: rxAvg,
      uploadMbps: txAvg,
      pingMs: 0,
      raw: normalized,
      localCpuLoad: stats.localCpuLoad ?? null,
      remoteCpuLoad: stats.remoteCpuLoad ?? null,
      connectionCount: stats.connectionCount ?? null,
    };
  }
}