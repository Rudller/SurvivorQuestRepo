-- CreateEnum
CREATE TYPE "RiskDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterEnum
ALTER TYPE "RealizationType" ADD VALUE 'RISK_QUIZ';

-- CreateTable
CREATE TABLE "RiskCategory" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskQuestion" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "difficulty" "RiskDifficulty" NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskCard" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "difficulty" "RiskDifficulty" NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAttempt" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsDelta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskCategory_realizationId_order_idx" ON "RiskCategory"("realizationId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RiskCategory_realizationId_name_key" ON "RiskCategory"("realizationId", "name");

-- CreateIndex
CREATE INDEX "RiskQuestion_categoryId_difficulty_idx" ON "RiskQuestion"("categoryId", "difficulty");

-- CreateIndex
CREATE INDEX "RiskCard_categoryId_difficulty_idx" ON "RiskCard"("categoryId", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "RiskCard_realizationId_code_key" ON "RiskCard"("realizationId", "code");

-- CreateIndex
CREATE INDEX "RiskAttempt_teamId_questionId_idx" ON "RiskAttempt"("teamId", "questionId");

-- CreateIndex
CREATE INDEX "RiskAttempt_realizationId_teamId_idx" ON "RiskAttempt"("realizationId", "teamId");

-- AddForeignKey
ALTER TABLE "RiskCategory" ADD CONSTRAINT "RiskCategory_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskQuestion" ADD CONSTRAINT "RiskQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RiskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskCard" ADD CONSTRAINT "RiskCard_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskCard" ADD CONSTRAINT "RiskCard_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RiskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAttempt" ADD CONSTRAINT "RiskAttempt_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAttempt" ADD CONSTRAINT "RiskAttempt_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAttempt" ADD CONSTRAINT "RiskAttempt_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "RiskCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAttempt" ADD CONSTRAINT "RiskAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RiskQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
