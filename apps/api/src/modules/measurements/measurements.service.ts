import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { RangeKey } from "../common/dto/range.dto";
import type { MeasurementsQueryDto } from "./dto/measurements.query.dto";
import { MeasurementRunnerService } from "./measurement-runner.service";

function rangeToSince(range: RangeKey): Date {
  const now = Date.now();
  if (range === "1h") return new Date(now - 1 * 60 * 60 * 1000);
  if (range === "24h") return new Date(now - 24 * 60 * 60 * 1000);
  if (range === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  return new Date(now - 30 * 24 * 60 * 60 * 1000);
}


@Injectable()
export class MeasurementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: MeasurementRunnerService
  ) { }


  async recent(range: RangeKey) {
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
        realDownload: m.realDownloadMbps,
        upload: m.uploadMbps,
        ping: m.pingMs,
        deviceUid: m.device.uid,
        isp: m.device.isp ?? null,
        pointName: m.point?.name ?? null,
        city: m.point?.city?.name ?? null,
      })),
    };
  }

  async list(q: MeasurementsQueryDto) {
    const range = q.range ?? "24h";
    const since = rangeToSince(range);

    const limit = q.limit ?? 30;
    const offset = q.offset ?? 0;

    const search = (q.q ?? "").trim();

    const where: any = {
      createdAt: { gte: since },
    };

    if (q.status) where.status = q.status;
    if (q.deviceUid) where.device = { uid: q.deviceUid };

    if (q.city && q.city !== "Все города") {
      // фильтр по городу через point.city
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

    // простая классификация для MVP
    const status =
      res.pingMs <= 30 && res.downloadMbps >= 150
        ? "EXCELLENT"
        : res.pingMs <= 45 && res.downloadMbps >= 90
          ? "GOOD"
          : res.pingMs <= 70 && res.downloadMbps >= 40
            ? "FAIR"
            : "POOR";

    // создаём/используем "локальное устройство"
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


}
