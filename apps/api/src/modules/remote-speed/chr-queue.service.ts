import { Injectable } from "@nestjs/common";
import { MikrotikService } from "../mikrotik/mikrotik.service";

@Injectable()
export class ChrQueueService {
  constructor(private readonly mikrotik: MikrotikService) {}

  private getChrConn() {
    const host = process.env.CHR_HOST;
    const username =
      process.env.CHR_USERNAME ?? process.env.MIKROTIK_USERNAME ?? "admin";
    const password = process.env.CHR_PASSWORD ?? process.env.MIKROTIK_PASSWORD;
    const port = Number(process.env.CHR_API_PORT ?? 8728);

    if (!host) {
      throw new Error("CHR_HOST is not configured");
    }

    if (!password) {
      throw new Error("CHR_PASSWORD or MIKROTIK_PASSWORD is not configured");
    }

    return { host, username, password, port };
  }

  async attach(deviceIp: string, runId: string, maxMbps: number) {
    const chr = this.getChrConn();

    return this.mikrotik.addSimpleQueue({
      host: chr.host,
      port: chr.port,
      username: chr.username,
      password: chr.password,
      timeoutMs: 15_000,
      name: `dss-${runId}`,
      target: deviceIp,
      maxLimitMbps: maxMbps,
    });
  }

  async detach(runId: string) {
    const chr = this.getChrConn();

    return this.mikrotik.removeSimpleQueueByName({
      host: chr.host,
      port: chr.port,
      username: chr.username,
      password: chr.password,
      timeoutMs: 15_000,
      name: `dss-${runId}`,
    });
  }
}