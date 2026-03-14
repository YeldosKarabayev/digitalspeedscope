/*
  Warnings:

  - You are about to drop the column `packetLoss` on the `Measurement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Measurement" DROP COLUMN "packetLoss",
ADD COLUMN     "acketLoss" DOUBLE PRECISION;
