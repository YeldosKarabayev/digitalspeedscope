import { PrismaService } from "../../prisma/prisma.module";
export declare class RemoteSpeedWorker {
    private prisma;
    constructor(prisma: PrismaService);
    process(jobId: string): Promise<void>;
}
