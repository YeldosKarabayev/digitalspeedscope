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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
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
function trendCfg(range) {
    if (range === "1h")
        return { count: 12, stepMin: 5 };
    if (range === "24h")
        return { count: 24, stepMin: 60 };
    if (range === "7d")
        return { count: 14, stepMin: 12 * 60 };
    return { count: 30, stepMin: 24 * 60 };
}
function pad2(n) {
    return n.toString().padStart(2, "0");
}
function labelFor(range, d) {
    if (range === "1h")
        return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    if (range === "24h")
        return `${pad2(d.getHours())}:00`;
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async overview(range) {
        const since = rangeToSince(range);
        const [totalDevices, activeDevices24h, agg, incidents] = await Promise.all([
            this.prisma.device.count(),
            this.prisma.device.count({
                where: { measurements: { some: { createdAt: { gte: since } } } },
            }),
            this.prisma.measurement.aggregate({
                where: { createdAt: { gte: since } },
                _avg: { downloadMbps: true, uploadMbps: true, pingMs: true },
            }),
            this.prisma.measurement.count({
                where: { createdAt: { gte: since }, status: "POOR" },
            }),
        ]);
        return {
            range,
            totalDevices,
            activeDevices24h,
            avgDownloadMbps: Math.round(agg._avg.downloadMbps ?? 0),
            avgUploadMbps: Math.round(agg._avg.uploadMbps ?? 0),
            avgPingMs: Math.round(agg._avg.pingMs ?? 0),
            incidents,
        };
    }
    async trends(range) {
        const since = rangeToSince(range);
        const cfg = trendCfg(range);
        const rows = await this.prisma.measurement.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true, downloadMbps: true, uploadMbps: true, pingMs: true },
            orderBy: { createdAt: "asc" },
        });
        const now = new Date();
        const stepMs = cfg.stepMin * 60_000;
        const buckets = Array.from({ length: cfg.count }, (_, idx) => {
            const i = cfg.count - 1 - idx;
            const start = new Date(now.getTime() - i * stepMs);
            const rounded = new Date(start);
            if (range === "24h") {
                rounded.setMinutes(0, 0, 0);
            }
            else if (range === "7d" || range === "30d") {
                rounded.setHours(0, 0, 0, 0);
            }
            return {
                ts: rounded,
                startMs: rounded.getTime(),
                endMs: rounded.getTime() + stepMs,
                sumDl: 0,
                sumUl: 0,
                sumPg: 0,
                n: 0,
            };
        });
        let b = 0;
        for (const r of rows) {
            const t = r.createdAt.getTime();
            while (b < buckets.length && t >= buckets[b].endMs)
                b++;
            const cur = buckets[b];
            if (!cur)
                continue;
            if (t >= cur.startMs && t < cur.endMs) {
                cur.sumDl += r.downloadMbps;
                cur.sumUl += r.uploadMbps;
                cur.sumPg += r.pingMs;
                cur.n += 1;
            }
        }
        let lastDl = 0, lastUl = 0, lastPg = 0;
        const points = buckets.map((x) => {
            let dl, ul, pg;
            if (x.n > 0) {
                dl = Math.round(x.sumDl / x.n);
                ul = Math.round(x.sumUl / x.n);
                pg = Math.round(x.sumPg / x.n);
                lastDl = dl;
                lastUl = ul;
                lastPg = pg;
            }
            else {
                dl = lastDl;
                ul = lastUl;
                pg = lastPg;
            }
            return {
                ts: x.ts.toISOString(),
                label: labelFor(range, x.ts),
                download: dl,
                upload: ul,
                ping: pg,
            };
        });
        return { range, points };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map