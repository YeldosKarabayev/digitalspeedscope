// api/src/modules/alerts/alerts.controller.ts
import { Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { AlertsService } from "./alerts.service";
import { ListAlertsQueryDto } from "./dto/list-alerts.query.dto";

@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  list(@Query() query: ListAlertsQueryDto) {
    return this.alertsService.list(query);
  }

  @Patch("read-all")
  markAllRead() {
    return this.alertsService.markAllRead();
  }

  @Patch(":id/read")
  async markRead(@Param("id") id: string) {
    await this.alertsService.markRead(id);
    return { ok: true };
  }
}