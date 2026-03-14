import { PrismaService } from "../../prisma/prisma.service";
import type { RangeKey } from "../common/dto/range.dto";
import type { MeasurementsQueryDto } from "./dto/measurements.query.dto";
import { MeasurementRunnerService } from "./measurement-runner.service";
export declare class MeasurementsService {
    private readonly prisma;
    private readonly runner;
    constructor(prisma: PrismaService, runner: MeasurementRunnerService);
    recent(range: RangeKey): Promise<{
        range: "1h" | "24h" | "7d" | "30d";
        rows: {
            id: string;
            ts: string;
            status: import("@prisma/client").$Enums.MeasurementStatus;
            download: number;
            upload: number;
            ping: number;
            deviceUid: string;
            isp: string | null;
            pointName: string | null;
            city: string | null;
        }[];
    }>;
    list(q: MeasurementsQueryDto): Promise<{
        range: "1h" | "24h" | "7d" | "30d";
        total: number;
        limit: number;
        offset: number;
        rows: {
            id: string;
            ts: string;
            status: import("@prisma/client").$Enums.MeasurementStatus;
            download: number;
            upload: number;
            ping: number;
            deviceUid: string;
            isp: string | null;
            pointName: string | null;
            city: string | null;
        }[];
    }>;
    runManualTest(): Promise<{
        createdAt: string;
        downloadMbps: number;
        uploadMbps: number;
        pingMs: number;
        jitterMs?: number;
        packetLoss?: number;
        isp?: string;
        ip?: string;
        serverId?: string;
        serverName?: string;
        serverLocation?: string;
        serverCountry?: string;
        resultUrl?: string;
        ok: boolean;
        measurementId: string;
        status: string;
    }>;
}
