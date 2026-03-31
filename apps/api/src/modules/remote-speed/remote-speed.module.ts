import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { MikrotikModule } from "../mikrotik/mikrotik.module";
import { RemoteSpeedService } from "./remote-speed.service";
import { RemoteSpeedController } from "./remote-speed.controller";
import { RemoteSpeedWorker } from "./remote-speed.worker";
import { RemotePingRunner } from "./remote-ping.runner";
import { RemoteTrafficRunner } from "./remote-traffic.runner";
import { MikrotikSpeedRunner } from "./mikrotik-speed.runner";
import { MikrotikFetchRunner } from "./mikrotik-fetch.runner";
import { RemotePingController } from "./remote-ping.controller";
import { RemoteHealthRunner } from "./remote-health.runner";
import { AlertsModule } from "../alerts/alerts.module";

@Module({
  imports: [PrismaModule, MikrotikModule, AlertsModule],
  controllers: [RemoteSpeedController, RemotePingController],
  providers: [
    RemoteSpeedService,
    RemoteSpeedWorker,
    RemotePingRunner,
    RemoteTrafficRunner,
    MikrotikSpeedRunner,
    MikrotikFetchRunner,
    RemoteHealthRunner,
  ],
  exports: [RemoteSpeedService],
})
export class RemoteSpeedModule {}