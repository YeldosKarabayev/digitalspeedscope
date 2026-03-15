import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { RangeKey } from "../common/dto/range.dto";

type Metric = "download" | "upload" | "ping";

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) { }

  private rangeToSince(range: RangeKey): Date {
    const now = Date.now();
    if (range === "1h") return new Date(now - 1 * 60 * 60 * 1000);
    if (range === "24h") return new Date(now - 24 * 60 * 60 * 1000);
    if (range === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
    return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }

  async points(args: { range: RangeKey; metric: Metric; city: string }) {
    const { range, city } = args;
    const since = this.rangeToSince(range);

    /**
     * 1) Последнее измерение на каждое устройство (ОЧЕНЬ БЫСТРО)
     */
    const latestMeasurements = await this.prisma.$queryRaw<
      Array<{
        device_id: string;
        downloadMbps: number;
        uploadMbps: number;
        pingMs: number;
        createdAt: Date;
      }>
    >`
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

    const latestByDevice = new Map(
      latestMeasurements.map((m) => [m.device_id, m])
    );

    /**
     * 2) Точки + устройство + город
     */
    const points = await this.prisma.point.findMany({
      where: city === "Все города" ? {} : { city: { name: city } },
      include: {
        city: true,
        device: true,
      },
    });

    /**
     * 3) Merge
     */
    const result = points.map((p) => {
      const m = p.deviceId ? latestByDevice.get(p.deviceId) : null;

      let status: "ok" | "warn" | "bad" = "ok";
      const health = p.device?.health ?? p.health;

      if (health === "OFFLINE") status = "bad";
      else if (health === "DEGRADED") status = "warn";

      return {
        id: p.id,
        name: p.name,
        city: p.city.name,
        lat: Number(p.lat),
        lng: Number(p.lng),

        status,
        deviceId: p.device?.id ?? null,

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
}
