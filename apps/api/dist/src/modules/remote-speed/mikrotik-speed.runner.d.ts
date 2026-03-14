import { MikrotikApiService } from "../mikrotik/mikrotik-api.service";
export type RemoteSpeedRunParams = {
    targetHost: string;
    durationSec?: number;
    protocol?: "tcp" | "udp";
    direction?: "both" | "tx" | "rx";
    user?: string;
    password?: string;
};
export type RemoteSpeedResult = {
    downloadMbps: number;
    uploadMbps: number;
    pingMs: number;
    jitterMs?: number;
    packetLoss?: number;
    raw: any;
};
export declare class MikrotikSpeedRunner {
    private readonly api;
    constructor(api: MikrotikApiService);
    runBandwidthTest(conn: {
        host: string;
        port?: number;
        username: string;
        password: string;
    }, p: RemoteSpeedRunParams): Promise<RemoteSpeedResult>;
}
