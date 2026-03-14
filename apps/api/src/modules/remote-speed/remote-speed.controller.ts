import { Controller, Get, Param, Post } from "@nestjs/common";
import { RemoteSpeedService } from "./remote-speed.service";

@Controller("devices")
export class RemoteSpeedController {
  constructor(private readonly remoteSpeed: RemoteSpeedService) {}

  @Post(":id/remote-speed")
  run(@Param("id") id: string) {
    return this.remoteSpeed.createJob(id);
  }

  @Get(":id/remote-speed/jobs")
  jobs(@Param("id") id: string) {
    return this.remoteSpeed.listJobs(id);
  }
}