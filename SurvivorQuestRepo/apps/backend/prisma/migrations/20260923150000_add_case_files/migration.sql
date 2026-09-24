-- CreateEnum
CREATE TYPE "CaseFileKind" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'DOSSIER');

-- CreateEnum
CREATE TYPE "CaseFileUnlockMode" AS ENUM ('FROM_START', 'AFTER_STATION');

-- CreateTable
CREATE TABLE "CaseFile" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "stationId" TEXT,
    "kind" "CaseFileKind" NOT NULL,
    "unlockMode" "CaseFileUnlockMode" NOT NULL DEFAULT 'FROM_START',
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "objectKey" TEXT,
    "url" TEXT,
    "fields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseFile_realizationId_order_idx" ON "CaseFile"("realizationId", "order");

-- CreateIndex
CREATE INDEX "CaseFile_stationId_idx" ON "CaseFile"("stationId");

-- AddForeignKey
ALTER TABLE "CaseFile" ADD CONSTRAINT "CaseFile_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseFile" ADD CONSTRAINT "CaseFile_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
