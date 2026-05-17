-- Prevent two teams in the same realization from claiming the same color or badge.
-- PostgreSQL allows multiple NULL values in unique indexes, so uncustomized teams remain valid.
CREATE UNIQUE INDEX "Team_realizationId_color_key" ON "Team"("realizationId", "color");
CREATE UNIQUE INDEX "Team_realizationId_badgeKey_key" ON "Team"("realizationId", "badgeKey");
