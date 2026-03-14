import { RemoteSpeedService } from "./remote-speed.service";
export declare class RemoteSpeedController {
    private readonly service;
    constructor(service: RemoteSpeedService);
    run(deviceId: string): Promise<{
        ok: boolean;
        jobId: string;
        status: import("@prisma/client").$Enums.RemoteSpeedJobStatus;
    }>;
    status(id: string): Promise<{
        ok: boolean;
        jobId: string;
        status: import("@prisma/client").$Enums.RemoteSpeedJobStatus;
        progress: number | null;
        phase: string | null;
        message: string | null;
        measurementId: string | null;
        error: string | null;
    }>;
}
