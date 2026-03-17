import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.module";
import { RemotePingRunner } from "./remote-ping.runner";
import { MikrotikSpeedRunner } from "./mikrotik-speed.runner";

function calcStatus(pingMs: number | null, packetLoss: number | null) {
  if (pingMs == null || pingMs <= 0) return "POOR";
  if ((packetLoss ?? 0) >= 5 || pingMs >= 150) return "POOR";
  if ((packetLoss ?? 0) >= 2 || pingMs >= 80) return "FAIR";
  if (pingMs >= 35) return "GOOD";
  return "EXCELLENT";
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

@Injectable()
export class RemoteSpeedWorker {
  private readonly logger = new Logger(RemoteSpeedWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pingRunner: RemotePingRunner,
    private readonly mikrotikSpeedRunner: MikrotikSpeedRunner,
  ) { }

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
      const isDemo = process.env.DEMO_REMOTE_SPEED === "true";

      const conn = {
        host: job.device.mikrotikHost!,
        port: job.device.mikrotikPort ?? 8728,
        username: (job.device as any).mikrotikUsername ?? "admin",
        password:
          (job.device as any).mikrotikPassword ??
          process.env.MIKROTIK_PASSWORD!,
        timeoutMs: 15000,
      };

      let ping: {
        pingMs: number | null;
        jitterMs: number | null;
        packetLoss: number | null;
      };

      let downloadMbps: number;
      let uploadMbps: number;
      let rawResult: any = null;

      if (isDemo) {
        await this.prisma.remoteSpeedJob.update({
          where: { id: jobId },
          data: {
            phase: "PING",
            progress: 25,
            message: "Simulating remote ping",
          } as any,
        });

        ping = {
          pingMs: randomInt(8, 35),
          jitterMs: randomInt(1, 8),
          packetLoss: randomInt(0, 1),
        };

        await this.prisma.remoteSpeedJob.update({
          where: { id: jobId },
          data: {
            phase: "BANDWIDTH_TEST",
            progress: 60,
            message: "Simulating MikroTik bandwidth-test",
          } as any,
        });

        downloadMbps = randomInt(80, 300);
        uploadMbps = randomInt(30, 120);
        rawResult = { demo: true };
      } else {
        await this.prisma.remoteSpeedJob.update({
          where: { id: jobId },
          data: {
            phase: "PING",
            progress: 25,
            message: "Running remote ping",
          } as any,
        });

        const pingTarget =
          (job.device as any).pingTarget || "8.8.8.8";

        ping = await this.pingRunner.run(conn, pingTarget, 5);

        await this.prisma.remoteSpeedJob.update({
          where: { id: jobId },
          data: {
            phase: "BANDWIDTH_TEST",
            progress: 60,
            message: "Running MikroTik bandwidth-test",
          } as any,
        });

        const btestUser =
          (job.device as any).bandwidthTestUser ??
          process.env.MIKROTIK_BTEST_USER ??
          "admin";

        const btestPassword =
          (job.device as any).bandwidthTestPassword ??
          process.env.MIKROTIK_BTEST_PASSWORD;

        if (!btestPassword) {
          throw new Error("Bandwidth-test password is not configured");
        }

        const speed = await this.mikrotikSpeedRunner.runBandwidthTest(conn, {
          targetHost: job.targetHost ?? (job.device as any).bandwidthTarget ?? "10.20.20.2",
          durationSec: job.durationSec ?? 20,
          protocol: (job.protocol as "tcp" | "udp") ?? "tcp",
          direction: (job.direction as "both" | "transmit" | "receive") ?? "both",
          user: btestUser,
          password: btestPassword,
        });

        downloadMbps = speed.downloadMbps;
        uploadMbps = speed.uploadMbps;
        rawResult = speed.raw;
      }

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          phase: "SAVING",
          progress: 85,
          message: "Saving measurement",
          rawResult,
        } as any,
      });

      const measurement = await this.prisma.measurement.create({
        data: {
          deviceId: job.deviceId,
          downloadMbps,
          uploadMbps,
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