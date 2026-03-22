import { Module } from "@nestjs/common";
import { MikrotikApiService } from "./mikrotik-api.service";
import { MikrotikService } from "./mikrotik.service";
import { MikrotikTestController } from "./mikrotik-test.controller";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [MikrotikTestController],
  providers: [MikrotikApiService, MikrotikService, PrismaService],
  exports: [MikrotikApiService, MikrotikService],
})
export class MikrotikModule {}