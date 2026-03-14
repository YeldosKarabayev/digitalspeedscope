import { PrismaService } from "../../prisma/prisma.service";
export declare class HealthEngineService {
    private prisma;
    constructor(prisma: PrismaService);
    recalc(): Promise<{
        ok: boolean;
        offlineMinutes: number;
        devices: number;
        online: number;
        degraded: number;
        offline: number;
        incidentsOpened: number;
        incidentsResolved: number;
    }>;
}
