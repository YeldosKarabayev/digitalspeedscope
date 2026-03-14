import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RemoteSpeedService } from "./remote-speed.service";

type CreateRemoteSpeedJobDto = {
  target?: string;
  interfaceName?: string;
  count?: number;
};

@Controller("devices")
export class RemoteSpeedController {
  constructor(private readonly remoteSpeed: RemoteSpeedService) {}

  @Post(":id/remote-speed")
  run(
    @Param("id") id: string,
    @Body() body: CreateRemoteSpeedJobDto,
  ) {
    return this.remoteSpeed.createJob(id, body);
  }

  @Get(":id/remote-speed/jobs")
  jobs(@Param("id") id: string) {
    return this.remoteSpeed.listJobs(id);
  }
}