-- CreateEnum
CREATE TYPE "RealizationThemePack" AS ENUM ('STANDARD', 'CRIME');

-- AlterTable
ALTER TABLE "Realization" ADD COLUMN     "themePack" "RealizationThemePack" NOT NULL DEFAULT 'STANDARD';
