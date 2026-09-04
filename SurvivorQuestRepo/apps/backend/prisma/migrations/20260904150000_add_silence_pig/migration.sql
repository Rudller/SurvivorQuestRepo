-- Cisza (SILENCE): the screen is readable only while the team keeps quiet.
--
-- Its own migration rather than an edit to the one before it: that one had
-- already been applied, and Prisma checksums applied migrations — rewriting one
-- in place splits the local history from the database's.
ALTER TYPE "RiskPigType" ADD VALUE IF NOT EXISTS 'SILENCE';
