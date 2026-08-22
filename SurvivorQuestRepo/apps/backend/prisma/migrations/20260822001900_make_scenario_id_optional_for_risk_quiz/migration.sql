-- AlterTable
ALTER TABLE "Realization" ALTER COLUMN "scenarioId" DROP NOT NULL;

-- Data cleanup: risk-quiz realizations never actually use a scenario — they
-- previously got an auto-generated placeholder scenario+station purely to
-- satisfy the (now nullable) mandatory FK. Detach and remove that placeholder
-- data now that the column allows NULL.

-- 1. Capture the placeholder scenario ids currently assigned to risk-quiz realizations.
CREATE TEMP TABLE "_risk_quiz_placeholder_scenarios" AS
SELECT "scenarioId" AS id
FROM "Realization"
WHERE "type" = 'RISK_QUIZ' AND "scenarioId" IS NOT NULL;

-- 2. Detach those realizations from their placeholder scenario.
UPDATE "Realization"
SET "scenarioId" = NULL
WHERE "type" = 'RISK_QUIZ'
  AND "scenarioId" IN (SELECT "id" FROM "_risk_quiz_placeholder_scenarios");

-- 3. Remove the per-realization placeholder station clones.
DELETE FROM "Station"
WHERE "scenarioInstanceId" IN (SELECT "id" FROM "_risk_quiz_placeholder_scenarios");

-- 4. Remove the per-realization placeholder scenario clones themselves.
DELETE FROM "Scenario"
WHERE "id" IN (SELECT "id" FROM "_risk_quiz_placeholder_scenarios");

-- 5. Remove the shared placeholder template scenario + station, if present and
-- no longer used by any remaining scenario clone (from before this migration
-- or created independently).
DELETE FROM "Station"
WHERE "name" = 'Ryzykanci — pole techniczne'
  AND "realizationId" IS NULL
  AND "scenarioInstanceId" IS NULL;

DELETE FROM "Scenario"
WHERE "name" = 'Ryzykanci — automatyczny szkielet (nie edytuj)'
  AND "realizationId" IS NULL
  AND "sourceTemplateId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Scenario" AS derived
    WHERE derived."sourceTemplateId" = "Scenario"."id"
  );

DROP TABLE "_risk_quiz_placeholder_scenarios";
