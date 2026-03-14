import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { HealthEngineService } from "./health-engine.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("monitoring")
export class MonitoringController {
  monitoring: any;
  constructor(private health: HealthEngineService) {}

  @Roles("ADMIN", "OPERATOR")
  @Post("recalc")
  recalc() {
    return this.health.recalc();
  }

  @Get("summary")
  summary() {
    return this.monitoring.summary();
  }
}