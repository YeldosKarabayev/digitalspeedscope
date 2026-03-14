import { IsString, Length, Matches } from "class-validator";

export class VerifyCodeDto {
  @IsString()
  @Matches(/^7\d{10}$/)
  phone!: string;

  @IsString()
  @Length(4, 6)
  code!: string;

  @IsString()
  @Length(8, 64)
  deviceKey!: string;
}
