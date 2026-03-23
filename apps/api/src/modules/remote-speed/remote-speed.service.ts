import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.module";
import { DSS_PROFILES } from "./remote-speed.constants";

export type CreateRemoteSpeedJobInput = {
  profile?: "auto" | "lite50" | "std100" | "plus150";
  target?: string;
  interfaceName?: string;
  count?: number;
  durationSec?: number;
  protocol?: "tcp" | "udp";
  direction?: "both" | "transmit" | "receive";
};

@Injectable()
export class RemoteSpeedService {
  constructor(private readonly prisma: PrismaService) {}

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

    const requestedProfile = body.profile ?? "std100";
    const resolvedProfile =
      requestedProfile === "auto" ? "std100" : requestedProfile;

    const profile = DSS_PROFILES[resolvedProfile];
    if (!profile) {
      throw new BadRequestException("Unsupported profile");
    }

    const targetHost =
      body.target ??
      (device as any).bandwidthTarget ??
      process.env.CHR_BTEST_TARGET;

    if (!targetHost) {
      throw new BadRequestException(
        "target is required or CHR_BTEST_TARGET must be set",
      );
    }

    const existing = await this.prisma.remoteSpeedJob.findFirst({
      where: {
        deviceId,
        status: { in: ["QUEUED", "RUNNING"] as any },
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
    const direction = body.direction ?? "transmit";
    const durationSec = body.durationSec ?? profile.durationSec;

    const rawResult = {
      requestedProfile,
      resolvedProfile,
      targetMbps: profile.targetMbps,
      interfaceName: body.interfaceName ?? null,
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
        direction,
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

    const item = await this.prisma.remoteSpeedJob.findFirst({
      where: {
        deviceId,
        status: { in: ["QUEUED", "RUNNING"] as any },
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