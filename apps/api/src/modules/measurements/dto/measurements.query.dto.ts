import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { RangeQueryDto } from "../../common/dto/range.dto";

export class MeasurementsQueryDto extends RangeQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // поиск по deviceUid/isp/pointName/city

  @IsOptional()
  @IsString()
  city?: string; // "Алматы" | "Астана" | "Шымкент" | "Все города"

  @IsOptional()
  @IsIn(["EXCELLENT", "GOOD", "FAIR", "POOR"])
  status?: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

  @IsOptional()
  @IsString()
  deviceUid?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
