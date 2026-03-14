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
exports.MeasurementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const measurement_runner_service_1 = require("./measurement-runner.service");
function rangeToSince(range) {
    const now = Date.now();
    if (range === "1h")
        return new Date(now - 1 * 60 * 60 * 1000);
    if (range === "24h")
        return new Date(now - 24 * 60 * 60 * 1000);
    if (range === "7d")
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
}
let MeasurementsService = class MeasurementsService {
    prisma;
    runner;
    constructor(prisma, runner) {
        this.prisma = prisma;
        this.runner = runner;
    }
    async recent(range) {
        const since = rangeToSince(range);
        const rows = await this.prisma.measurement.findMany({
            where: { createdAt: { gte: since } },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
                device: true,
                point: { include: { city: true } },
            },
        });
        return {
            range,
            rows: rows.map((m) => ({
                id: m.id,
                ts: m.createdAt.toISOString(),
                status: m.status,
                download: m.downloadMbps,
                upload: m.uploadMbps,
                ping: m.pingMs,
                deviceUid: m.device.uid,
                isp: m.device.isp ?? null,
                pointName: m.point?.name ?? null,
                city: m.point?.city?.name ?? null,
            })),
        };
    }
    async list(q) {
        const range = q.range ?? "24h";
        const since = rangeToSince(range);
        const limit = q.limit ?? 30;
        const offset = q.offset ?? 0;
        const search = (q.q ?? "").trim();
        const where = {
            createdAt: { gte: since },
        };
        if (q.status)
            where.status = q.status;
        if (q.deviceUid)
            where.device = { uid: q.deviceUid };
        if (q.city && q.city !== "Все города") {
            where.point = { city: { name: q.city } };
        }
        if (search) {
            where.OR = [
                { device: { uid: { contains: search, mode: "insensitive" } } },
                { device: { isp: { contains: search, mode: "insensitive" } } },
                { point: { name: { contains: search, mode: "insensitive" } } },
                { point: { city: { name: { contains: search, mode: "insensitive" } } } },
            ];
        }
        const [total, items] = await Promise.all([
            this.prisma.measurement.count({ where }),
            this.prisma.measurement.findMany({
                where,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: offset,
                include: {
                    device: true,
                    point: { include: { city: true } },
                },
            }),
        ]);
        return {
            range,
            total,
            limit,
            offset,
            rows: items.map((m) => ({
                id: m.id,
                ts: m.createdAt.toISOString(),
                status: m.status,
                download: m.downloadMbps,
                upload: m.uploadMbps,
                ping: m.pingMs,
                deviceUid: m.device.uid,
                isp: m.device.isp ?? null,
                pointName: m.point?.name ?? null,
                city: m.point?.city?.name ?? null,
            })),
        };
    }
    async runManualTest() {
        const res = await this.runner.run();
        const status = res.pingMs <= 30 && res.downloadMbps >= 150
            ? "EXCELLENT"
            : res.pingMs <= 45 && res.downloadMbps >= 90
                ? "GOOD"
                : res.pingMs <= 70 && res.downloadMbps >= 40
                    ? "FAIR"
                    : "POOR";
        const device = await this.prisma.device.upsert({
            where: { uid: "LOCAL-NODE" },
            update: { isp: res.isp ?? undefined, isActive: true },
            create: { uid: "LOCAL-NODE", isp: res.isp ?? undefined, isActive: true },
        });
        const m = await this.prisma.measurement.create({
            data: {
                deviceId: device.id,
                downloadMbps: res.downloadMbps,
                uploadMbps: res.uploadMbps,
                pingMs: res.pingMs,
                status,
            },
        });
        return {
            ok: true,
            measurementId: m.id,
            status,
            ...res,
            createdAt: m.createdAt.toISOString(),
        };
    }
};
exports.MeasurementsService = MeasurementsService;
exports.MeasurementsService = MeasurementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        measurement_runner_service_1.MeasurementRunnerService])
], MeasurementsService);
//# sourceMappingURL=measurements.service.js.map