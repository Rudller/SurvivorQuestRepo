-- CreateTable
CREATE TABLE "RiskScheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskScheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskScheme_name_key" ON "RiskScheme"("name");

-- DropIndex
DROP INDEX "RiskCategory_realizationId_name_key";

-- AlterTable
ALTER TABLE "RiskCategory" ALTER COLUMN "realizationId" DROP NOT NULL,
ADD COLUMN "schemeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RiskCategory_realizationId_name_key" ON "RiskCategory"("realizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RiskCategory_schemeId_name_key" ON "RiskCategory"("schemeId", "name");

-- CreateIndex
CREATE INDEX "RiskCategory_schemeId_order_idx" ON "RiskCategory"("schemeId", "order");

-- AddForeignKey
ALTER TABLE "RiskCategory" ADD CONSTRAINT "RiskCategory_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "RiskScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
