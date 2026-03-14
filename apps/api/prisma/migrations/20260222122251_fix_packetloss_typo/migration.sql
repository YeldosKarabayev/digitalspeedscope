/*
  Warnings:

  - You are about to drop the column `acketLoss` on the `Measurement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Measurement" DROP COLUMN "acketLoss",
ADD COLUMN     "packetLoss" DOUBLE PRECISION;
