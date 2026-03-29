-- CreateTable
CREATE TABLE "SmsTopupRequest" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KZT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SmsTopupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsTopupRequest_status_createdAt_idx" ON "SmsTopupRequest"("status", "createdAt");
