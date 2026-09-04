-- Two new pigs: Lustro (MIRROR) and Ślizg (SLIDE).
--
-- Only additive, so unlike the DARKNESS migration the type is not rebuilt: adding
-- a value leaves every existing row and the column default alone. Postgres allows
-- ALTER TYPE ... ADD VALUE inside a transaction as long as the new value is not
-- itself used before the transaction commits, which is the case here.
--
-- IF NOT EXISTS keeps this repeatable against a database where somebody added a
-- value by hand while testing.
ALTER TYPE "RiskPigType" ADD VALUE IF NOT EXISTS 'MIRROR';
ALTER TYPE "RiskPigType" ADD VALUE IF NOT EXISTS 'SLIDE';
