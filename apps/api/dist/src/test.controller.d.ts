import { MikrotikApiService } from "./modules/mikrotik/mikrotik-api.service";
export declare class TestController {
    private readonly mikrotik;
    constructor(mikrotik: MikrotikApiService);
    testMikrotik(): Promise<any[]>;
}
