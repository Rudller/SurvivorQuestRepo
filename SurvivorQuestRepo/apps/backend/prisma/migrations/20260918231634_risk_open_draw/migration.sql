-- CreateTable
CREATE TABLE "RiskOpenDraw" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskOpenDraw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskOpenDraw_teamId_key" ON "RiskOpenDraw"("teamId");

-- AddForeignKey
ALTER TABLE "RiskOpenDraw" ADD CONSTRAINT "RiskOpenDraw_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskOpenDraw" ADD CONSTRAINT "RiskOpenDraw_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "RiskCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskOpenDraw" ADD CONSTRAINT "RiskOpenDraw_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
