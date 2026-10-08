-- CreateIndex
CREATE INDEX "EventLog_realizationId_eventType_createdAt_idx" ON "EventLog"("realizationId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "EventLog_teamId_eventType_createdAt_idx" ON "EventLog"("teamId", "eventType", "createdAt");
