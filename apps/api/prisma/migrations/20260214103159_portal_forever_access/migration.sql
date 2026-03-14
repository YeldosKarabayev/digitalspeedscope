-- CreateTable
CREATE TABLE "PortalIdentity" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalAccess" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "PortalAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalIdentity_phone_key" ON "PortalIdentity"("phone");

-- CreateIndex
CREATE INDEX "PortalAccess_deviceKey_idx" ON "PortalAccess"("deviceKey");

-- CreateIndex
CREATE UNIQUE INDEX "PortalAccess_identityId_deviceKey_key" ON "PortalAccess"("identityId", "deviceKey");

-- AddForeignKey
ALTER TABLE "PortalAccess" ADD CONSTRAINT "PortalAccess_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "PortalIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
