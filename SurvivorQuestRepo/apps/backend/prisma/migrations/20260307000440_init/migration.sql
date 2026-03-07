-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "StationType" AS ENUM ('QUIZ', 'TIME', 'POINTS');

-- CreateEnum
CREATE TYPE "RealizationStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "RealizationType" AS ENUM ('OUTDOOR_GAMES', 'HOTEL_GAMES', 'WORKSHOPS', 'EVENING_ATTRACTIONS', 'DJ', 'RECREATION');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "EventActorType" AS ENUM ('ADMIN', 'MOBILE_DEVICE', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'INSTRUCTOR',
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "photoUrl" TEXT,
    "passwordHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StationType" NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "points" INTEGER NOT NULL,
    "timeLimitSeconds" INTEGER NOT NULL DEFAULT 0,
    "sourceTemplateId" TEXT,
    "scenarioInstanceId" TEXT,
    "realizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceTemplateId" TEXT,
    "realizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioStation" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenarioStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Realization" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "instructors" JSONB,
    "type" "RealizationType" NOT NULL,
    "logoUrl" TEXT,
    "offerPdfUrl" TEXT,
    "offerPdfName" TEXT,
    "scenarioId" TEXT NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "requiredDevicesCount" INTEGER NOT NULL,
    "peopleCount" INTEGER NOT NULL,
    "positionsCount" INTEGER NOT NULL,
    "status" "RealizationStatus" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "locationRequired" BOOLEAN NOT NULL DEFAULT true,
    "joinCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Realization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "name" TEXT,
    "color" TEXT,
    "badgeKey" TEXT,
    "badgeImageUrl" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "taskTotal" INTEGER NOT NULL DEFAULT 0,
    "taskDone" INTEGER NOT NULL DEFAULT 0,
    "status" "TeamStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "lastLocationLat" DOUBLE PRECISION,
    "lastLocationLng" DOUBLE PRECISION,
    "lastLocationAccuracy" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAssignment" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "memberName" TEXT,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamTaskProgress" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamTaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "realizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "actorType" "EventActorType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "ScenarioStation_stationId_idx" ON "ScenarioStation"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioStation_scenarioId_order_key" ON "ScenarioStation"("scenarioId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioStation_scenarioId_stationId_key" ON "ScenarioStation"("scenarioId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "Realization_joinCode_key" ON "Realization"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "Team_realizationId_slotNumber_key" ON "Team"("realizationId", "slotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TeamAssignment_sessionToken_key" ON "TeamAssignment"("sessionToken");

-- CreateIndex
CREATE INDEX "TeamAssignment_teamId_idx" ON "TeamAssignment"("teamId");

-- CreateIndex
CREATE INDEX "TeamAssignment_realizationId_deviceId_idx" ON "TeamAssignment"("realizationId", "deviceId");

-- CreateIndex
CREATE INDEX "TeamTaskProgress_teamId_idx" ON "TeamTaskProgress"("teamId");

-- CreateIndex
CREATE INDEX "TeamTaskProgress_stationId_idx" ON "TeamTaskProgress"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamTaskProgress_realizationId_teamId_stationId_key" ON "TeamTaskProgress"("realizationId", "teamId", "stationId");

-- CreateIndex
CREATE INDEX "EventLog_realizationId_createdAt_idx" ON "EventLog"("realizationId", "createdAt");

-- CreateIndex
CREATE INDEX "EventLog_teamId_createdAt_idx" ON "EventLog"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioStation" ADD CONSTRAINT "ScenarioStation_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioStation" ADD CONSTRAINT "ScenarioStation_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Realization" ADD CONSTRAINT "Realization_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAssignment" ADD CONSTRAINT "TeamAssignment_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAssignment" ADD CONSTRAINT "TeamAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskProgress" ADD CONSTRAINT "TeamTaskProgress_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskProgress" ADD CONSTRAINT "TeamTaskProgress_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamTaskProgress" ADD CONSTRAINT "TeamTaskProgress_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_realizationId_fkey" FOREIGN KEY ("realizationId") REFERENCES "Realization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
