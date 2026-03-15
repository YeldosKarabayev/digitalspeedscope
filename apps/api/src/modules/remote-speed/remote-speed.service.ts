import { PrismaService } from "../../prisma/prisma.module";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";


@Injectable()
export class RemoteSpeedService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(deviceId: string, body: { target?: string; interfaceName?: string; count?: number; }) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) throw new NotFoundException("Device not found");
    if (!device.mikrotikHost) {
      throw new BadRequestException("Device has no mikrotikHost");
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
      },
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