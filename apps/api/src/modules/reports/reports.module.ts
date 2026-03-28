import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  providers: [ReportsService, PrismaService],
  controllers: [ReportsController],
})
export class ReportsModule {}