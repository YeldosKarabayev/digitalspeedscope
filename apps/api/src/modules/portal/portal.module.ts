import { Module } from "@nestjs/common";
import { PortalService } from "./portal.service";
import { PortalController } from "./portal.controller";
import { SmsService } from "./sms.service";
import { PrismaService } from "../../prisma/prisma.service";
import { MikrotikModule } from "../mikrotik/mikrotik.module";

@Module({
  imports: [MikrotikModule],
  providers: [PortalService, SmsService, PrismaService],
  controllers: [PortalController],
})
export class PortalModule {}