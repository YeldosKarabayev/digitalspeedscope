import { IsOptional, IsString, Matches } from "class-validator";

export class RequestCodeDto {
  @IsString()
  @Matches(/^7\d{10}$/, { message: "Телефон должен быть в формате 7XXXXXXXXXX" })
  phone: string;

  @IsOptional()
  @IsString()
  pointId?: string;

  @IsOptional()
  @IsString()
  clientIp?: string;

  @IsOptional()
  @IsString()
  clientMac?: string;
}