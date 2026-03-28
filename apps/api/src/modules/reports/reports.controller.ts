import { Controller, Get, Query, Res } from "@nestjs/common";
import express from "express";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get("access")
  getAccess(@Query() query: any) {
    return this.service.getAccessReport(query);
  }

  @Get("access/export/csv")
  async exportAccessCsv(@Query() query: any, @Res() res: express.Response) {
    const csv = await this.service.exportAccessCsv(query);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="access-report-${Date.now()}.csv"`,
    );

    res.send("\uFEFF" + csv);
  }

  @Get("access/export/xlsx")
  async exportAccessXlsx(@Query() query: any, @Res() res: express.Response) {
    const buffer = await this.service.exportAccessXlsx(query);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="access-report-${Date.now()}.xlsx"`,
    );

    res.send(buffer);
  }

  @Get("sms")
  getSmsLog(@Query() query: any) {
    return this.service.getSmsLog(query);
  }

  @Get("sms/export/csv")
  async exportSmsCsv(@Query() query: any, @Res() res: express.Response) {
    const csv = await this.service.exportSmsCsv(query);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sms-log-${Date.now()}.csv"`,
    );

    res.send("\uFEFF" + csv);
  }

  @Get("sms/export/xlsx")
  async exportSmsXlsx(@Query() query: any, @Res() res: express.Response) {
    const buffer = await this.service.exportAccessXlsx(query);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sms-log-${Date.now()}.xlsx"`,
    );

    res.send(buffer);
  }
}