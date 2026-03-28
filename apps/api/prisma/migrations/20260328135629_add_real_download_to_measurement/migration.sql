-- AlterTable
ALTER TABLE "Measurement" ADD COLUMN     "realDownloadMbps" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "pointId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_isRead_createdAt_idx" ON "Alert"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_severity_createdAt_idx" ON "Alert"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_pointId_createdAt_idx" ON "Alert"("pointId", "createdAt");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE SET NULL ON UPDATE CASCADE;
