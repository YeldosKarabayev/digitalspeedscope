import { Injectable } from "@nestjs/common";
import { MikrotikApiService } from "../mikrotik/mikrotik-api.service";

export type RemoteSpeedRunParams = {
  targetHost: string;
  durationSec?: number; // 10
  protocol?: "tcp" | "udp"; // tcp
  direction?: "both" | "tx" | "rx"; // both
  user?: string; // если btest server требует логин
  password?: string;
  // (опционально) ограничение, чтобы “не убить” канал
  // maxMbps?: number;
};

export type RemoteSpeedResult = {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number; // на MVP можно 0, или отдельным ping
  jitterMs?: number;
  packetLoss?: number;
  raw: any;
};

function kbpsToMbps(kbps: number) {
  if (!Number.isFinite(kbps) || kbps <= 0) return 0;
  return Math.round(kbps / 1000);
}

@Injectable()
export class MikrotikSpeedRunner {
  constructor(private readonly api: MikrotikApiService) {}

  async runBandwidthTest(
    conn: { host: string; port?: number; username: string; password: string },
    p: RemoteSpeedRunParams,
  ): Promise<RemoteSpeedResult> {
    const duration = `${Math.max(3, Math.min(p.durationSec ?? 10, 60))}s`;
    const protocol = (p.protocol ?? "tcp").toLowerCase();
    const direction = (p.direction ?? "both").toLowerCase();

    // RouterOS CLI-like sentence:
    // /tool bandwidth-test address=<target> duration=10s protocol=tcp direction=both
    // + optionally user/password for btest server
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
      { host: conn.host, port: conn.port, username: conn.username, password: conn.password },
      sentence,
      70_000,
    );

    // Парсинг: в зависимости от версии RouterOS данные могут быть в разных местах.
    // Поэтому делаем “best-effort”:
    // Ищем в raw все numeric rx/tx average/total.
    let rxKbps = 0;
    let txKbps = 0;

    const rows: any[] = [];
    for (const r of Array.isArray(raw) ? raw : [raw]) {
      if (r?.data && Array.isArray(r.data)) rows.push(...r.data);
      if (r?.data && !Array.isArray(r.data)) rows.push(r.data);
    }

    for (const row of rows) {
      // Часто встречаются поля вроде: "rx-total-average", "tx-total-average" (может быть string)
      const rx =
        Number(row["rx-total-average"] ?? row["rx-average"] ?? row["rx"] ?? 0) ||
        Number(row["rx-bits-per-second"] ?? 0) / 1000;
      const tx =
        Number(row["tx-total-average"] ?? row["tx-average"] ?? row["tx"] ?? 0) ||
        Number(row["tx-bits-per-second"] ?? 0) / 1000;

      if (rx > rxKbps) rxKbps = rx;
      if (tx > txKbps) txKbps = tx;
    }

    // Важно: что считать download/upload зависит от direction:
    // rx = то, что РОУТЕР ПРИНИМАЕТ, tx = то, что РОУТЕР ОТПРАВЛЯЕТ.
    // Для мониторинга “канала точки” обычно:
    // download = rx, upload = tx
    const downloadMbps = kbpsToMbps(rxKbps);
    const uploadMbps = kbpsToMbps(txKbps);

    return {
      downloadMbps,
      uploadMbps,
      pingMs: 0, // на следующем шаге добавим отдельный /ping targetHost
      raw,
    };
  }
}