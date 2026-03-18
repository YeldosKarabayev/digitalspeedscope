import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { Client } from "ssh2";

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

function pick(raw: string, key: string): string | undefined {
  const re = new RegExp(`${key}:\\s+(.+)`);
  return raw.match(re)?.[1]?.trim();
}

function buildBandwidthCommand(p: RemoteSpeedRunParams): string {
  const duration = `${Math.max(3, Math.min(p.durationSec ?? 10, 60))}s`;
  const protocol = (p.protocol ?? "tcp").toLowerCase();
  const direction = (p.direction ?? "both").toLowerCase();

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

function execSshCommand(conn: SshConn, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new Client();
    const chunks: Buffer[] = [];
    const errs: Buffer[] = [];
    const readyTimeout = conn.timeoutMs ?? 70_000;

    const cleanup = () => {
      try {
        client.end();
      } catch {}
      try {
        client.destroy();
      } catch {}
    };

    client
      .on("ready", () => {
        client.exec(command, (err, stream) => {
          if (err) {
            cleanup();
            reject(err);
            return;
          }

          stream.on("close", () => {
            const stdout = Buffer.concat(chunks).toString("utf8");
            const stderr = Buffer.concat(errs).toString("utf8");
            cleanup();

            if (stderr.trim()) {
              reject(new Error(stderr.trim()));
              return;
            }

            resolve(stdout);
          });

          stream.on("data", (data: Buffer) => chunks.push(data));
          stream.stderr.on("data", (data: Buffer) => errs.push(data));
        });
      })
      .on("error", (err) => {
        cleanup();
        reject(err);
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
    const command = buildBandwidthCommand(p);
    const raw = await execSshCommand(conn, command);

    const normalized = raw.replace(/\r/g, "");

    if (/authentication failed/i.test(normalized)) {
      throw new InternalServerErrorException("Bandwidth-test authentication failed");
    }

    if (/invalid user name or password/i.test(normalized)) {
      throw new InternalServerErrorException("RouterOS SSH authentication failed");
    }

    const txAvg = parseRateToMbps(pick(normalized, "tx-total-average"));
    const rxAvg = parseRateToMbps(pick(normalized, "rx-total-average"));
    const localCpuLoad = parsePercent(pick(normalized, "local-cpu-load"));
    const remoteCpuLoad = parsePercent(pick(normalized, "remote-cpu-load"));
    const connectionCount = parseIntSafe(pick(normalized, "connection-count"));

    const hasAnyTraffic = txAvg > 0 || rxAvg > 0;
    if (!hasAnyTraffic) {
      throw new InternalServerErrorException("Bandwidth-test finished with zero traffic");
    }

    return {
      downloadMbps: rxAvg,
      uploadMbps: txAvg,
      pingMs: 0,
      raw: normalized,
      localCpuLoad,
      remoteCpuLoad,
      connectionCount,
    };
  }
}