-- Oprawa scenariusza (kopiowana do realizacji przy jej tworzeniu).
ALTER TABLE "Scenario" ADD COLUMN "themePack" "RealizationThemePack" NOT NULL DEFAULT 'STANDARD';
