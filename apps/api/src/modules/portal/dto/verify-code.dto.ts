import { IsOptional, IsString, Matches, MinLength } from "class-validator";

export class VerifyCodeDto {
  @IsString()
  @Matches(/^7\d{10}$/, { message: "Телефон должен быть в формате 7XXXXXXXXXX" })
  phone: string;

  @IsString()
  @MinLength(4)
  code: string;

  @IsString()
  deviceKey: string;

  @IsString()
  pointId: string;

  @IsOptional()
  @IsString()
  clientIp?: string;

  @IsOptional()
  @IsString()
  clientMac?: string;
}