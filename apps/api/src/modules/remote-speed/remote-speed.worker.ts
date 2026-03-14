import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.module";
import { RemotePingRunner } from "./remote-ping.runner";
import { RemoteTrafficRunner } from "./remote-traffic.runner";

function calcStatus(pingMs: number | null, packetLoss: number | null) {
  if (pingMs == null) return "UNKNOWN";
  if ((packetLoss ?? 0) >= 5 || pingMs >= 150) return "POOR";
  if ((packetLoss ?? 0) >= 2 || pingMs >= 80) return "FAIR";
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
    const queued = await this.prisma.remoteSpeedJob.findFirst({
      where: { status: "QUEUED" as any },
      orderBy: { createdAt: "asc" },
    });

    if (!queued) return;

    const claimed = await this.prisma.remoteSpeedJob.updateMany({
      where: {
        id: queued.id,
        status: "QUEUED" as any,
      },
      data: {
        status: "RUNNING" as any,
        phase: "CONNECTING",
        progress: 5,
        message: "Job claimed by worker",
        errorMessage: null,
      } as any,
    });

    if (claimed.count === 0) return;

    await this.process(queued.id);
  }

  async process(jobId: string) {
    const job = await this.prisma.remoteSpeedJob.findUnique({
      where: { id: jobId },
      include: { device: true },
    });

    if (!job?.device) return;

    try {
      const conn = {
        host: job.device.mikrotikHost!,
        port: job.device.mikrotikPort ?? 8728,
        username: (job.device as any).mikrotikUsername ?? "admin",
        password:
          (job.device as any).mikrotikPassword ??
          process.env.MIKROTIK_PASSWORD!,
        timeoutMs: 15000,
      };

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          phase: "PING",
          progress: 25,
          message: "Running remote ping",
        } as any,
      });

      const pingTarget = (job.device as any).pingTarget ?? "8.8.8.8";
      const ping = await this.pingRunner.run(conn, pingTarget, 5);

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          phase: "TRAFFIC",
          progress: 60,
          message: "Reading interface traffic",
        } as any,
      });

      const interfaceName = (job.device as any).wanInterface ?? "ether1";
      const traffic = await this.trafficRunner.run(conn, interfaceName);

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          phase: "SAVING",
          progress: 85,
          message: "Saving measurement",
        } as any,
      });

      const measurement = await this.prisma.measurement.create({
        data: {
          deviceId: job.deviceId,
          downloadMbps: traffic.downloadMbps,
          uploadMbps: traffic.uploadMbps,
          pingMs: ping.pingMs,
          jitterMs: ping.jitterMs,
          packetLoss: ping.packetLoss ?? 0,
          status: calcStatus(ping.pingMs, ping.packetLoss) as any,
        } as any,
      });

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          status: "SUCCEEDED" as any,
          progress: 100,
          phase: "DONE",
          message: "Remote speed job completed",
          measurementId: measurement.id,
          errorMessage: null,
        } as any,
      });
    } catch (e: any) {
      this.logger.error(
        `RemoteSpeed job failed: jobId=${jobId} deviceId=${job.deviceId} host=${job.device.mikrotikHost} message=${e?.message ?? e}`,
        e?.stack,
      );

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED" as any,
          phase: "FAILED",
          message: "Remote speed job failed",
          errorMessage: e?.message ?? "Unknown error",
        } as any,
      });
    }
  }
}