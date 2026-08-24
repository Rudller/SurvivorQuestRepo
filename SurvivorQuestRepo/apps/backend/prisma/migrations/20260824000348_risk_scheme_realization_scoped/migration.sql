-- DropIndex
DROP INDEX "public"."RiskCategory_codeSlug_key";

-- DropIndex
DROP INDEX "public"."RiskCategory_name_key";

-- DropIndex
DROP INDEX "public"."RiskScheme_name_key";

-- AlterTable
ALTER TABLE "RiskCategory" ADD COLUMN     "realizationId" TEXT,
ADD COLUMN     "sourceTemplateId" TEXT;

-- AlterTable
ALTER TABLE "RiskScheme" ADD COLUMN     "realizationId" TEXT,
ADD COLUMN     "sourceTemplateId" TEXT;

-- CreateIndex
CREATE INDEX "RiskCategory_realizationId_idx" ON "RiskCategory"("realizationId");

-- CreateIndex
CREATE INDEX "RiskScheme_realizationId_idx" ON "RiskScheme"("realizationId");

-- AddForeignKey
ALTER TABLE "RiskScheme" ADD CONSTRAINT "RiskScheme_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskCategory" ADD CONSTRAINT "RiskCategory_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique indexes (hand-written: Prisma's DSL cannot express a WHERE clause).
-- Templates keep the uniqueness they had before this migration; realization-owned
-- clones are exempt, because a clone deliberately reuses its source's name and — for
-- RiskCategory — its codeSlug too, which is what keeps one printed QR sticker valid
-- across every realization built from the same template deck.
CREATE UNIQUE INDEX "RiskScheme_name_template_key"
  ON "RiskScheme"("name") WHERE "realizationId" IS NULL;

CREATE UNIQUE INDEX "RiskCategory_name_template_key"
  ON "RiskCategory"("name") WHERE "realizationId" IS NULL;

CREATE UNIQUE INDEX "RiskCategory_codeSlug_template_key"
  ON "RiskCategory"("codeSlug") WHERE "realizationId" IS NULL;
