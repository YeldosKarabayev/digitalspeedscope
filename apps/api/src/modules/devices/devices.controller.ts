import { Body, Controller, Delete, Get, Param, Patch, Post, Query, ParseIntPipe } from "@nestjs/common";
import { DevicesService } from "./devices.service";
import type { DeviceCreateDto } from "./dto/device-create.dto";
import type { DeviceUpdateDto } from "./dto/evice-update.dto";

@Controller("devices")
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get()
  list() {
    return this.devices.list();
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.devices.getDetails(id);
  }

  @Get(":id/measurements")
  getMeasurements(
    @Param("id") id: string,
    @Query("take", new ParseIntPipe({ optional: true })) take = 20,
    @Query("source") source?: string,
  ) {
    return this.devices.getMeasurements(id, { take, source: source as any });
  }

  @Post()
  create(@Body() dto: DeviceCreateDto) {
    return this.devices.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: DeviceUpdateDto) {
    return this.devices.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.devices.remove(id);
  }
}