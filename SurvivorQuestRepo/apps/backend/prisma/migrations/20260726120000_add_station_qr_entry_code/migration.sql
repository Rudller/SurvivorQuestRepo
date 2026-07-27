-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "qrEntryCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Station_realizationId_qrEntryCode_key" ON "Station"("realizationId", "qrEntryCode");
