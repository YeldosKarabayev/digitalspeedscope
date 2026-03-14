import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { DeviceHealth, IncidentSeverity, IncidentStatus, IncidentType } from "@prisma/client";

const OFFLINE_MINUTES = 30;

type EvalResult = {
  health: DeviceHealth;
  reason?: { type: IncidentType; severity: IncidentSeverity; title: string; details?: any };
};

function evaluate(last: { downloadMbps: number; uploadMbps: number; pingMs: number; packetLoss: number | null }) : EvalResult {
  // Пороги MVP (потом вынесем в настройки)
  if (last.packetLoss != null && last.packetLoss > 1) {
    return {
      health: DeviceHealth.DEGRADED,
      reason: { type: IncidentType.PACKET_LOSS, severity: "P2", title: "Packet loss выше нормы", details: { packetLoss: last.packetLoss } },
    };
  }
  if (last.pingMs > 80) {
    return {
      health: DeviceHealth.DEGRADED,
      reason: { type: IncidentType.HIGH_PING, severity: "P2", title: "Высокий ping", details: { pingMs: last.pingMs } },
    };
  }
  if (last.downloadMbps < 50) {
    return {
      health: DeviceHealth.DEGRADED,
      reason: { type: IncidentType.LOW_DOWNLOAD, severity: "P3", title: "Низкая скорость загрузки", details: { downloadMbps: last.downloadMbps } },
    };
  }
  if (last.uploadMbps < 20) {
    return {
      health: DeviceHealth.DEGRADED,
      reason: { type: IncidentType.LOW_UPLOAD, severity: "P4", title: "Низкая скорость отдачи", details: { uploadMbps: last.uploadMbps } },
    };
  }
  return { health: DeviceHealth.ONLINE };
}

@Injectable()
export class HealthEngineService {
  constructor(private prisma: PrismaService) {}

  async recalc() {
    const now = new Date();
    const offlineSince = new Date(now.getTime() - OFFLINE_MINUTES * 60_000);

    // Берем последние измерения по каждому устройству
    // В PostgreSQL удобно через distinct + orderBy
    const lastByDevice = await this.prisma.measurement.findMany({
      distinct: ["deviceId"],
      orderBy: [{ deviceId: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        deviceId: true,
        pointId: true,
        createdAt: true,
        downloadMbps: true,
        uploadMbps: true,
        pingMs: true,
        packetLoss: true,
      },
    });

    let online = 0, degraded = 0, offline = 0;
    let opened = 0, resolved = 0;

    for (const m of lastByDevice) {
      // OFFLINE
      if (m.createdAt < offlineSince) {
        offline++;
        const dedupKey = `OFFLINE:${m.deviceId}`;

        await this.prisma.device.update({
          where: { id: m.deviceId },
          data: { health: DeviceHealth.OFFLINE, lastSeenAt: m.createdAt },
        });

        if (m.pointId) {
          await this.prisma.point.update({
            where: { id: m.pointId },
            data: { health: DeviceHealth.OFFLINE, lastSeenAt: m.createdAt },
          });
        }

        // открыть инцидент если нет открытого
        const exists = await this.prisma.incident.findUnique({ where: { dedupKey } });
        if (!exists) {
          await this.prisma.incident.create({
            data: {
              dedupKey,
              type: IncidentType.OFFLINE,
              severity: "P1",
              status: IncidentStatus.OPEN,
              title: "Точка оффлайн (нет измерений 30 минут)",
              details: { lastSeenAt: m.createdAt.toISOString(), offlineMinutes: OFFLINE_MINUTES },
              deviceId: m.deviceId,
              pointId: m.pointId ?? null,
              openedAt: now,
            },
          });
          opened++;
        }
        continue;
      }

      // ONLINE/DEGRADED
      const evalRes = evaluate({
        downloadMbps: m.downloadMbps,
        uploadMbps: m.uploadMbps,
        pingMs: m.pingMs,
        packetLoss: m.packetLoss ?? null,
      });

      if (evalRes.health === DeviceHealth.ONLINE) online++; else degraded++;

      await this.prisma.device.update({
        where: { id: m.deviceId },
        data: { health: evalRes.health, lastSeenAt: m.createdAt },
      });

      if (m.pointId) {
        await this.prisma.point.update({
          where: { id: m.pointId },
          data: { health: evalRes.health, lastSeenAt: m.createdAt },
        });
      }

      // Инциденты: если ONLINE — закрываем все OPEN по этому device (кроме OFFLINE тоже можно)
      if (evalRes.health === DeviceHealth.ONLINE) {
        const r = await this.prisma.incident.updateMany({
          where: { deviceId: m.deviceId, status: IncidentStatus.OPEN },
          data: { status: IncidentStatus.RESOLVED, closedAt: now },
        });
        resolved += r.count;
        continue;
      }

      // DEGRADED: создаём дедуп по типу+device
      if (evalRes.reason) {
        const dedupKey = `${evalRes.reason.type}:${m.deviceId}`;
        const exists = await this.prisma.incident.findUnique({ where: { dedupKey } });
        if (!exists) {
          await this.prisma.incident.create({
            data: {
              dedupKey,
              type: evalRes.reason.type,
              severity: evalRes.reason.severity,
              status: IncidentStatus.OPEN,
              title: evalRes.reason.title,
              details: evalRes.reason.details ?? {},
              deviceId: m.deviceId,
              pointId: m.pointId ?? null,
              openedAt: now,
            },
          });
          opened++;
        }
      }
    }

    return { ok: true, offlineMinutes: OFFLINE_MINUTES, devices: lastByDevice.length, online, degraded, offline, incidentsOpened: opened, incidentsResolved: resolved };
  }
}