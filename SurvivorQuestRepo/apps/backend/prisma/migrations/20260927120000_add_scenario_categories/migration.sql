-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
