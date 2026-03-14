import { IsString, Length, Matches } from "class-validator";

export class RequestCodeDto {
  @IsString()
  @Matches(/^7\d{10}$/)
  phone!: string;
}
