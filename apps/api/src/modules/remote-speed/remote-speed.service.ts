import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.module";
import { DSS_PROFILES } from "./remote-speed.constants";

export type CreateRemoteSpeedJobInput = {
  profile?: "auto" | "lite50" | "std100" | "plus150";
  protocol?: "tcp" | "udp";
  durationSec?: number;
};

@Injectable()
export class RemoteSpeedService {
  constructor(private readonly prisma: PrismaService) {}

  private getStaleBefore() {
    return new Date(Date.now() - 2 * 60 * 1000);
  }

  async createJob(deviceId: string, body: CreateRemoteSpeedJobInput) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    if (!device.mikrotikHost) {
      throw new BadRequestException("Device has no mikrotikHost");
    }

    if (!device.queueTargetIp && !device.lastIp && !device.mikrotikHost) {
      throw new BadRequestException("Device has no queueTargetIp");
    }

    const requestedProfile = body.profile ?? "std100";
    const resolvedProfile =
      requestedProfile === "auto" ? "std100" : requestedProfile;

    const profile = DSS_PROFILES[resolvedProfile];
    if (!profile) {
      throw new BadRequestException("Unsupported profile");
    }

    const targetHost =
      device.btestTargetHost ??
      process.env.CHR_BTEST_TARGET ??
      process.env.CHR_HOST;

    if (!targetHost) {
      throw new BadRequestException(
        "CHR target is not configured. Set device.btestTargetHost or CHR_BTEST_TARGET/CHR_HOST",
      );
    }

    await this.prisma.remoteSpeedJob.updateMany({
      where: {
        deviceId,
        status: { in: ["QUEUED", "RUNNING"] as any },
        updatedAt: { lt: this.getStaleBefore() },
      },
      data: {
        status: "FAILED" as any,
        phase: "FAILED",
        message: "Recovered stale job before creating new one",
        errorMessage: "Job became stale",
      } as any,
    });

    const existing = await this.prisma.remoteSpeedJob.findFirst({
      where: {
        deviceId,
        status: { in: ["QUEUED", "RUNNING"] as any },
        updatedAt: { gte: this.getStaleBefore() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return {
        ok: true,
        reused: true,
        reason: "device_has_active_job",
        job: existing,
      };
    }

    const protocol = body.protocol ?? profile.protocol;
    const durationSec = body.durationSec ?? profile.durationSec;

    const rawResult = {
      requestedProfile,
      resolvedProfile,
      targetMbps: profile.targetMbps,
      queueTargetIp: device.queueTargetIp ?? device.lastIp ?? device.mikrotikHost,
      btestTargetHost: targetHost,
      requestedAt: new Date().toISOString(),
    };

    const job = await this.prisma.remoteSpeedJob.create({
      data: {
        deviceId,
        status: "QUEUED" as any,
        progress: 0,
        phase: "QUEUED",
        message: `Job queued (${requestedProfile})`,
        targetHost,
        protocol,
        direction: "transmit",
        durationSec,
        rawResult: rawResult as any,
        errorMessage: null,
      } as any,
    });

    return { ok: true, job };
  }

  async listJobs(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true },
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    const items = await this.prisma.remoteSpeedJob.findMany({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { measurement: true },
    });

    return { ok: true, items };
  }

  async getActiveJob(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true },
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    await this.prisma.remoteSpeedJob.updateMany({
      where: {
        deviceId,
        status: { in: ["QUEUED", "RUNNING"] as any },
        updatedAt: { lt: this.getStaleBefore() },
      },
      data: {
        status: "FAILED" as any,
        phase: "FAILED",
        message: "Recovered stale active job",
        errorMessage: "Job became stale",
      } as any,
    });

    const item = await this.prisma.remoteSpeedJob.findFirst({
      where: {
        deviceId,
        status: { in: ["QUEUED", "RUNNING"] as any },
        updatedAt: { gte: this.getStaleBefore() },
      },
      orderBy: { createdAt: "desc" },
      include: { measurement: true },
    });

    return { ok: true, item };
  }

  async getJob(deviceId: string, jobId: string) {
    const item = await this.prisma.remoteSpeedJob.findFirst({
      where: {
        id: jobId,
        deviceId,
      },
      include: { measurement: true },
    });

    if (!item) {
      throw new NotFoundException("Remote speed job not found");
    }

    return { ok: true, item };
  }
}