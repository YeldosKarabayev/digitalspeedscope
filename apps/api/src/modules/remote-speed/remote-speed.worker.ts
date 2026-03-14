import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.module";
import { RemotePingRunner } from "./remote-ping.runner";
import { RemoteTrafficRunner } from "./remote-traffic.runner";

function calcStatus(pingMs: number, packetLoss: number) {
  if (packetLoss >= 5 || pingMs >= 150) return "POOR";
  if (packetLoss >= 2 || pingMs >= 80) return "FAIR";
  if (pingMs >= 35) return "GOOD";
  return "EXCELLENT";
}

@Injectable()
export class RemoteSpeedWorker {
  private readonly logger = new Logger(RemoteSpeedWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pingRunner: RemotePingRunner,
    private readonly trafficRunner: RemoteTrafficRunner,
  ) {}

  @Interval(5000)
  async tick() {
    const job = await this.prisma.remoteSpeedJob.findFirst({
      where: { status: "PENDING" as any },
      orderBy: { createdAt: "asc" },
      include: { device: true },
    });

    if (!job) return;

    await this.process(job.id);
  }

  async process(jobId: string) {
    const job = await this.prisma.remoteSpeedJob.findUnique({
      where: { id: jobId },
      include: { device: true },
    });

    if (!job?.device) return;

    await this.prisma.remoteSpeedJob.update({
      where: { id: jobId },
      data: {
        status: "RUNNING" as any,
        startedAt: new Date(),
      } as any,
    });

    try {
      const conn = {
        host: job.device.mikrotikHost!,
        port: job.device.mikrotikPort ?? 8728,
        username: "admin",
        password: process.env.MIKROTIK_PASSWORD!,
        timeoutMs: 15000,
      };

      const ping = await this.pingRunner.run(conn, "8.8.8.8", 5);
      const traffic = await this.trafficRunner.run(conn, "ether1");

      const measurement = await this.prisma.measurement.create({
        data: {
          deviceId: job.deviceId,
          downloadMbps: traffic.downloadMbps,
          uploadMbps: traffic.uploadMbps,
          pingMs: ping.pingMs,
          jitterMs: ping.jitterMs,
          packetLoss: ping.packetLoss,
          status: calcStatus(ping.pingMs, ping.packetLoss) as any,
        },
      });

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          status: "SUCCEEDED" as any,
          finishedAt: new Date(),
          measurementId: measurement.id,
        } as any,
      });
    } catch (e: any) {
      this.logger.error(e?.message ?? e);

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED" as any,
          finishedAt: new Date(),
          error: e?.message ?? "Unknown error",
        } as any,
      });
    }
  }
}