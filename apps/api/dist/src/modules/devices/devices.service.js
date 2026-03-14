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
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
let DevicesService = class DevicesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
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
    async getDetails(id) {
        const device = await this.prisma.device.findUnique({
            where: { id },
            include: { point: { include: { city: true } } },
        });
        if (!device)
            throw new common_1.NotFoundException("Device not found");
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
    async getMeasurements(deviceId, opts) {
        const exists = await this.prisma.device.findUnique({ where: { id: deviceId }, select: { id: true } });
        if (!exists)
            throw new common_1.NotFoundException("Device not found");
        const take = Math.max(1, Math.min(opts.take ?? 20, 100));
        const where = { deviceId };
        if (opts.source)
            where.source = opts.source;
        const items = await this.prisma.measurement.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take,
        });
        return { ok: true, items };
    }
    async create(dto) {
        if (!dto.uid?.trim())
            throw new common_1.BadRequestException("uid is required");
        const pointConnect = dto.pointId ? { connect: { id: dto.pointId } } : undefined;
        try {
            const device = await this.prisma.device.create({
                data: {
                    uid: dto.uid.trim(),
                    name: dto.name ?? null,
                    isp: dto.isp ?? null,
                    isActive: dto.isActive ?? true,
                    kind: dto.kind ?? "GENERIC",
                    mikrotikHost: dto.mikrotikHost ?? null,
                    mikrotikPort: dto.mikrotikPort ?? null,
                    mikrotikAuthMethod: dto.mikrotikAuthMethod ?? null,
                    mikrotikUsername: dto.mikrotikUsername ?? null,
                    mikrotikSecretRef: dto.mikrotikSecretRef ?? null,
                    point: pointConnect,
                },
            });
            return { ok: true, device };
        }
        catch (e) {
            throw new common_1.BadRequestException(e?.message ?? "Failed to create device");
        }
    }
    async update(id, dto) {
        const device = await this.prisma.device.findUnique({ where: { id }, select: { id: true } });
        if (!device)
            throw new common_1.NotFoundException("Device not found");
        let pointOp = undefined;
        if ("pointId" in dto) {
            if (dto.pointId === null)
                pointOp = { disconnect: true };
            else if (typeof dto.pointId === "string")
                pointOp = { connect: { id: dto.pointId } };
        }
        try {
            const updated = await this.prisma.device.update({
                where: { id },
                data: {
                    uid: dto.uid?.trim(),
                    name: dto.name,
                    isp: dto.isp,
                    isActive: dto.isActive,
                    kind: dto.kind,
                    mikrotikHost: dto.mikrotikHost,
                    mikrotikPort: dto.mikrotikPort,
                    mikrotikAuthMethod: dto.mikrotikAuthMethod,
                    mikrotikUsername: dto.mikrotikUsername,
                    mikrotikSecretRef: dto.mikrotikSecretRef,
                    ...(pointOp ? { point: pointOp } : {}),
                },
            });
            return { ok: true, device: updated };
        }
        catch (e) {
            throw new common_1.BadRequestException(e?.message ?? "Failed to update device");
        }
    }
    async remove(id) {
        const device = await this.prisma.device.findUnique({
            where: { id },
            select: { id: true, _count: { select: { measurements: true, incidents: true } } },
        });
        if (!device)
            throw new common_1.NotFoundException("Device not found");
        if (device._count.measurements > 0 || device._count.incidents > 0) {
            throw new common_1.BadRequestException("Device has measurements/incidents. Deactivate instead of delete.");
        }
        await this.prisma.device.delete({ where: { id } });
        return { ok: true };
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_module_1.PrismaService])
], DevicesService);
//# sourceMappingURL=devices.service.js.map