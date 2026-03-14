import { Controller, Get, Post, Query } from "@nestjs/common";
import { MeasurementsService } from "./measurements.service";
import { MeasurementRunnerService } from "./measurement-runner.service";
import { RangeQueryDto } from "../common/dto/range.dto";
import { MeasurementsQueryDto } from "./dto/measurements.query.dto";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "OPERATOR", "VIEWER")
@Controller("measurements")
export class MeasurementsController {
  constructor(private readonly service: MeasurementsService) { }

  // Для дашборда
  @Get("recent")
  recent(@Query() q: RangeQueryDto) {
    return this.service.recent(q.range ?? "24h");
  }

  // Для страницы "Измерения"
  @Get()
  list(@Query() q: MeasurementsQueryDto) {
    return this.service.list(q);
  }

  @Post("run")
  async run() {
    return this.service.runManualTest();
  }
}
