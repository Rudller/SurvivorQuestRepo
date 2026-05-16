ALTER TABLE "Realization"
ADD COLUMN "showLeaderboardDuringGame" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showLeaderboardOnFinish" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Realization"
SET
  "showLeaderboardDuringGame" = "showLeaderboard",
  "showLeaderboardOnFinish" = "showLeaderboard";
