-- AlterEnum
ALTER TYPE "StationType" ADD VALUE 'REVIEWED_ANSWER';

-- AlterTable
ALTER TABLE "RiskAttempt" ADD COLUMN "answerText" TEXT;
