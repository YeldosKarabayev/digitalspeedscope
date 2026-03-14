import { Controller, Get, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { RangeQueryDto } from "../common/dto/range.dto";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) { }

  @Get("overview")
  overview(@Query() q: RangeQueryDto) {
    return this.service.overview(q.range ?? "24h");
  }

  @Get("trends")
  trends(@Query() q: RangeQueryDto) {
    return this.service.trends(q.range ?? "24h");
  }
}
