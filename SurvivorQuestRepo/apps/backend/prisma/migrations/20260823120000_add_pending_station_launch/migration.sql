-- CreateTable
CREATE TABLE "PendingStationLaunch" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingStationLaunch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingStationLaunch_teamId_key" ON "PendingStationLaunch"("teamId");

-- CreateIndex
CREATE INDEX "PendingStationLaunch_stationId_idx" ON "PendingStationLaunch"("stationId");

-- AddForeignKey
ALTER TABLE "PendingStationLaunch" ADD CONSTRAINT "PendingStationLaunch_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingStationLaunch" ADD CONSTRAINT "PendingStationLaunch_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
