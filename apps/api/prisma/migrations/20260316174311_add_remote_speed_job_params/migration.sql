-- AlterTable
ALTER TABLE "RemoteSpeedJob" ADD COLUMN     "direction" TEXT,
ADD COLUMN     "durationSec" INTEGER,
ADD COLUMN     "protocol" TEXT,
ADD COLUMN     "rawResult" JSONB,
ADD COLUMN     "targetHost" TEXT;
