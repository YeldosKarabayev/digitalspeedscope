import { Injectable } from "@nestjs/common";
import { MikrotikService } from "../mikrotik/mikrotik.service";

@Injectable()
export class ChrQueueService {
  constructor(private readonly mikrotik: MikrotikService) {}

  async attach(deviceIp: string, runId: string, maxMbps: number) {
    return this.mikrotik.exec({
      host: process.env.CHR_HOST!,
      command: `
        /queue simple add \
        name="dss-${runId}" \
        target=${deviceIp} \
        max-limit=${maxMbps}M/${maxMbps}M
      `,
    });
  }

  async detach(runId: string) {
    return this.mikrotik.exec({
      host: process.env.CHR_HOST!,
      command: `
        /queue simple remove [find name="dss-${runId}"]
      `,
    });
  }
}