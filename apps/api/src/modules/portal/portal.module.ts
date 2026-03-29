import { Module } from "@nestjs/common";
import { PortalService } from "./portal.service";
import { PortalController } from "./portal.controller";
import { SmsService } from "./sms.service";
import { SmsController } from "./sms.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { MikrotikModule } from "../mikrotik/mikrotik.module";

@Module({
  imports: [MikrotikModule],
  providers: [PortalService, SmsService, PrismaService],
  controllers: [PortalController, SmsController],
  exports: [SmsService],
})
export class PortalModule {}