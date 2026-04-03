// api/src/modules/alerts/alerts.service.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ListAlertsQueryDto } from "./dto/list-alerts.query.dto";

@Injectable()
export class AlertsService {
    constructor(private readonly prisma: PrismaService) { }

    async list(query: ListAlertsQueryDto) {
        const where: any = {};

        if (query.severity) {
            where.severity = query.severity;
        }

        if (query.status === "read") {
            where.isRead = true;
        }

        if (query.status === "unread") {
            where.isRead = false;
        }

        if (query.pointId) {
            where.pointId = query.pointId;
        }

        if (query.search?.trim()) {
            const search = query.search.trim();

            where.OR = [
                { message: { contains: search, mode: "insensitive" } },
                { type: { contains: search, mode: "insensitive" } },
                { point: { name: { contains: search, mode: "insensitive" } } },
            ];
        }

        const [items, total, unread, errors, warnings] = await Promise.all([
            this.prisma.alert.findMany({
                where,
                orderBy: { createdAt: "desc" },
                include: {
                    point: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                take: 100,
            }),
            this.prisma.alert.count({ where }),
            this.prisma.alert.count({
                where: {
                    ...where,
                    isRead: false,
                },
            }),
            this.prisma.alert.count({
                where: {
                    ...where,
                    severity: "ERROR",
                },
            }),
            this.prisma.alert.count({
                where: {
                    ...where,
                    severity: "WARNING",
                },
            }),
        ]);

        return {
            items: items.map((a) => ({
                id: a.id,
                type: a.type,
                severity: a.severity,
                message: a.message,
                isRead: a.isRead,
                pointId: a.pointId ?? null,
                pointName: a.point?.name ?? null,
                createdAt: a.createdAt.toISOString(),
                readAt: a.readAt ? a.readAt.toISOString() : null,
            })),
            total,
            unread,
            errors,
            warnings,
        };
    }

    async markRead(id: string) {
        return this.prisma.alert.update({
            where: { id },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    async markAllRead() {
        await this.prisma.alert.updateMany({
            where: { isRead: false },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return { ok: true };
    }

    async getUnreadCount() {
        const count = await this.prisma.alert.count({
            where: {
                isRead: false,
            },
        });

        return { count };
    }

    async createAlert(input: {
        type: string;
        severity: "INFO" | "WARNING" | "ERROR";
        message: string;
        pointId?: string | null;
    }) {
        let safePointId: string | null = null;

        if (input.pointId) {
            const point = await this.prisma.point.findUnique({
                where: { id: input.pointId },
                select: { id: true },
            });

            safePointId = point?.id ?? null;
        }

        return this.prisma.alert.create({
            data: {
                type: input.type,
                severity: input.severity,
                message: input.message,
                pointId: safePointId,
                isRead: false,
            },
        });
    }
}