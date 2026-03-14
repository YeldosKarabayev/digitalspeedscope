import { DashboardService } from "./dashboard.service";
import { RangeQueryDto } from "../common/dto/range.dto";
export declare class DashboardController {
    private readonly service;
    constructor(service: DashboardService);
    overview(q: RangeQueryDto): Promise<{
        range: "1h" | "24h" | "7d" | "30d";
        totalDevices: number;
        activeDevices24h: number;
        avgDownloadMbps: number;
        avgUploadMbps: number;
        avgPingMs: number;
        incidents: number;
    }>;
    trends(q: RangeQueryDto): Promise<{
        range: import("../common/dto/range.dto").RangeKey;
        points: {
            ts: string;
            label: string;
            download: number;
            upload: number;
            ping: number;
        }[];
    }>;
}
