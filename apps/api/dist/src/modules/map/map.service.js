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
exports.MapService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let MapService = class MapService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    rangeToSince(range) {
        const now = Date.now();
        if (range === "1h")
            return new Date(now - 1 * 60 * 60 * 1000);
        if (range === "24h")
            return new Date(now - 24 * 60 * 60 * 1000);
        if (range === "7d")
            return new Date(now - 7 * 24 * 60 * 60 * 1000);
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
    }
    async points(args) {
        const { range, city } = args;
        const since = this.rangeToSince(range);
        const latestMeasurements = await this.prisma.$queryRaw `
      SELECT DISTINCT ON (m."deviceId")
        m."deviceId"     AS device_id,
        m."downloadMbps",
        m."uploadMbps",
        m."pingMs",
        m."createdAt"
      FROM "Measurement" m
      WHERE m."createdAt" >= ${since}
      ORDER BY m."deviceId", m."createdAt" DESC
    `;
        const latestByDevice = new Map(latestMeasurements.map((m) => [m.device_id, m]));
        const points = await this.prisma.point.findMany({
            where: city === "Все города" ? {} : { city: { name: city } },
            include: {
                city: true,
                device: true,
            },
        });
        const result = points.map((p) => {
            const m = p.deviceId ? latestByDevice.get(p.deviceId) : null;
            return {
                id: p.id,
                name: p.name,
                city: p.city.name,
                lat: Number(p.lat),
                lng: Number(p.lng),
                download: m?.downloadMbps ?? 0,
                upload: m?.uploadMbps ?? 0,
                ping: m?.pingMs ?? 0,
                isp: p.device?.isp ?? undefined,
                deviceUid: p.device?.uid ?? undefined,
                lastSeen: m ? m.createdAt.toISOString() : p.updatedAt.toISOString(),
            };
        });
        return {
            range,
            city,
            points: result,
        };
    }
};
exports.MapService = MapService;
exports.MapService = MapService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MapService);
//# sourceMappingURL=map.service.js.map