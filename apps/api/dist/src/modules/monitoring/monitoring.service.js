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
exports.MonitoringService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let MonitoringService = class MonitoringService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async summary() {
        const [total, online, degraded, offline, openIncidents] = await Promise.all([
            this.prisma.device.count(),
            this.prisma.device.count({ where: { health: client_1.DeviceHealth.ONLINE } }),
            this.prisma.device.count({ where: { health: client_1.DeviceHealth.DEGRADED } }),
            this.prisma.device.count({ where: { health: client_1.DeviceHealth.OFFLINE } }),
            this.prisma.incident.count({
                where: { status: client_1.IncidentStatus.OPEN },
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
};
exports.MonitoringService = MonitoringService;
exports.MonitoringService = MonitoringService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MonitoringService);
//# sourceMappingURL=monitoring.service.js.map