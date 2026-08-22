-- CreateTable
CREATE TABLE "RiskPendingDraw" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskPendingDraw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskPendingDraw_teamId_key" ON "RiskPendingDraw"("teamId");

-- AddForeignKey
ALTER TABLE "RiskPendingDraw" ADD CONSTRAINT "RiskPendingDraw_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskPendingDraw" ADD CONSTRAINT "RiskPendingDraw_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "RiskCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskPendingDraw" ADD CONSTRAINT "RiskPendingDraw_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
