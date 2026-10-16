-- Akta mogą należeć do scenariusza (wzór) albo do realizacji (kopia).
ALTER TABLE "CaseFile" ALTER COLUMN "realizationId" DROP NOT NULL;
ALTER TABLE "CaseFile" ADD COLUMN     "scenarioId" TEXT;

-- CreateIndex
CREATE INDEX "CaseFile_scenarioId_order_idx" ON "CaseFile"("scenarioId", "order");

-- AddForeignKey
ALTER TABLE "CaseFile" ADD CONSTRAINT "CaseFile_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dokładnie jeden właściciel. Prisma nie umie tego wyrazić w schemacie.
ALTER TABLE "CaseFile" ADD CONSTRAINT "CaseFile_single_owner_check" CHECK (("realizationId" IS NULL) <> ("scenarioId" IS NULL));
