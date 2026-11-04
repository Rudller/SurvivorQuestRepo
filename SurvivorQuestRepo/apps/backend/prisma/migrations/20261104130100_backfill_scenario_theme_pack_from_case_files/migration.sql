-- Scenariusze, które już mają akta, dostają oprawę kryminalną. Akta w edycji
-- scenariusza są widoczne tylko przy tej oprawie, więc bez tego istniejące
-- akta nagle by się schowały.
UPDATE "Scenario"
SET "themePack" = 'CRIME'
WHERE "id" IN (SELECT DISTINCT "scenarioId" FROM "CaseFile" WHERE "scenarioId" IS NOT NULL);
