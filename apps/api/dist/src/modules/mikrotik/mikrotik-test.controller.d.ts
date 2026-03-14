import { MikrotikApiService } from "./mikrotik-api.service";
export declare class MikrotikTestController {
    private readonly mikrotik;
    constructor(mikrotik: MikrotikApiService);
    test(): Promise<{
        ok: boolean;
        raw: any[];
        data: any;
    }>;
}
