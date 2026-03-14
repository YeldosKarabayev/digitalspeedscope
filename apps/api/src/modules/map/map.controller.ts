import { Controller, Get, Query } from "@nestjs/common";
import { MapService } from "./map.service";
import { RangeQueryDto } from "../common/dto/range.dto";
import { IsIn, IsOptional, IsString } from "class-validator";

class MapPointsQueryDto extends RangeQueryDto {
  @IsOptional()
  @IsIn(["download", "upload", "ping"])
  metric?: "download" | "upload" | "ping";

  @IsOptional()
  @IsString()
  city?: string;
}

@Controller("map")
export class MapController {
  constructor(private readonly service: MapService) {}

  @Get("points")
  points(@Query() q: MapPointsQueryDto) {
    return this.service.points({
      range: q.range ?? "24h",
      metric: q.metric ?? "download",
      city: q.city ?? "Все города",
    });
  }
}
