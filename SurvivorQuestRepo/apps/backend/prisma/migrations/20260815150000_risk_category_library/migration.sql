-- DropForeignKey
ALTER TABLE "RiskCategory" DROP CONSTRAINT "RiskCategory_realizationId_fkey";

-- DropForeignKey
ALTER TABLE "RiskCategory" DROP CONSTRAINT "RiskCategory_schemeId_fkey";

-- DropIndex
DROP INDEX "RiskCategory_realizationId_name_key";

-- DropIndex
DROP INDEX "RiskCategory_schemeId_name_key";

-- DropIndex
DROP INDEX "RiskCategory_realizationId_order_idx";

-- DropIndex
DROP INDEX "RiskCategory_schemeId_order_idx";

-- AlterTable
ALTER TABLE "RiskCategory"
  DROP COLUMN "realizationId",
  DROP COLUMN "schemeId",
  DROP COLUMN "order";

-- CreateIndex
CREATE UNIQUE INDEX "RiskCategory_name_key" ON "RiskCategory"("name");

-- CreateTable
CREATE TABLE "RiskSchemeCategory" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskSchemeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskSchemeCategory_schemeId_order_idx" ON "RiskSchemeCategory"("schemeId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RiskSchemeCategory_schemeId_categoryId_key" ON "RiskSchemeCategory"("schemeId", "categoryId");

-- AddForeignKey
ALTER TABLE "RiskSchemeCategory" ADD CONSTRAINT "RiskSchemeCategory_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "RiskScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskSchemeCategory" ADD CONSTRAINT "RiskSchemeCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RiskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Realization" ADD COLUMN "riskSchemeId" TEXT;

-- AddForeignKey
ALTER TABLE "Realization" ADD CONSTRAINT "Realization_riskSchemeId_fkey" FOREIGN KEY ("riskSchemeId") REFERENCES "RiskScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
