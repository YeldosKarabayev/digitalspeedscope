import { PrismaService } from "../../prisma/prisma.module";
import { RemoteSpeedWorker } from "./remote-speed.worker";
export declare class RemoteSpeedService {
    private prisma;
    private worker;
    constructor(prisma: PrismaService, worker: RemoteSpeedWorker);
    createJob(deviceId: string): Promise<{
        ok: boolean;
        jobId: string;
        status: import("@prisma/client").$Enums.RemoteSpeedJobStatus;
    }>;
    getJob(id: string): Promise<{
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
