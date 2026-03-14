-- CreateEnum
CREATE TYPE "RemoteSpeedJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'TIMEOUT');

-- CreateTable
CREATE TABLE "RemoteSpeedJob" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "RemoteSpeedJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER,
    "phase" TEXT,
    "message" TEXT,
    "measurementId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemoteSpeedJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RemoteSpeedJob_measurementId_key" ON "RemoteSpeedJob"("measurementId");

-- CreateIndex
CREATE INDEX "RemoteSpeedJob_deviceId_createdAt_idx" ON "RemoteSpeedJob"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "RemoteSpeedJob_status_idx" ON "RemoteSpeedJob"("status");

-- AddForeignKey
ALTER TABLE "RemoteSpeedJob" ADD CONSTRAINT "RemoteSpeedJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemoteSpeedJob" ADD CONSTRAINT "RemoteSpeedJob_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "Measurement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
