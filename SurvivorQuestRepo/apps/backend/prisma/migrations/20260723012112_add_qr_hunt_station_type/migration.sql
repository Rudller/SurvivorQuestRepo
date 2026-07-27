-- AlterEnum
ALTER TYPE "StationType" ADD VALUE 'QR_HUNT';

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "qrScanCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "TeamStationScan" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamStationScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamStationScan_realizationId_teamId_stationId_idx" ON "TeamStationScan"("realizationId", "teamId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStationScan_realizationId_teamId_stationId_code_key" ON "TeamStationScan"("realizationId", "teamId", "stationId", "code");

-- AddForeignKey
ALTER TABLE "TeamStationScan" ADD CONSTRAINT "TeamStationScan_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStationScan" ADD CONSTRAINT "TeamStationScan_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStationScan" ADD CONSTRAINT "TeamStationScan_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
