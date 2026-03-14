import { PortalService } from "./portal.service";
import { RequestCodeDto } from "./dto/request-code.dto";
import { VerifyCodeDto } from "./dto/verify-code.dto";
export declare class PortalController {
    private readonly service;
    constructor(service: PortalService);
    request(dto: RequestCodeDto, req: any): Promise<{
        ok: boolean;
        expiresInSec: number;
    }>;
    verify(dto: VerifyCodeDto, req: any): Promise<{
        ok: boolean;
    }>;
    me(deviceKey: string): Promise<{
        ok: boolean;
        phone?: undefined;
        verifiedAt?: undefined;
    } | {
        ok: boolean;
        phone: string;
        verifiedAt: Date;
    }>;
}
