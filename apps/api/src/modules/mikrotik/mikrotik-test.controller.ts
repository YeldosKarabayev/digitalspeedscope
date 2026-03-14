import { Controller, Get } from "@nestjs/common";
import { MikrotikApiService } from "./mikrotik-api.service";

@Controller("test")
export class MikrotikTestController {
  constructor(private readonly mikrotik: MikrotikApiService) {}

  @Get("mikrotik")
  async test() {
    const res = await this.mikrotik.exec(
      {
        host: "192.168.88.1",
        port: 8728,
        username: "dss-api",
        password: "StrongPassword123",
      },
      ["/system/resource/print"],
      10_000
    );

    // обычно полезные данные тут:
    return { ok: true, raw: res, data: (res as any)?.data ?? null };
  }
}