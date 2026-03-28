import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { MapModule } from "./modules/map/map.module";
import { MeasurementsModule } from "./modules/measurements/measurements.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PortalModule } from "./modules/portal/portal.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { MikrotikModule } from "./modules/mikrotik/mikrotik.module";
import { RemoteSpeedModule } from "./modules/remote-speed/remote-speed.module";
import { TestController } from "./test.controller";
import { ReportsModule } from "./modules/reports/reports.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MikrotikModule,
    DevicesModule,
    RemoteSpeedModule,
    AuthModule,
    PrismaModule,
    DashboardModule,
    MapModule,
    MeasurementsModule,
    PortalModule,
    ReportsModule,
  ],
  controllers: [TestController],
})
export class AppModule {}