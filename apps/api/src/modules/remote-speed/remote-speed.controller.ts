import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RemoteSpeedService } from "./remote-speed.service";
import type { CreateRemoteSpeedJobInput } from "./remote-speed.service";

@Controller("devices")
export class RemoteSpeedController {
  constructor(private readonly remoteSpeed: RemoteSpeedService) {}

  @Post(":id/remote-speed")
  run(@Param("id") id: string, @Body() body: CreateRemoteSpeedJobInput) {
    return this.remoteSpeed.createJob(id, body);
  }

  @Get(":id/remote-speed/jobs")
  jobs(@Param("id") id: string) {
    return this.remoteSpeed.listJobs(id);
  }

  @Get(":id/remote-speed/jobs/active")
  active(@Param("id") id: string) {
    return this.remoteSpeed.getActiveJob(id);
  }

  @Get(":id/remote-speed/jobs/:jobId")
  job(@Param("id") id: string, @Param("jobId") jobId: string) {
    return this.remoteSpeed.getJob(id, jobId);
  }
}