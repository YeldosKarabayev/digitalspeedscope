import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import ExcelJS from "exceljs";

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async getAccessReport(query: any) {
        const { whereAccess, whereSms, page, limit } = this.buildFilters(query);

        const accesses = await this.prisma.portalAccess.findMany({
            where: whereAccess,
            include: {
                identity: true,
                point: true,
            },
            orderBy: {
                grantedAt: "desc",
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        const total = await this.prisma.portalAccess.count({ where: whereAccess });

        const uniquePhonesRows = await this.prisma.portalAccess.findMany({
            where: whereAccess,
            select: { identityId: true },
            distinct: ["identityId"],
        });

        const activePointsRows = await this.prisma.portalAccess.findMany({
            where: whereAccess,
            select: { pointId: true },
            distinct: ["pointId"],
        });

        const smsCount = await this.prisma.portalAuditLog.count({
            where: whereSms,
        });

        return {
            items: accesses.map((row) => ({
                id: row.id,
                phone: row.identity.phone,
                pointName: row.point?.name ?? "—",
                clientIp: row.clientIp,
                clientMac: row.clientMac,
                grantedAt: row.grantedAt?.toISOString() ?? null,
                expiresAt: row.expiresAt?.toISOString() ?? null,
                status:
                    row.expiresAt && row.expiresAt > new Date()
                        ? "ACTIVE"
                        : row.expiresAt
                            ? "EXPIRED"
                            : "UNKNOWN",
            })),
            total,
            uniquePhones: uniquePhonesRows.length,
            activePoints: activePointsRows.length,
            smsCount,
            page,
            limit,
        };
    }

    async exportAccessCsv(query: any) {
        const items = await this.getAllAccessRows(query);

        const header = [
            "Телефон",
            "Точка",
            "IP",
            "MAC",
            "Подключение",
            "Доступ до",
            "Статус",
        ];

        const rows = items.map((row) => [
            this.escapeCsv(row.phone),
            this.escapeCsv(row.pointName),
            this.escapeCsv(row.clientIp ?? ""),
            this.escapeCsv(row.clientMac ?? ""),
            this.escapeCsv(this.formatDate(row.grantedAt)),
            this.escapeCsv(this.formatDate(row.expiresAt)),
            this.escapeCsv(row.status),
        ]);

        return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    async exportAccessXlsx(query: any) {
        const items = await this.getAllAccessRows(query);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Авторизации");

        sheet.columns = [
            { header: "Телефон", key: "phone", width: 18 },
            { header: "Точка", key: "pointName", width: 28 },
            { header: "IP", key: "clientIp", width: 18 },
            { header: "MAC", key: "clientMac", width: 22 },
            { header: "Подключение", key: "grantedAt", width: 22 },
            { header: "Доступ до", key: "expiresAt", width: 22 },
            { header: "Статус", key: "status", width: 14 },
        ];

        for (const row of items) {
            sheet.addRow({
                ...row,
                grantedAt: this.formatDate(row.grantedAt),
                expiresAt: this.formatDate(row.expiresAt),
            });
        }

        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: "frozen", ySplit: 1 }];

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    async getSmsLog(query: any) {
        const { from, to, pointId, phone, page, limit } = this.buildFilters(query);

        const where: any = {
            event: "OTP_REQUEST",
        };

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z");
        }

        if (pointId) where.pointId = pointId;
        if (phone) where.phone = { contains: phone };

        const logs = await this.prisma.portalAuditLog.findMany({
            where,
            include: {
                point: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        const total = await this.prisma.portalAuditLog.count({ where });

        return {
            items: logs.map((row) => ({
                id: row.id,
                phone: row.phone,
                pointName: row.point?.name ?? "—",
                clientIp: row.clientIp,
                clientMac: row.clientMac,
                status: row.status,
                message: row.message,
                createdAt: row.createdAt.toISOString(),
            })),
            total,
            page,
            limit,
        };
    }

    async exportSmsCsv(query: any) {
        const items = await this.getAllSmsRows(query);

        const header = [
            "Телефон",
            "Точка",
            "IP",
            "MAC",
            "Статус",
            "Сообщение",
            "Дата",
        ];

        const rows = items.map((row) => [
            this.escapeCsv(row.phone ?? ""),
            this.escapeCsv(row.pointName),
            this.escapeCsv(row.clientIp ?? ""),
            this.escapeCsv(row.clientMac ?? ""),
            this.escapeCsv(row.status),
            this.escapeCsv(row.message ?? ""),
            this.escapeCsv(this.formatDate(row.createdAt)),
        ]);

        return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    async exportSmsXlsx(query: any) {
        const items = await this.getAllSmsRows(query);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("SMS журнал");

        sheet.columns = [
            { header: "Телефон", key: "phone", width: 18 },
            { header: "Точка", key: "pointName", width: 28 },
            { header: "IP", key: "clientIp", width: 18 },
            { header: "MAC", key: "clientMac", width: 22 },
            { header: "Статус", key: "status", width: 14 },
            { header: "Сообщение", key: "message", width: 42 },
            { header: "Дата", key: "createdAt", width: 22 },
        ];

        for (const row of items) {
            sheet.addRow({
                ...row,
                createdAt: this.formatDate(row.createdAt),
            });
        }

        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: "frozen", ySplit: 1 }];

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    private buildFilters(query: any) {
        const from = query?.from;
        const to = query?.to;
        const pointId = query?.pointId;
        const phone = query?.phone;
        const page = Math.max(Number(query?.page ?? 1), 1);
        const limit = Math.min(Math.max(Number(query?.limit ?? 20), 1), 100);

        const whereAccess: any = {};
        if (from || to) {
            whereAccess.grantedAt = {};
            if (from) whereAccess.grantedAt.gte = new Date(from);
            if (to) whereAccess.grantedAt.lte = new Date(to + "T23:59:59.999Z");
        }

        if (pointId) whereAccess.pointId = pointId;

        if (phone) {
            whereAccess.identity = {
                phone: {
                    contains: phone,
                },
            };
        }

        const whereSms: any = {
            event: "OTP_REQUEST",
        };

        if (from || to) {
            whereSms.createdAt = {};
            if (from) whereSms.createdAt.gte = new Date(from);
            if (to) whereSms.createdAt.lte = new Date(to + "T23:59:59.999Z");
        }

        if (pointId) whereSms.pointId = pointId;
        if (phone) whereSms.phone = { contains: phone };

        return { from, to, pointId, phone, page, limit, whereAccess, whereSms };
    }

    private async getAllAccessRows(query: any) {
        const { whereAccess } = this.buildFilters(query);

        const accesses = await this.prisma.portalAccess.findMany({
            where: whereAccess,
            include: {
                identity: true,
                point: true,
            },
            orderBy: {
                grantedAt: "desc",
            },
        });

        return accesses.map((row) => ({
            id: row.id,
            phone: row.identity.phone,
            pointName: row.point?.name ?? "-",
            clientIp: row.clientIp,
            clientMac: row.clientMac,
            grantedAt: row.grantedAt?.toISOString() ?? null,
            expiresAt: row.expiresAt?.toISOString() ?? null,
            status:
                row.expiresAt && row.expiresAt > new Date()
                    ? "ACTIVE"
                    : row.expiresAt
                        ? "EXPIRED"
                        : "UNKNOWN",
        }));
    }

    private async getAllSmsRows(query: any) {
        const { from, to, pointId, phone } = this.buildFilters(query);

        const where: any = {
            event: "OTP_REQUEST",
        };

        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z");
        }

        if (pointId) where.pointId = pointId;
        if (phone) where.phone = { contains: phone };

        const logs = await this.prisma.portalAuditLog.findMany({
            where,
            include: {
                point: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return logs.map((row) => ({
            id: row.id,
            phone: row.phone,
            pointName: row.point?.name ?? "—",
            clientIp: row.clientIp,
            clientMac: row.clientMac,
            status: row.status,
            message: row.message,
            createdAt: row.createdAt.toISOString(),
        }));
    }

    private escapeCsv(value: string) {
        const safe = String(value ?? "");
        return `"${safe.replace(/"/g, '""')}"`;
    }

    private formatDate(value: string | null) {
        if (!value) return "";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;

        return new Intl.DateTimeFormat("ru-RU", {
            dateStyle: "short",
            timeStyle: "short",
        }).format(d);
    }
}