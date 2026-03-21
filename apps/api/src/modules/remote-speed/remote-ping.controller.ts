import { Body, Controller, Param, Post } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.module";
import { RemotePingRunner } from "./remote-ping.runner";
import { NotFoundException } from "@nestjs/common";

@Controller("remote-speed")
export class RemotePingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pingRunner: RemotePingRunner,
  ) {}

  @Post(":deviceId/remote-ping")
  async run(
    @Param("deviceId") deviceId: string,
    @Body() body: { target?: string; count?: number },
  ) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) throw new NotFoundException("Device not found");

    const conn = {
      host: device.mikrotikHost!,
      port: device.mikrotikPort ?? 8728,
      username: (device as any).mikrotikUsername ?? "admin",
      password:
        (device as any).mikrotikPassword ??
        process.env.MIKROTIK_PASSWORD!,
      timeoutMs: 15000,
    };

    const result = await this.pingRunner.run(
      conn,
      body.target ?? "8.8.8.8",
      body.count ?? 5,
    );

    return {
      ok: true,
      result,
    };
  }
}