import { Controller, Get } from "@nestjs/common";
import { MikrotikApiService } from "./modules/mikrotik/mikrotik-api.service";

@Controller("test")
export class TestController {
    constructor(private readonly mikrotik: MikrotikApiService) { }

    @Get("mikrotik")
    async testMikrotik() {
        const result = await this.mikrotik.exec(
            {
                host: "192.168.88.1",
                port: 8728,
                username: "dss-api",
                password: "StrongPassword123",
                timeoutMs: 10_000,
            },
            ["/system/resource/print"]
        );

        return result;
    }
}