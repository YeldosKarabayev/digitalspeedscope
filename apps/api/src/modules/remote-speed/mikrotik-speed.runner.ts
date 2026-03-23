import { Injectable, Logger } from "@nestjs/common";
import { Client } from "ssh2";

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
  connectionCount?: number;
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

function pick(raw: string, key: string): string | undefined {
  const target = `${key.toLowerCase()}:`;

  const lines = raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.toLowerCase().startsWith(target));

  if (lines.length === 0) return undefined;

  const line = lines[lines.length - 1];
  return line.slice(line.indexOf(":") + 1).trim();
}

function buildBandwidthCommand(p: RemoteSpeedRunParams): string {
  const duration = `${Math.max(3, Math.min(p.durationSec ?? 5, 60))}s`;
  const protocol = (p.protocol ?? "tcp").toLowerCase();
  const direction = (p.direction ?? "transmit").toLowerCase();
  const connectionCount = Math.max(1, Math.min(p.connectionCount ?? 20, 200));

  const parts = [
    `/tool bandwidth-test`,
    `address=${p.targetHost}`,
    `duration=${duration}`,
    `protocol=${protocol}`,
    `direction=${direction}`,
    `connection-count=${connectionCount}`,
  ];

  if (p.user) {
    parts.push(`user=${p.user}`);
  }

  if (p.password) {
    parts.push(`password="${p.password}"`);
  }

  return parts.join(" ");
}

function execSshCommand(conn: SshConn, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const chunks: Buffer[] = [];
    const errs: Buffer[] = [];
    const timeoutMs = conn.timeoutMs ?? 30_000;

    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      try {
        client.end();
      } catch {}

      try {
        client.destroy();
      } catch {}

      fn();
    };

    client
      .on("ready", () => {
        client.exec(command, (err, stream) => {
          if (err) {
            finish(() => reject(err));
            return;
          }

          timer = setTimeout(() => {
            try {
              stream.close();
            } catch {}

            finish(() =>
              reject(new Error(`SSH command timeout after ${timeoutMs}ms`)),
            );
          }, timeoutMs);

          stream.on("data", (data: Buffer) => chunks.push(data));
          stream.stderr.on("data", (data: Buffer) => errs.push(data));

          stream.on("close", () => {
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

          stream.on("error", (streamErr) => {
            finish(() => reject(streamErr));
          });
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
        readyTimeout: timeoutMs,
      });
  });
}

@Injectable()
export class MikrotikSpeedRunner {
  private readonly logger = new Logger(MikrotikSpeedRunner.name);

  private parseNormalizedOutput(normalized: string): RemoteSpeedResult {
    const txAvg =
      parseRateToMbps(pick(normalized, "tx-total-average")) ||
      parseRateToMbps(pick(normalized, "tx-10-second-average")) ||
      parseRateToMbps(pick(normalized, "tx-current"));

    const rxAvg =
      parseRateToMbps(pick(normalized, "rx-total-average")) ||
      parseRateToMbps(pick(normalized, "rx-10-second-average")) ||
      parseRateToMbps(pick(normalized, "rx-current"));

    const parsed = {
      txTotalAverage: pick(normalized, "tx-total-average"),
      tx10SecondAverage: pick(normalized, "tx-10-second-average"),
      txCurrent: pick(normalized, "tx-current"),
      rxTotalAverage: pick(normalized, "rx-total-average"),
      rx10SecondAverage: pick(normalized, "rx-10-second-average"),
      rxCurrent: pick(normalized, "rx-current"),
      txAvg,
      rxAvg,
    };

    this.logger.debug(`BTEST PARSED ${JSON.stringify(parsed)}`);

    if (txAvg <= 0 && rxAvg <= 0) {
      throw new BandwidthTestError(
        "Bandwidth-test finished with zero traffic",
        normalized,
      );
    }

    return {
      downloadMbps: rxAvg,
      uploadMbps: txAvg,
      pingMs: 0,
      raw: normalized,
      localCpuLoad: parsePercent(pick(normalized, "local-cpu-load")),
      remoteCpuLoad: parsePercent(pick(normalized, "remote-cpu-load")),
      connectionCount: parseIntSafe(pick(normalized, "connection-count")),
    };
  }

  private async runOnce(
    conn: SshConn,
    p: RemoteSpeedRunParams,
  ): Promise<RemoteSpeedResult> {
    const durationSec = Math.max(3, Math.min(p.durationSec ?? 5, 60));
    const command = buildBandwidthCommand({
      ...p,
      durationSec,
    });

    this.logger.debug(`BTEST CMD: ${command}`);

    const raw = await execSshCommand(conn, command);
    const normalized = normalizeCliOutput(raw);

    this.logger.debug("=== BTEST NORMALIZED OUTPUT START ===");
    this.logger.debug(normalized);
    this.logger.debug("=== BTEST NORMALIZED OUTPUT END ===");

    if (/authentication failed/i.test(normalized)) {
      throw new BandwidthTestError(
        "Bandwidth-test authentication failed",
        normalized,
      );
    }

    if (/invalid user name or password/i.test(normalized)) {
      throw new BandwidthTestError(
        "RouterOS SSH authentication failed",
        normalized,
      );
    }

    if (/could not connect/i.test(normalized)) {
      throw new BandwidthTestError(
        "Bandwidth-test could not connect to target",
        normalized,
      );
    }

    return this.parseNormalizedOutput(normalized);
  }

  async runBandwidthTest(
    conn: SshConn,
    p: RemoteSpeedRunParams,
  ): Promise<RemoteSpeedResult> {
    const baseParams: RemoteSpeedRunParams = {
      ...p,
      durationSec: Math.max(3, Math.min(p.durationSec ?? 5, 60)),
      connectionCount: Math.max(1, Math.min(p.connectionCount ?? 20, 200)),
    };

    const first = await this.runOnce(conn, baseParams);

    const isWeakReceive =
      (baseParams.direction ?? "transmit") === "receive" &&
      first.downloadMbps > 0 &&
      first.downloadMbps < 10;

    if (!isWeakReceive) {
      return first;
    }

    const boostedCount = Math.max(
      40,
      Math.min((baseParams.connectionCount ?? 20) * 2, 60),
    );

    if (boostedCount === baseParams.connectionCount) {
      return first;
    }

    this.logger.warn(
      `Weak receive result detected (${first.downloadMbps} Mbps), retrying with connection-count=${boostedCount}`,
    );

    const retry = await this.runOnce(conn, {
      ...baseParams,
      connectionCount: boostedCount,
    });

    return retry.downloadMbps >= first.downloadMbps ? retry : first;
  }
}