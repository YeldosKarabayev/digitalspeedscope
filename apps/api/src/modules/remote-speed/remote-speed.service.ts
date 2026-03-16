import { PrismaService } from "../../prisma/prisma.module";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class RemoteSpeedService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(
    deviceId: string,
    body: {
      target?: string;
      interfaceName?: string;
      count?: number;
      durationSec?: number;
      protocol?: "tcp" | "udp";
      direction?: "both" | "transmit" | "receive";
    },
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) throw new NotFoundException("Device not found");
    if (!device.mikrotikHost) {
      throw new BadRequestException("Device has no mikrotikHost");
    }
    if (!body.target) {
      throw new BadRequestException("target is required");
    }

    const existing = await this.prisma.remoteSpeedJob.findFirst({
      where: {
        deviceId,
        status: { in: ["QUEUED", "RUNNING"] as any },
      },
    });

    if (existing) {
      return { ok: true, reused: true, job: existing };
    }

    const job = await this.prisma.remoteSpeedJob.create({
      data: {
        deviceId,
        status: "QUEUED" as any,
        targetHost: body.target,
        protocol: body.protocol ?? "tcp",
        direction: body.direction ?? "both",
        durationSec: body.durationSec ?? 20,
        phase: "QUEUED",
        progress: 0,
        message: "Job queued",
      } as any,
    });

    return { ok: true, job };
  }

  async listJobs(deviceId: string) {
    const items = await this.prisma.remoteSpeedJob.findMany({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { measurement: true },
    });

    return { ok: true, items };
  }
}