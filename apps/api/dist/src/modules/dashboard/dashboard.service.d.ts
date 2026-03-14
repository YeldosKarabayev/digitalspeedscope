import { PrismaService } from "../../prisma/prisma.service";
import type { RangeKey } from "../common/dto/range.dto";
type TrendPoint = {
    ts: string;
    label: string;
    download: number;
    upload: number;
    ping: number;
};
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    overview(range: RangeKey): Promise<{
        range: "1h" | "24h" | "7d" | "30d";
        totalDevices: number;
        activeDevices24h: number;
        avgDownloadMbps: number;
        avgUploadMbps: number;
        avgPingMs: number;
        incidents: number;
    }>;
    trends(range: RangeKey): Promise<{
        range: RangeKey;
        points: TrendPoint[];
    }>;
}
export {};
