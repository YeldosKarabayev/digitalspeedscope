"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const OFFLINE_MINUTES = 30;
function evaluate(last) {
    if (last.packetLoss != null && last.packetLoss > 1) {
        return {
            health: client_1.DeviceHealth.DEGRADED,
            reason: { type: client_1.IncidentType.PACKET_LOSS, severity: "P2", title: "Packet loss выше нормы", details: { packetLoss: last.packetLoss } },
        };
    }
    if (last.pingMs > 80) {
        return {
            health: client_1.DeviceHealth.DEGRADED,
            reason: { type: client_1.IncidentType.HIGH_PING, severity: "P2", title: "Высокий ping", details: { pingMs: last.pingMs } },
        };
    }
    if (last.downloadMbps < 50) {
        return {
            health: client_1.DeviceHealth.DEGRADED,
            reason: { type: client_1.IncidentType.LOW_DOWNLOAD, severity: "P3", title: "Низкая скорость загрузки", details: { downloadMbps: last.downloadMbps } },
        };
    }
    if (last.uploadMbps < 20) {
        return {
            health: client_1.DeviceHealth.DEGRADED,
            reason: { type: client_1.IncidentType.LOW_UPLOAD, severity: "P4", title: "Низкая скорость отдачи", details: { uploadMbps: last.uploadMbps } },
        };
    }
    return { health: client_1.DeviceHealth.ONLINE };
}
let HealthEngineService = class HealthEngineService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recalc() {
        const now = new Date();
        const offlineSince = new Date(now.getTime() - OFFLINE_MINUTES * 60_000);
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
            if (m.createdAt < offlineSince) {
                offline++;
                const dedupKey = `OFFLINE:${m.deviceId}`;
                await this.prisma.device.update({
                    where: { id: m.deviceId },
                    data: { health: client_1.DeviceHealth.OFFLINE, lastSeenAt: m.createdAt },
                });
                if (m.pointId) {
                    await this.prisma.point.update({
                        where: { id: m.pointId },
                        data: { health: client_1.DeviceHealth.OFFLINE, lastSeenAt: m.createdAt },
                    });
                }
                const exists = await this.prisma.incident.findUnique({ where: { dedupKey } });
                if (!exists) {
                    await this.prisma.incident.create({
                        data: {
                            dedupKey,
                            type: client_1.IncidentType.OFFLINE,
                            severity: "P1",
                            status: client_1.IncidentStatus.OPEN,
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
            const evalRes = evaluate({
                downloadMbps: m.downloadMbps,
                uploadMbps: m.uploadMbps,
                pingMs: m.pingMs,
                packetLoss: m.packetLoss ?? null,
            });
            if (evalRes.health === client_1.DeviceHealth.ONLINE)
                online++;
            else
                degraded++;
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
            if (evalRes.health === client_1.DeviceHealth.ONLINE) {
                const r = await this.prisma.incident.updateMany({
                    where: { deviceId: m.deviceId, status: client_1.IncidentStatus.OPEN },
                    data: { status: client_1.IncidentStatus.RESOLVED, closedAt: now },
                });
                resolved += r.count;
                continue;
            }
            if (evalRes.reason) {
                const dedupKey = `${evalRes.reason.type}:${m.deviceId}`;
                const exists = await this.prisma.incident.findUnique({ where: { dedupKey } });
                if (!exists) {
                    await this.prisma.incident.create({
                        data: {
                            dedupKey,
                            type: evalRes.reason.type,
                            severity: evalRes.reason.severity,
                            status: client_1.IncidentStatus.OPEN,
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
};
exports.HealthEngineService = HealthEngineService;
exports.HealthEngineService = HealthEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HealthEngineService);
//# sourceMappingURL=health-engine.service.js.map