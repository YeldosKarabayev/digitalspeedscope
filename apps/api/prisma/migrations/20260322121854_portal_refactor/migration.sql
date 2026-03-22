/*
  Warnings:

  - A unique constraint covering the columns `[identityId,pointId,deviceKey]` on the table `PortalAccess` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pointId` to the `PortalAccess` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PortalAccess_identityId_deviceKey_key";

-- AlterTable
ALTER TABLE "PortalAccess" ADD COLUMN     "clientIp" TEXT,
ADD COLUMN     "clientMac" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "grantedAt" TIMESTAMP(3),
ADD COLUMN     "pointId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PortalSession" ADD COLUMN     "clientIp" TEXT,
ADD COLUMN     "clientMac" TEXT,
ADD COLUMN     "pointId" TEXT;

-- CreateTable
CREATE TABLE "PortalAuditLog" (
    "id" TEXT NOT NULL,
    "pointId" TEXT,
    "phone" TEXT,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "clientIp" TEXT,
    "clientMac" TEXT,
    "requestIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalAuditLog_pointId_createdAt_idx" ON "PortalAuditLog"("pointId", "createdAt");

-- CreateIndex
CREATE INDEX "PortalAuditLog_phone_createdAt_idx" ON "PortalAuditLog"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "PortalAccess_pointId_idx" ON "PortalAccess"("pointId");

-- CreateIndex
CREATE INDEX "PortalAccess_clientMac_idx" ON "PortalAccess"("clientMac");

-- CreateIndex
CREATE INDEX "PortalAccess_expiresAt_idx" ON "PortalAccess"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortalAccess_identityId_pointId_deviceKey_key" ON "PortalAccess"("identityId", "pointId", "deviceKey");

-- CreateIndex
CREATE INDEX "PortalSession_pointId_createdAt_idx" ON "PortalSession"("pointId", "createdAt");

-- CreateIndex
CREATE INDEX "PortalSession_clientMac_idx" ON "PortalSession"("clientMac");

-- AddForeignKey
ALTER TABLE "PortalSession" ADD CONSTRAINT "PortalSession_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAccess" ADD CONSTRAINT "PortalAccess_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalAuditLog" ADD CONSTRAINT "PortalAuditLog_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE SET NULL ON UPDATE CASCADE;
