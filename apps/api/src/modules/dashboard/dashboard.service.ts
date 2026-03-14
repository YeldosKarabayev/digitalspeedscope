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
  // 7d/30d — по дате
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** KPI карточки */
  async overview(range: RangeKey) {
    const since = rangeToSince(range);

    const [totalDevices, activeDevices24h, agg, incidents] = await Promise.all([
      this.prisma.device.count(),
      // "active" = есть хотя бы одно измерение в периоде
      this.prisma.device.count({
        where: { measurements: { some: { createdAt: { gte: since } } } },
      }),
      this.prisma.measurement.aggregate({
        where: { createdAt: { gte: since } },
        _avg: { downloadMbps: true, uploadMbps: true, pingMs: true },
      }),
      // incidents: для MVP считаем POOR (строго аварии)
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

  /** График: bucket’ы по времени (средние значения) */
  async trends(range: RangeKey): Promise<{ range: RangeKey; points: TrendPoint[] }> {
    const since = rangeToSince(range);
    const cfg = trendCfg(range);

    // Собираем измерения за период (MVP: вытягиваем нужные поля)
    // Для seed’а это ок. Для прод — можно оптимизировать raw SQL’ом под bucket.
    const rows = await this.prisma.measurement.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, downloadMbps: true, uploadMbps: true, pingMs: true },
      orderBy: { createdAt: "asc" },
    });

    const now = new Date();
    const stepMs = cfg.stepMin * 60_000;

    // Готовим buckets справа-налево (как в твоём мок-генераторе)
    const buckets = Array.from({ length: cfg.count }, (_, idx) => {
      const i = cfg.count - 1 - idx; // i: cfg.count-1 ... 0
      const start = new Date(now.getTime() - i * stepMs);
      // округлим "старт" для красоты лейблов (особенно для 24h/7d/30d)
      const rounded = new Date(start);

      if (range === "24h") {
        rounded.setMinutes(0, 0, 0);
      } else if (range === "7d" || range === "30d") {
        rounded.setHours(0, 0, 0, 0);
      } // для 1h оставляем минуты

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

    // Раскидываем измерения по buckets
    let b = 0;
    for (const r of rows) {
      const t = r.createdAt.getTime();

      // двигаем указатель bucket, пока endMs <= t
      while (b < buckets.length && t >= buckets[b].endMs) b++;

      // проверяем попадание в текущий bucket
      const cur = buckets[b];
      if (!cur) continue;
      if (t >= cur.startMs && t < cur.endMs) {
        cur.sumDl += r.downloadMbps;
        cur.sumUl += r.uploadMbps;
        cur.sumPg += r.pingMs;
        cur.n += 1;
      }
    }

    // Если bucket пустой — можно:
    // A) ставить 0
    // B) тянуть предыдущее значение (лучше визуально)
    // Для MVP: carry-forward (если есть предыдущие)
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
