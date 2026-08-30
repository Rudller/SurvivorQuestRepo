-- Photo-task cards in Ryzykanci wait for the Game Master's decision, so an
-- attempt can exist without an outcome yet.
ALTER TABLE "RiskAttempt" ALTER COLUMN "isCorrect" DROP NOT NULL;
