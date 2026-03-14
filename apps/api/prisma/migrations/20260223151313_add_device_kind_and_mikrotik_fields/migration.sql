-- CreateEnum
CREATE TYPE "DeviceKind" AS ENUM ('GENERIC', 'MIKROTIK');

-- CreateEnum
CREATE TYPE "MikrotikAuthMethod" AS ENUM ('API', 'SSH');

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "kind" "DeviceKind" NOT NULL DEFAULT 'GENERIC',
ADD COLUMN     "mikrotikAuthMethod" "MikrotikAuthMethod",
ADD COLUMN     "mikrotikHost" TEXT,
ADD COLUMN     "mikrotikPort" INTEGER,
ADD COLUMN     "mikrotikSecretRef" TEXT,
ADD COLUMN     "mikrotikUsername" TEXT;
