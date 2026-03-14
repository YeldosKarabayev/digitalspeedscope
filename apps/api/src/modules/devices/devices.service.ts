import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.module"; // у тебя есть src/modules/prisma
import { DeviceCreateDto } from "./dto/device-create.dto";
import { DeviceUpdateDto } from "./dto/evice-update.dto";

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.device.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        uid: true,
        name: true,
        isp: true,
        isActive: true,
        kind: true,
        health: true,
        lastSeenAt: true,
        lastIp: true,
        point: { select: { id: true, name: true, city: { select: { id: true, name: true } } } },
      },
    });
    return { ok: true, items };
  }

  async getDetails(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { point: { include: { city: true } } },
    });
    if (!device) throw new NotFoundException("Device not found");

    const [lastMeasurements, lastIncidents] = await Promise.all([
      this.prisma.measurement.findMany({
        where: { deviceId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      this.prisma.incident.findMany({
        where: { deviceId: id },
        orderBy: { openedAt: "desc" },
        take: 10,
      }),
    ]);

    return { ok: true, device, lastMeasurements, lastIncidents };
  }

  async getMeasurements(deviceId: string, opts: { take: number; source?: "SERVER_CLI" | "MIKROTIK_REMOTE" }) {
    const exists = await this.prisma.device.findUnique({ where: { id: deviceId }, select: { id: true } });
    if (!exists) throw new NotFoundException("Device not found");

    const take = Math.max(1, Math.min(opts.take ?? 20, 100));
    const where: any = { deviceId };
    if (opts.source) where.source = opts.source;

    const items = await this.prisma.measurement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });

    return { ok: true, items };
  }

  async create(dto: DeviceCreateDto) {
    if (!dto.uid?.trim()) throw new BadRequestException("uid is required");

    // привязка point (если передан)
    const pointConnect = dto.pointId ? { connect: { id: dto.pointId } } : undefined;

    try {
      const device = await this.prisma.device.create({
        data: {
          uid: dto.uid.trim(),
          name: dto.name ?? null,
          isp: dto.isp ?? null,
          isActive: dto.isActive ?? true,
          kind: (dto.kind as any) ?? "GENERIC",

          mikrotikHost: dto.mikrotikHost ?? null,
          mikrotikPort: dto.mikrotikPort ?? null,
          mikrotikAuthMethod: (dto.mikrotikAuthMethod as any) ?? null,
          mikrotikUsername: dto.mikrotikUsername ?? null,
          mikrotikSecretRef: dto.mikrotikSecretRef ?? null,

          point: pointConnect,
        },
      });
      return { ok: true, device };
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? "Failed to create device");
    }
  }

  async update(id: string, dto: DeviceUpdateDto) {
    const device = await this.prisma.device.findUnique({ where: { id }, select: { id: true } });
    if (!device) throw new NotFoundException("Device not found");

    // pointId:
    // - undefined => не трогаем
    // - null => отвязать
    // - string => привязать
    let pointOp: any = undefined;
    if ("pointId" in dto) {
      if (dto.pointId === null) pointOp = { disconnect: true };
      else if (typeof dto.pointId === "string") pointOp = { connect: { id: dto.pointId } };
    }

    try {
      const updated = await this.prisma.device.update({
        where: { id },
        data: {
          uid: dto.uid?.trim(),
          name: dto.name,
          isp: dto.isp,
          isActive: dto.isActive,
          kind: dto.kind as any,

          mikrotikHost: dto.mikrotikHost,
          mikrotikPort: dto.mikrotikPort,
          mikrotikAuthMethod: dto.mikrotikAuthMethod as any,
          mikrotikUsername: dto.mikrotikUsername,
          mikrotikSecretRef: dto.mikrotikSecretRef,

          ...(pointOp ? { point: pointOp } : {}),
        },
      });
      return { ok: true, device: updated };
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? "Failed to update device");
    }
  }

  async remove(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      select: { id: true, _count: { select: { measurements: true, incidents: true } } },
    });
    if (!device) throw new NotFoundException("Device not found");

    // безопасно: не удаляем если есть история
    if (device._count.measurements > 0 || device._count.incidents > 0) {
      throw new BadRequestException("Device has measurements/incidents. Deactivate instead of delete.");
    }

    await this.prisma.device.delete({ where: { id } });
    return { ok: true };
  }
}