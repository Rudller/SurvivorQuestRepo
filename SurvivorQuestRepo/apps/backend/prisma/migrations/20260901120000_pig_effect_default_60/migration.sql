-- Default pig duration drops from 90s to 60s. Only the column default moves:
-- realizations already configured keep whatever their operator set.
ALTER TABLE "Realization" ALTER COLUMN "pigEffectSeconds" SET DEFAULT 60;
