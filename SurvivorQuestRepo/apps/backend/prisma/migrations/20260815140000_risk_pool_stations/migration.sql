-- DropForeignKey
ALTER TABLE "RiskAttempt" DROP CONSTRAINT "RiskAttempt_questionId_fkey";

-- DropForeignKey
ALTER TABLE "RiskQuestion" DROP CONSTRAINT "RiskQuestion_categoryId_fkey";

-- DropIndex
DROP INDEX "RiskAttempt_teamId_questionId_idx";

-- DropTable
DROP TABLE "RiskQuestion";

-- AlterTable
ALTER TABLE "RiskAttempt"
  DROP COLUMN "questionId",
  ADD COLUMN "stationId" TEXT NOT NULL,
  ALTER COLUMN "selectedIndex" DROP NOT NULL;

-- CreateTable
CREATE TABLE "RiskPoolStation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "difficulty" "RiskDifficulty" NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskPoolStation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskPoolStation_categoryId_difficulty_idx" ON "RiskPoolStation"("categoryId", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "RiskPoolStation_categoryId_difficulty_stationId_key" ON "RiskPoolStation"("categoryId", "difficulty", "stationId");

-- CreateIndex
CREATE INDEX "RiskAttempt_teamId_stationId_idx" ON "RiskAttempt"("teamId", "stationId");

-- AddForeignKey
ALTER TABLE "RiskPoolStation" ADD CONSTRAINT "RiskPoolStation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RiskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskPoolStation" ADD CONSTRAINT "RiskPoolStation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAttempt" ADD CONSTRAINT "RiskAttempt_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
