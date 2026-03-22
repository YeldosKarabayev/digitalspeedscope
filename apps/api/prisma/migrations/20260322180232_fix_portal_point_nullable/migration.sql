-- DropForeignKey
ALTER TABLE "PortalAccess" DROP CONSTRAINT "PortalAccess_pointId_fkey";

-- AlterTable
ALTER TABLE "PortalAccess" ALTER COLUMN "pointId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PortalAccess" ADD CONSTRAINT "PortalAccess_pointId_fkey" FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE SET NULL ON UPDATE CASCADE;
