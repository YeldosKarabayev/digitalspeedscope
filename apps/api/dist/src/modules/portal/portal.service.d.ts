import { PrismaService } from "../../prisma/prisma.service";
import { RequestCodeDto } from "./dto/request-code.dto";
import { VerifyCodeDto } from "./dto/verify-code.dto";
export declare class PortalService {
    private prisma;
    constructor(prisma: PrismaService);
    me(deviceKey: string): Promise<{
        ok: boolean;
        phone?: undefined;
        verifiedAt?: undefined;
    } | {
        ok: boolean;
        phone: string;
        verifiedAt: Date;
    }>;
    requestCode(dto: RequestCodeDto, meta: {
        ip?: string;
        ua?: string;
    }): Promise<{
        ok: boolean;
        expiresInSec: number;
    }>;
    verifyCode(dto: VerifyCodeDto, meta?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        ok: boolean;
    }>;
}
