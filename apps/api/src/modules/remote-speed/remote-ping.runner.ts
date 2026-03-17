import { Injectable } from "@nestjs/common";
import { MikrotikApiService } from "../mikrotik/mikrotik-api.service";
import { avg, parseRouterOsTimeToMs } from "./time.util";

type Conn = {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeoutMs?: number;
};

@Injectable()
export class RemotePingRunner {
  constructor(private readonly mikrotik: MikrotikApiService) {}

  async run(conn: Conn, target = "8.8.8.8", count = 5) {
    const safeCount = Math.min(count, 3);

    const raw = await this.mikrotik.exec(
      conn,
      [
        "/ping",
        `=address=${target}`,
        `=count=${safeCount}`,
        "=interval=200ms",
      ],
      15_000,
    );

    const rows = Array.isArray(raw) ? raw : [raw];

    const times: number[] = [];
    let packetLoss: number | null = null;

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;

      const ms = parseRouterOsTimeToMs((row as any).time);
      if (ms != null) times.push(ms);

      const lossRaw = (row as any)["packet-loss"];
      if (lossRaw != null) {
        const lossNum = Number(lossRaw);
        if (Number.isFinite(lossNum)) {
          packetLoss = lossNum;
        }
      }
    }

    const pingMs = avg(times);

    let jitterMs: number | null = null;
    if (times.length > 1) {
      const diffs: number[] = [];
      for (let i = 1; i < times.length; i++) {
        diffs.push(Math.abs(times[i] - times[i - 1]));
      }
      jitterMs = avg(diffs);
    }

    return {
      pingMs,
      jitterMs,
      packetLoss,
      samples: times.length,
      raw,
    };
  }
}