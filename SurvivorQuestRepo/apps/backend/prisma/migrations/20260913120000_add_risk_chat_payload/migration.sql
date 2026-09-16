-- Structured facts behind a system chat message, so the tablet can word the
-- event feed in its own language instead of showing the Polish `content`.
ALTER TABLE "RiskChatMessage" ADD COLUMN "payload" JSONB;
