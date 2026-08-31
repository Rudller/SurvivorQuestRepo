-- CreateEnum
CREATE TYPE "RiskPigType" AS ENUM ('FLASHLIGHT', 'UPSIDE_DOWN', 'SHAKE', 'FOG', 'SQUEAL', 'HASTE', 'OVERHEAD');

-- AlterTable
ALTER TABLE "Realization" ADD COLUMN "pigsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Realization" ADD COLUMN "pigGrantIntervalMinutes" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Realization" ADD COLUMN "pigEffectSeconds" INTEGER NOT NULL DEFAULT 90;
ALTER TABLE "Realization" ADD COLUMN "pigTypesEnabled" "RiskPigType"[] DEFAULT ARRAY[]::"RiskPigType"[];

-- CreateTable
CREATE TABLE "RiskPig" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "ownerTeamId" TEXT NOT NULL,
    "type" "RiskPigType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskPig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskPigEffect" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "targetTeamId" TEXT NOT NULL,
    "fromTeamId" TEXT,
    "fromName" TEXT NOT NULL,
    "type" "RiskPigType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskPigEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskPigGrant" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "tickKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskPigGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskPig_ownerTeamId_key" ON "RiskPig"("ownerTeamId");
CREATE INDEX "RiskPig_realizationId_idx" ON "RiskPig"("realizationId");
CREATE UNIQUE INDEX "RiskPigEffect_targetTeamId_key" ON "RiskPigEffect"("targetTeamId");
CREATE INDEX "RiskPigEffect_realizationId_expiresAt_idx" ON "RiskPigEffect"("realizationId", "expiresAt");
CREATE UNIQUE INDEX "RiskPigGrant_realizationId_teamId_tickKey_key" ON "RiskPigGrant"("realizationId", "teamId", "tickKey");
CREATE INDEX "RiskPigGrant_realizationId_teamId_idx" ON "RiskPigGrant"("realizationId", "teamId");

-- AddForeignKey
ALTER TABLE "RiskPig" ADD CONSTRAINT "RiskPig_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskPig" ADD CONSTRAINT "RiskPig_ownerTeamId_fkey" FOREIGN KEY ("ownerTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskPigEffect" ADD CONSTRAINT "RiskPigEffect_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskPigEffect" ADD CONSTRAINT "RiskPigEffect_targetTeamId_fkey" FOREIGN KEY ("targetTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskPigEffect" ADD CONSTRAINT "RiskPigEffect_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskPigGrant" ADD CONSTRAINT "RiskPigGrant_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskPigGrant" ADD CONSTRAINT "RiskPigGrant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
