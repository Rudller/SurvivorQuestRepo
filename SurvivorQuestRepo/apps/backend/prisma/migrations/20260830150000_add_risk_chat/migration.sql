-- CreateEnum
CREATE TYPE "RiskChatAuthorKind" AS ENUM ('TEAM', 'GAME_MASTER', 'SYSTEM');

-- AlterTable
ALTER TABLE "Realization" ADD COLUMN "riskChatEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Realization" ADD COLUMN "riskChatTeamsCanPost" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "RiskChatMessage" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "authorKind" "RiskChatAuthorKind" NOT NULL,
    "teamId" TEXT,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "systemEvent" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskChatMessage_realizationId_dedupeKey_key" ON "RiskChatMessage"("realizationId", "dedupeKey");

-- CreateIndex
CREATE INDEX "RiskChatMessage_realizationId_createdAt_idx" ON "RiskChatMessage"("realizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "RiskChatMessage" ADD CONSTRAINT "RiskChatMessage_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskChatMessage" ADD CONSTRAINT "RiskChatMessage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
