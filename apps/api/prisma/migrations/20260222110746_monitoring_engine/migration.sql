-- CreateEnum
CREATE TYPE "DeviceHealth" AS ENUM ('ONLINE', 'DEGRADED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACK', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('OFFLINE', 'HIGH_PING', 'LOW_DOWNLOAD', 'LOW_UPLOAD', 'PACKET_LOSS');

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "health" "DeviceHealth" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "lastIp" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Measurement" ADD COLUMN     "jitterMs" INTEGER,
ADD COLUMN     "packetLoss" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Point" ADD COLUMN     "health" "DeviceHealth" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "details" JSONB,
    "deviceId" TEXT,
    "pointId" TEXT,
    "dedupKey" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Incident_dedupKey_key" ON "Incident"("dedupKey");

-- CreateIndex
CREATE INDEX "Incident_status_severity_openedAt_idx" ON "Incident"("status", "severity", "openedAt");

-- CreateIndex
CREATE INDEX "Incident_deviceId_status_idx" ON "Incident"("deviceId", "status");

-- CreateIndex
CREATE INDEX "Incident_pointId_status_idx" ON "Incident"("pointId", "status");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE SET NULL ON UPDATE CASCADE;
