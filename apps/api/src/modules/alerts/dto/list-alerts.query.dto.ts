import { IsIn, IsOptional, IsString } from "class-validator";

export class ListAlertsQueryDto {
  @IsOptional()
  @IsIn(["INFO", "WARNING", "ERROR"])
  severity?: "INFO" | "WARNING" | "ERROR";

  @IsOptional()
  @IsIn(["read", "unread"])
  status?: "read" | "unread";

  @IsOptional()
  @IsString()
  pointId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}