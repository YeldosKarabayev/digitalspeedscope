import { PrismaService } from "../../prisma/prisma.service";
export declare class MonitoringService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    summary(): Promise<{
        totalDevices: number;
        online: number;
        degraded: number;
        offline: number;
        incidentsOpen: number;
    }>;
}
