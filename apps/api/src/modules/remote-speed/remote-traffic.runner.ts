import { Injectable } from "@nestjs/common";
import { MikrotikApiService } from "../mikrotik/mikrotik-api.service";

type Conn = {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeoutMs?: number;
};

@Injectable()
export class RemoteTrafficRunner {
  constructor(private readonly mikrotik: MikrotikApiService) {}

  async run(conn: Conn, interfaceName = "ether1") {
    const raw = await this.mikrotik.exec(conn, [
      "/interface/monitor-traffic",
      `=interface=${interfaceName}`,
      "=once=",
    ]);

    const row = Array.isArray(raw) ? raw[0] ?? {} : raw ?? {};

    const rxBps = Number((row as any)["rx-bits-per-second"] ?? 0);
    const txBps = Number((row as any)["tx-bits-per-second"] ?? 0);

    return {
      downloadMbps: Math.round(rxBps / 1_000_000),
      uploadMbps: Math.round(txBps / 1_000_000),
      raw,
    };
  }
}