import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.module";
import { RemotePingRunner } from "./remote-ping.runner";
import {
  BandwidthTestError,
  MikrotikSpeedRunner,
} from "./mikrotik-speed.runner";
import { DSS_LIMITS, DSS_PROFILES } from "./remote-speed.constants";
import { MikrotikService } from "../mikrotik/mikrotik.service";
import { RemoteHealthRunner } from "./remote-health.runner";

type JobWithDevice = Awaited<
  ReturnType<PrismaService["remoteSpeedJob"]["findUnique"]>
> & {
  device?: any;
};

function calcStatus(pingMs: number | null, packetLoss: number | null) {
  if (pingMs == null || pingMs <= 0) return "POOR";
  if ((packetLoss ?? 0) >= 5 || pingMs >= 150) return "POOR";
  if ((packetLoss ?? 0) >= 2 || pingMs >= 80) return "FAIR";
  if (pingMs >= 35) return "GOOD";
  return "EXCELLENT";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function resolveRequestedProfile(job: any): keyof typeof DSS_PROFILES {
  const requested =
    job?.rawResult?.requestedProfile ??
    job?.rawResult?.resolvedProfile ??
    "std100";

  if (requested === "auto") return "std100";
  if (requested in DSS_PROFILES) {
    return requested as keyof typeof DSS_PROFILES;
  }

  return "std100";
}

@Injectable()
export class RemoteSpeedWorker {
  private readonly logger = new Logger(RemoteSpeedWorker.name);
  private tickInProgress = false;
  private readonly localRunning = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly healthRunner: RemoteHealthRunner,
    private readonly mikrotikSpeedRunner: MikrotikSpeedRunner,
    private readonly mikrotik: MikrotikService,
  ) { }

  @Interval(5000)
  async tick() {
    if (this.tickInProgress) return;
    this.tickInProgress = true;

    try {
      const maxConcurrency = DSS_LIMITS.MAX_CONCURRENCY ?? 1;

      const dbRunning = await this.prisma.remoteSpeedJob.count({
        where: { status: "RUNNING" as any },
      });

      const freeSlots = Math.max(0, maxConcurrency - dbRunning);
      if (freeSlots <= 0) return;

      for (let i = 0; i < freeSlots; i++) {
        const queued = await this.prisma.remoteSpeedJob.findFirst({
          where: { status: "QUEUED" as any },
          orderBy: { createdAt: "asc" },
        });

        if (!queued) break;

        const claimed = await this.prisma.remoteSpeedJob.updateMany({
          where: {
            id: queued.id,
            status: "QUEUED" as any,
          },
          data: {
            status: "RUNNING" as any,
            phase: "PREPARING",
            progress: 5,
            message: "Job claimed by worker",
            errorMessage: null,
          } as any,
        });

        if (claimed.count === 0) continue;

        this.localRunning.add(queued.id);

        void this.process(queued.id).finally(() => {
          this.localRunning.delete(queued.id);
        });
      }
    } catch (e: any) {
      this.logger.error(`tick failed: ${e?.message ?? e}`, e?.stack);
    } finally {
      this.tickInProgress = false;
    }
  }

  private async setPhase(
    jobId: string,
    phase: string,
    progress: number,
    message: string,
  ) {
    await this.prisma.remoteSpeedJob.update({
      where: { id: jobId },
      data: {
        phase,
        progress,
        message,
      } as any,
    });
  }

  private async mergeRawResult(jobId: string, patch: Record<string, unknown>) {
    const current = await this.prisma.remoteSpeedJob.findUnique({
      where: { id: jobId },
      select: { rawResult: true },
    });

    const base =
      current?.rawResult && typeof current.rawResult === "object"
        ? (current.rawResult as Record<string, unknown>)
        : {};

    await this.prisma.remoteSpeedJob.update({
      where: { id: jobId },
      data: {
        rawResult: {
          ...base,
          ...patch,
        } as any,
      } as any,
    });
  }

  private getChrConn() {
    const host = process.env.CHR_HOST;
    const username =
      process.env.CHR_USERNAME ?? process.env.MIKROTIK_USERNAME ?? "admin";
    const password = process.env.CHR_PASSWORD ?? process.env.MIKROTIK_PASSWORD;
    const port = Number(process.env.CHR_API_PORT ?? 8728);

    if (!host) throw new Error("CHR_HOST is not configured");
    if (!password) {
      throw new Error("CHR_PASSWORD or MIKROTIK_PASSWORD is not configured");
    }

    return { host, username, password, port };
  }

  private resolveQueueTarget(job: JobWithDevice): string {
    const device: any = job?.device;

    const target =
      device?.lastIp ??
      device?.tunnelIp ??
      device?.wgIp ??
      device?.vxlanIp ??
      device?.mikrotikHost ??
      null;

    if (!target) {
      throw new Error("Queue target IP is missing");
    }

    return target;
  }

  private async attachQueue(job: JobWithDevice, maxMbps: number) {
    const chr = this.getChrConn();
    const queueTarget = this.resolveQueueTarget(job);

    await this.mikrotik.addSimpleQueue({
      host: chr.host,
      port: chr.port,
      username: chr.username,
      password: chr.password,
      timeoutMs: 15_000,
      name: `dss-${job!.id}`,
      target: queueTarget,
      maxLimitMbps: maxMbps,
    });
  }

  private async detachQueue(jobId: string) {
    const chr = this.getChrConn();

    await this.mikrotik.removeSimpleQueueByName({
      host: chr.host,
      port: chr.port,
      username: chr.username,
      password: chr.password,
      timeoutMs: 15_000,
      name: `dss-${jobId}`,
    });
  }

  private async runBandwidthWithRetry(
    sshConn: {
      host: string;
      port: number;
      username: string;
      password: string;
      timeoutMs: number;
    },
    options: {
      targetHost: string;
      durationSec: number;
      protocol: "tcp" | "udp";
      direction: "both" | "transmit" | "receive";
      user?: string;
      password?: string;
    },
  ) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await withTimeout(
          this.mikrotikSpeedRunner.runBandwidthTest(sshConn, options),
          Math.max(35_000, options.durationSec * 2500),
          `Bandwidth-test timeout on attempt ${attempt}`,
        );
      } catch (e) {
        lastError = e;
        if (attempt < 2) {
          await sleep(1500);
        }
      }
    }

    throw lastError;
  }

  private async runOneDirection(
    job: JobWithDevice,
    sshConn: {
      host: string;
      port: number;
      username: string;
      password: string;
      timeoutMs: number;
    },
    params: {
      label: "upload" | "download";
      direction: "transmit" | "receive";
      progress: number;
      message: string;
      targetHost: string;
      durationSec: number;
      protocol: "tcp" | "udp";
      user?: string;
      password?: string;
    },
  ) {
    await this.setPhase(job!.id, "RUNNING", params.progress, params.message);

    const speed = await this.runBandwidthWithRetry(sshConn, {
      targetHost: params.targetHost,
      durationSec: params.durationSec,
      protocol: params.protocol,
      direction: params.direction,
      ...(params.user ? { user: params.user } : {}),
      ...(params.password ? { password: params.password } : {}),
    });

    await this.mergeRawResult(job!.id, {
      [`${params.label}Test`]: {
        direction: params.direction,
        durationSec: params.durationSec,
        protocol: params.protocol,
        raw: speed.raw ?? null,
        localCpuLoad: speed.localCpuLoad ?? null,
        remoteCpuLoad: speed.remoteCpuLoad ?? null,
        connectionCount: speed.connectionCount ?? null,
      },
    });

    return speed;
  }

  async process(jobId: string) {
    const job = await this.prisma.remoteSpeedJob.findUnique({
      where: { id: jobId },
      include: { device: true },
    });

    if (!job?.device) return;

    const profileKey = resolveRequestedProfile(job);
    const profile = DSS_PROFILES[profileKey];
    let queueAttached = false;

    try {
      const device: any = job.device;

      if (!device.mikrotikHost) {
        throw new Error("Device has no mikrotikHost");
      }

      const apiPassword = device.mikrotikSecretRef ?? process.env.MIKROTIK_PASSWORD;
      const sshPassword = device.mikrotikSecretRef ?? process.env.MIKROTIK_PASSWORD;

      if (!apiPassword || !sshPassword) {
        throw new Error("MikroTik credentials are not configured");
      }

      const apiConn = {
        host: device.mikrotikHost,
        port: device.mikrotikPort ?? 8728,
        username: device.mikrotikUsername ?? "admin",
        password: apiPassword,
        timeoutMs: 15_000,
      };

      const sshConn = {
        host: device.mikrotikHost,
        port: 22,
        username: device.mikrotikUsername ?? "admin",
        password: sshPassword,
        timeoutMs: 30_000,
      };

      const targetHost =
        job.targetHost ??
        device.bandwidthTarget ??
        process.env.CHR_BTEST_TARGET ??
        "10.10.0.3";

      const durationSec = Math.min(job.durationSec ?? profile.durationSec, 15);
      const protocol = (job.protocol as "tcp" | "udp") ?? profile.protocol;

      await this.setPhase(jobId, "HEALTH_CHECK", 15, "Running device health-check");

      const health = await this.healthRunner.run(apiConn, {
        interfaceName:
          device.tunnelInterfaceName ??
          device.interfaceName ??
          undefined,
        timeoutMs: 8000,
        includeRaw: false,
      });

      if (!health.ok) {
        throw new Error(`Health-check failed: ${health.reason ?? "unknown"}`);
      }

      if (health.cpuLoad != null && health.cpuLoad >= 85) {
        throw new Error(`Device CPU too high: ${health.cpuLoad}%`);
      }

      await this.mergeRawResult(jobId, {
        requestedProfile: profileKey,
        resolvedProfile: profileKey,
        targetMbps: profile.targetMbps,
        healthBefore: health,
      });

      await this.setPhase(
        jobId,
        "QUEUE_ATTACH",
        30,
        `Attaching CHR queue (${Math.round(profile.targetMbps * 0.8)} Mbps)`,
      );

      await this.attachQueue(job, Math.max(10, Math.round(profile.targetMbps * 0.8)));
      queueAttached = true;

      await this.setPhase(jobId, "HEALTH_CHECK", 35, "Checking tunnel stability");

      const healthUnderLoad = await this.healthRunner.run(apiConn, {
        interfaceName:
          device.tunnelInterfaceName ??
          device.interfaceName ??
          undefined,
        timeoutMs: 8000,
        includeRaw: false,
      });

      await this.mergeRawResult(jobId, {
        healthUnderLoad,
      });

      if (!healthUnderLoad.ok) {
        throw new Error(
          `Health-check under load failed: ${healthUnderLoad.reason ?? "unknown"}`,
        );
      }

      if (healthUnderLoad.cpuLoad != null && healthUnderLoad.cpuLoad >= 90) {
        throw new Error(`Device CPU too high under load: ${healthUnderLoad.cpuLoad}%`);
      }

      // Даём очереди и туннелю стабилизироваться
      await sleep(2000);

      const useBtestAuth = process.env.MIKROTIK_BTEST_AUTH === "true";
      const btestUser =
        device.bandwidthTestUser ??
        process.env.MIKROTIK_BTEST_USER ??
        "admin";
      const btestPassword =
        device.bandwidthTestPassword ?? process.env.MIKROTIK_BTEST_PASSWORD;

      const authPart = useBtestAuth
        ? {
          user: btestUser,
          password: btestPassword,
        }
        : {};

      // 1. Upload: transmit
      const uploadTest = await this.runOneDirection(job, sshConn, {
        label: "upload",
        direction: "transmit",
        progress: 50,
        message: `Running upload test (${profileKey})`,
        targetHost,
        durationSec,
        protocol,
        ...authPart,
      });

      // Небольшая пауза между направлениями
      await this.setPhase(jobId, "RUNNING", 60, "Stabilizing before download test");
      await sleep(2000);

      // 2. Download: receive
      const downloadTest = await this.runOneDirection(job, sshConn, {
        label: "download",
        direction: "receive",
        progress: 75,
        message: `Running download test (${profileKey})`,
        targetHost,
        durationSec,
        protocol,
        ...authPart,
      });

      await this.setPhase(jobId, "QUEUE_DETACH", 85, "Detaching CHR queue");

      await this.detachQueue(jobId);
      queueAttached = false;

      await this.setPhase(jobId, "COLLECTING", 90, "Saving measurement");

      const uploadMbps = Math.round(
        uploadTest.uploadMbps ??
        uploadTest.downloadMbps ??
        0,
      );

      const downloadMbps = Math.round(
        downloadTest.downloadMbps ??
        downloadTest.uploadMbps ??
        0,
      );

      const measurement = await this.prisma.measurement.create({
        data: {
          deviceId: job.deviceId,
          downloadMbps,
          uploadMbps,
          pingMs: health.latencyMs ?? 0,
          jitterMs: null,
          packetLoss: 0,
          status: calcStatus(health.latencyMs ?? 0, 0) as any,
        } as any,
      });

      await this.setPhase(jobId, "COOLING", 95, "Cooling down");
      await sleep((DSS_LIMITS.COOLDOWN_SEC ?? 8) * 1000);

      const current = await this.prisma.remoteSpeedJob.findUnique({
        where: { id: jobId },
        select: { rawResult: true },
      });

      const rawResult =
        current?.rawResult && typeof current.rawResult === "object"
          ? (current.rawResult as Record<string, unknown>)
          : {};

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          status: "SUCCEEDED" as any,
          progress: 100,
          phase: "DONE",
          message: "Remote speed job completed",
          measurementId: measurement.id,
          errorMessage: null,
          rawResult: {
            ...rawResult,
            final: {
              uploadMbps,
              downloadMbps,
              ping: {
                pingMs: health.latencyMs,
                jitterMs: null,
                packetLoss: 0,
              },
              profileKey,
            }
          } as any,
        } as any,
      });
    } catch (e: any) {
      this.logger.error(
        `RemoteSpeed job failed: jobId=${jobId} deviceId=${job.deviceId} host=${job.device.mikrotikHost} message=${e?.message ?? e}`,
        e?.stack,
      );

      if (queueAttached) {
        try {
          await this.detachQueue(jobId);
        } catch (detachErr: any) {
          this.logger.warn(
            `Failed to detach queue for jobId=${jobId}: ${detachErr?.message ?? detachErr}`,
          );
        }
      }

      await this.prisma.remoteSpeedJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED" as any,
          phase: "FAILED",
          message: "Remote speed job failed",
          errorMessage: e?.message ?? "Unknown error",
          rawResult:
            e instanceof BandwidthTestError
              ? { raw: e.raw ?? null }
              : {
                requestedProfile: profileKey,
                error: e?.message ?? "Unknown error",
              },
        } as any,
      });
    }
  }
}