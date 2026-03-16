import { Injectable } from "@nestjs/common";
import { MikrotikApiService } from "../mikrotik/mikrotik-api.service";

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
  raw: any;
  localCpuLoad?: number | null;
  remoteCpuLoad?: number | null;
  connectionCount?: number | null;
};

function kbpsToMbps(kbps: number) {
  if (!Number.isFinite(kbps) || kbps <= 0) return 0;
  return Math.round((kbps / 1000) * 100) / 100;
}

function parseRateToKbps(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;

  const s = String(value).trim().toLowerCase();
  const n = Number.parseFloat(s);

  if (!Number.isFinite(n)) return 0;

  if (s.endsWith("gbps")) return n * 1_000_000;
  if (s.endsWith("mbps")) return n * 1_000;
  if (s.endsWith("kbps")) return n;
  if (s.endsWith("bps")) return n / 1_000;

  return n;
}

function parsePercent(value: unknown): number | null {
  if (value == null) return null;
  const s = String(value).replace("%", "").trim();
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseIntSafe(value: unknown): number | null {
  if (value == null) return null;
  const n = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class MikrotikSpeedRunner {
  constructor(private readonly api: MikrotikApiService) {}

  async runBandwidthTest(
    conn: { host: string; port?: number; username: string; password: string },
    p: RemoteSpeedRunParams,
  ): Promise<RemoteSpeedResult> {
    const duration = `${Math.max(3, Math.min(p.durationSec ?? 10, 60))}s`;
    const protocol = (p.protocol ?? "tcp").toLowerCase() as "tcp" | "udp";
    const direction = (p.direction ?? "both").toLowerCase() as
      | "both"
      | "transmit"
      | "receive";

    const sentence: string[] = [
      "/tool/bandwidth-test",
      `=address=${p.targetHost}`,
      `=duration=${duration}`,
      `=protocol=${protocol}`,
      `=direction=${direction}`,
    ];

    if (p.user) sentence.push(`=user=${p.user}`);
    if (p.password) sentence.push(`=password=${p.password}`);

    const raw = await this.api.exec(
      {
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: conn.password,
      },
      sentence,
      70_000,
    );

    let rxKbps = 0;
    let txKbps = 0;
    let localCpuLoad: number | null = null;
    let remoteCpuLoad: number | null = null;
    let connectionCount: number | null = null;

    const rows: any[] = [];
    for (const r of Array.isArray(raw) ? raw : [raw]) {
      if (r?.data && Array.isArray(r.data)) rows.push(...r.data);
      else if (r?.data) rows.push(r.data);
      else rows.push(r);
    }

    for (const row of rows) {
      const rx =
        parseRateToKbps(
          row["rx-total-average"] ?? row["rx-average"] ?? row["rx"],
        ) || parseRateToKbps(row["rx-bits-per-second"]);

      const tx =
        parseRateToKbps(
          row["tx-total-average"] ?? row["tx-average"] ?? row["tx"],
        ) || parseRateToKbps(row["tx-bits-per-second"]);

      if (rx > rxKbps) rxKbps = rx;
      if (tx > txKbps) txKbps = tx;

      localCpuLoad ??= parsePercent(row["local-cpu-load"]);
      remoteCpuLoad ??= parsePercent(row["remote-cpu-load"]);
      connectionCount ??= parseIntSafe(row["connection-count"]);
    }

    return {
      downloadMbps: kbpsToMbps(rxKbps),
      uploadMbps: kbpsToMbps(txKbps),
      pingMs: 0,
      raw,
      localCpuLoad,
      remoteCpuLoad,
      connectionCount,
    };
  }
}