import { Module } from "@nestjs/common";
import { SmsController } from "./sms.controller";
import { PortalModule } from "./portal.module";

@Module({
  imports: [PortalModule], 
  controllers: [SmsController],
})
export class SmsModule {}