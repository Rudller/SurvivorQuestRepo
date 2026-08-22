-- AlterTable
ALTER TABLE "RiskCategory" ADD COLUMN     "codeSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RiskCategory_codeSlug_key" ON "RiskCategory"("codeSlug");
