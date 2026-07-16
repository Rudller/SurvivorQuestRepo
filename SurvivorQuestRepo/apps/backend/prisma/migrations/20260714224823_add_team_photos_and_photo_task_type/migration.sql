-- CreateEnum
CREATE TYPE "TeamPhotoKind" AS ENUM ('TEAM_SELFIE', 'TASK_PROOF');

-- AlterEnum
ALTER TYPE "StationType" ADD VALUE 'PHOTO_TASK';

-- CreateTable
CREATE TABLE "TeamPhoto" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stationId" TEXT,
    "kind" "TeamPhotoKind" NOT NULL,
    "objectKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamPhoto_realizationId_createdAt_idx" ON "TeamPhoto"("realizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TeamPhoto_teamId_kind_idx" ON "TeamPhoto"("teamId", "kind");

-- CreateIndex
CREATE INDEX "TeamPhoto_stationId_idx" ON "TeamPhoto"("stationId");

-- AddForeignKey
ALTER TABLE "TeamPhoto" ADD CONSTRAINT "TeamPhoto_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPhoto" ADD CONSTRAINT "TeamPhoto_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPhoto" ADD CONSTRAINT "TeamPhoto_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
