-- CreateEnum
CREATE TYPE "PointsQrClaimMode" AS ENUM ('PER_TEAM', 'FIRST_TEAM');

-- CreateTable
CREATE TABLE "PointsQrCode" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "label" TEXT,
    "claimMode" "PointsQrClaimMode" NOT NULL DEFAULT 'PER_TEAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsQrCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsQrCodeClaim" (
    "id" TEXT NOT NULL,
    "pointsQrCodeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsQrCodeClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PointsQrCode_realizationId_code_key" ON "PointsQrCode"("realizationId", "code");

-- CreateIndex
CREATE INDEX "PointsQrCodeClaim_teamId_idx" ON "PointsQrCodeClaim"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsQrCodeClaim_pointsQrCodeId_teamId_key" ON "PointsQrCodeClaim"("pointsQrCodeId", "teamId");

-- AddForeignKey
ALTER TABLE "PointsQrCode" ADD CONSTRAINT "PointsQrCode_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsQrCodeClaim" ADD CONSTRAINT "PointsQrCodeClaim_pointsQrCodeId_fkey" FOREIGN KEY ("pointsQrCodeId") REFERENCES "PointsQrCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsQrCodeClaim" ADD CONSTRAINT "PointsQrCodeClaim_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
