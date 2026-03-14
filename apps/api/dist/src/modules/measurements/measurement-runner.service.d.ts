export declare class MeasurementRunnerService {
    run(): Promise<{
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
    }>;
}
