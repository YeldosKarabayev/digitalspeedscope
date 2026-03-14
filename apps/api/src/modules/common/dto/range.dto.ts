import { IsIn, IsOptional, IsString } from "class-validator";

export const RANGE_KEYS = ["1h", "24h", "7d", "30d"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export class RangeQueryDto {
  @IsOptional()
  @IsIn(RANGE_KEYS)
  range?: RangeKey;
}

export const METRIC_KEYS = ["download", "upload", "ping"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export class MapPointsQueryDto extends RangeQueryDto {
  @IsOptional()
  @IsIn(METRIC_KEYS)
  metric?: MetricKey;

  @IsOptional()
  @IsString()
  city?: string; // позже сделаем enum из справочника
}
