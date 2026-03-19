-- CreateEnum
CREATE TYPE "RealizationLanguage" AS ENUM ('POLISH', 'ENGLISH', 'UKRAINIAN', 'RUSSIAN', 'OTHER');

-- AlterTable
ALTER TABLE "Realization"
ADD COLUMN "language" "RealizationLanguage" NOT NULL DEFAULT 'POLISH',
ADD COLUMN "customLanguage" TEXT;
