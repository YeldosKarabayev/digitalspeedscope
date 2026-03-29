import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { RangeKey } from "../common/dto/range.dto";

type TrendPoint = {
  ts: string; // ISO bucket time
  label: string; // подпись для X
  download: number;
  upload: number;
  ping: number;
};

function rangeToSince(range: RangeKey): Date {
  const now = Date.now();
  if (range === "1h") return new Date(now - 1 * 60 * 60 * 1000);
  if (range === "24h") return new Date(now - 24 * 60 * 60 * 1000);
  if (range === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  return new Date(now - 30 * 24 * 60 * 60 * 1000);
}

/** Для графика: сколько точек и какой шаг */
function trendCfg(range: RangeKey) {
  if (range === "1h") return { count: 12, stepMin: 5 };
  if (range === "24h") return { count: 24, stepMin: 60 };
  if (range === "7d") return { count: 14, stepMin: 12 * 60 };
  return { count: 30, stepMin: 24 * 60 };
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function labelFor(range: RangeKey, d: Date) {
  if (range === "1h") return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (range === "24h") return `${pad2(d.getHours())}:00`;
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** KPI карточки */
  async overview(range: RangeKey) {
    const since = rangeToSince(range);

    const [totalDevices, activeDevices24h, aggReal, aggFallback, incidents] =
      await Promise.all([
        this.prisma.device.count(),
        this.prisma.device.count({
          where: { measurements: { some: { createdAt: { gte: since } } } },
        }),
        this.prisma.measurement.aggregate({
          where: {
            createdAt: { gte: since },
            realDownloadMbps: { not: null },
          },
          _avg: {
            realDownloadMbps: true,
            uploadMbps: true,
            pingMs: true,
          },
        }),
        this.prisma.measurement.aggregate({
          where: { createdAt: { gte: since } },
          _avg: {
            downloadMbps: true,
            uploadMbps: true,
            pingMs: true,
          },
        }),
        this.prisma.measurement.count({
          where: { createdAt: { gte: since }, status: "POOR" },
        }),
      ]);

    const avgDownloadMbps = Math.round(
      aggReal._avg.realDownloadMbps ??
        aggFallback._avg.downloadMbps ??
        0,
    );

    const avgUploadMbps = Math.round(
      aggReal._avg.uploadMbps ??
        aggFallback._avg.uploadMbps ??
        0,
    );

    const avgPingMs = Math.round(
      aggReal._avg.pingMs ??
        aggFallback._avg.pingMs ??
        0,
    );

    return {
      range,
      totalDevices,
      activeDevices24h,
      avgDownloadMbps,
      avgUploadMbps,
      avgPingMs,
      incidents,
    };
  }

  /** График: bucket’ы по времени (средние значения) */
  async trends(range: RangeKey): Promise<{ range: RangeKey; points: TrendPoint[] }> {
    const since = rangeToSince(range);
    const cfg = trendCfg(range);

    const rows = await this.prisma.measurement.findMany({
      where: { createdAt: { gte: since } },
      select: {
        createdAt: true,
        downloadMbps: true,
        realDownloadMbps: true,
        uploadMbps: true,
        pingMs: true,
      },
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
      } else if (range === "7d" || range === "30d") {
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

      while (b < buckets.length && t >= buckets[b].endMs) b++;

      const cur = buckets[b];
      if (!cur) continue;
      if (t >= cur.startMs && t < cur.endMs) {
        cur.sumDl += r.realDownloadMbps ?? r.downloadMbps;
        cur.sumUl += r.uploadMbps;
        cur.sumPg += r.pingMs;
        cur.n += 1;
      }
    }

    let lastDl = 0,
      lastUl = 0,
      lastPg = 0;

    const points: TrendPoint[] = buckets.map((x) => {
      let dl: number, ul: number, pg: number;

      if (x.n > 0) {
        dl = Math.round(x.sumDl / x.n);
        ul = Math.round(x.sumUl / x.n);
        pg = Math.round(x.sumPg / x.n);
        lastDl = dl;
        lastUl = ul;
        lastPg = pg;
      } else {
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
}