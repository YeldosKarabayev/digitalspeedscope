import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MikrotikModule } from "../mikrotik/mikrotik.module";
import { RemoteSpeedService } from "./remote-speed.service";
import { RemoteSpeedController } from "./remote-speed.controller";
import { RemoteSpeedWorker } from "./remote-speed.worker";
import { RemotePingRunner } from "./remote-ping.runner";
import { RemoteTrafficRunner } from "./remote-traffic.runner";

@Module({
  imports: [PrismaModule, MikrotikModule],
  controllers: [RemoteSpeedController],
  providers: [
    RemoteSpeedService,
    RemoteSpeedWorker,
    RemotePingRunner,
    RemoteTrafficRunner,
  ],
  exports: [RemoteSpeedService],
})
export class RemoteSpeedModule {}