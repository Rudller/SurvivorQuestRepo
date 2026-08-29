-- Printed Ryzykanci card codes gained a "RYZYKANCI-" prefix so an operator can
-- tell a pile of deck stickers apart from a pile of normal station qrEntryCode
-- stickers at a glance.
--
-- Rewritten in place rather than regenerated: RiskAttempt and RiskPendingDraw
-- reference RiskCard by id, so deleting and recreating the rows would take the
-- per-team attempt history with them. Prefixing every row uniformly also keeps
-- the (realizationId, code) unique index satisfied.
--
-- The WHERE guard makes this safe to run more than once.
--
-- NOTE: every already-printed card carries the old code and stops resolving in
-- scanCard() after this runs. They have to be reprinted.
UPDATE "RiskCard"
SET "code" = 'RYZYKANCI-' || "code"
WHERE "code" NOT LIKE 'RYZYKANCI-%';
