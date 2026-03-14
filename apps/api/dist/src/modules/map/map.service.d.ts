import { PrismaService } from "../../prisma/prisma.service";
import type { RangeKey } from "../common/dto/range.dto";
type Metric = "download" | "upload" | "ping";
export declare class MapService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private rangeToSince;
    points(args: {
        range: RangeKey;
        metric: Metric;
        city: string;
    }): Promise<{
        range: "1h" | "24h" | "7d" | "30d";
        city: string;
        points: {
            id: string;
            name: string;
            city: string;
            lat: number;
            lng: number;
            download: number;
            upload: number;
            ping: number;
            isp: string | undefined;
            deviceUid: string | undefined;
            lastSeen: string;
        }[];
    }>;
}
export {};
