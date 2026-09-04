-- Kwik (SQUEAL) goes away and Pośpiech (HASTE) becomes Ciemność (DARKNESS), the
-- light-sensor pig. Both were handed out by the server but did nothing on the
-- tablet, so any rows carrying them are already inert — none of the deletes
-- below take a working effect away from anyone.

-- HASTE simply changes meaning, so a rename keeps every row that already holds
-- it. Postgres does this in place; there is no table rewrite.
ALTER TYPE "RiskPigType" RENAME VALUE 'HASTE' TO 'DARKNESS';

-- SQUEAL has to disappear from the type itself, and Postgres cannot drop a
-- value from an enum. The type is rebuilt without it, which means every row
-- still referencing it must go first.
DELETE FROM "RiskPigEffect" WHERE "type" = 'SQUEAL';
DELETE FROM "RiskPig" WHERE "type" = 'SQUEAL';
UPDATE "Realization"
   SET "pigTypesEnabled" = array_remove("pigTypesEnabled", 'SQUEAL'::"RiskPigType")
 WHERE 'SQUEAL'::"RiskPigType" = ANY ("pigTypesEnabled");

ALTER TYPE "RiskPigType" RENAME TO "RiskPigType_old";

CREATE TYPE "RiskPigType" AS ENUM ('FLASHLIGHT', 'UPSIDE_DOWN', 'SHAKE', 'FOG', 'DARKNESS', 'OVERHEAD');

ALTER TABLE "RiskPig"
  ALTER COLUMN "type" TYPE "RiskPigType" USING ("type"::text::"RiskPigType");

ALTER TABLE "RiskPigEffect"
  ALTER COLUMN "type" TYPE "RiskPigType" USING ("type"::text::"RiskPigType");

-- The array column carries a default that names the old type, so it has to be
-- dropped and restated around the cast rather than left to be rewritten.
ALTER TABLE "Realization" ALTER COLUMN "pigTypesEnabled" DROP DEFAULT;
ALTER TABLE "Realization"
  ALTER COLUMN "pigTypesEnabled" TYPE "RiskPigType"[] USING ("pigTypesEnabled"::text[]::"RiskPigType"[]);
ALTER TABLE "Realization"
  ALTER COLUMN "pigTypesEnabled" SET DEFAULT ARRAY[]::"RiskPigType"[];

DROP TYPE "RiskPigType_old";
