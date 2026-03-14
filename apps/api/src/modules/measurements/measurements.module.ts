import { Module } from "@nestjs/common";
import { MeasurementsController } from "./measurements.controller";
import { MeasurementsService } from "./measurements.service";
import { MeasurementRunnerService } from "./measurement-runner.service";

@Module({
  controllers: [MeasurementsController],
  providers: [MeasurementsService, MeasurementRunnerService],
})
export class MeasurementsModule {}
