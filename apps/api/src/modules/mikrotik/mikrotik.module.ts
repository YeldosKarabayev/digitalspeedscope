import { Module } from "@nestjs/common";
import { MikrotikApiService } from "./mikrotik-api.service";
import { MikrotikTestController } from "./mikrotik-test.controller";

@Module({
  controllers: [MikrotikTestController],
  providers: [MikrotikApiService],
  exports: [MikrotikApiService],
})
export class MikrotikModule {}