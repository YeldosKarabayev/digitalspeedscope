import { Module } from "@nestjs/common";
import { MonitoringController } from "./monitoring.controller";
import { HealthEngineService } from "./health-engine.service";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [MonitoringController],
  providers: [HealthEngineService],
  exports: [HealthEngineService],
})
export class MonitoringModule {}