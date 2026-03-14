import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DeviceHealth, IncidentStatus } from "@prisma/client";

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [total, online, degraded, offline, openIncidents] =
      await Promise.all([
        this.prisma.device.count(),
        this.prisma.device.count({ where: { health: DeviceHealth.ONLINE } }),
        this.prisma.device.count({ where: { health: DeviceHealth.DEGRADED } }),
        this.prisma.device.count({ where: { health: DeviceHealth.OFFLINE } }),
        this.prisma.incident.count({
          where: { status: IncidentStatus.OPEN },
        }),
      ]);

    return {
      totalDevices: total,
      online,
      degraded,
      offline,
      incidentsOpen: openIncidents,
    };
  }
}