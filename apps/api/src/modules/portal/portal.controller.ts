import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { PortalService } from "./portal.service";
import { RequestCodeDto } from "./dto/request-code.dto";
import { VerifyCodeDto } from "./dto/verify-code.dto";

@Controller("portal")
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Post("request-code")
  request(@Body() dto: RequestCodeDto, @Req() req: any) {
    return this.portalService.requestCode(dto, {
      ip: req.ip,
      ua: req.headers["user-agent"],
    });
  }

  @Get("points")
  getPoints() {
    return this.portalService.getPoints();
  }

  @Post("verify-code")
  verify(@Body() dto: VerifyCodeDto, @Req() req: any) {
    return this.portalService.verifyCode(dto, {
      ip: req.ip,
      ua: req.headers["user-agent"],
    });
  }

  @Get("me")
  me(
    @Query("deviceKey") deviceKey: string,
    @Query("pointId") pointId: string,
    @Query("clientMac") clientMac?: string,
    @Query("clientIp") clientIp?: string,
  ) {
    return this.portalService.me({
      deviceKey,
      pointId,
      clientMac,
      clientIp,
    });
  }
}