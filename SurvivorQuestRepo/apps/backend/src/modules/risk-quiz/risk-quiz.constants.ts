import { RiskDifficulty } from '@prisma/client';

export const RISK_DIFFICULTY_ORDER: RiskDifficulty[] = [
  RiskDifficulty.EASY,
  RiskDifficulty.MEDIUM,
  RiskDifficulty.HARD,
];

export const RISK_DIFFICULTY_POINTS: Record<
  RiskDifficulty,
  { correct: number; incorrect: number }
> = {
  EASY: { correct: 10, incorrect: -5 },
  MEDIUM: { correct: 20, incorrect: -10 },
  HARD: { correct: 30, incorrect: -15 },
};

export const RISK_DIFFICULTY_SLUG: Record<RiskDifficulty, string> = {
  EASY: 'latwe',
  MEDIUM: 'srednie',
  HARD: 'trudne',
};

// Duplicate physical QR cards generated per (category, difficulty) pool, so
// several teams can draw from the same pool in parallel.
export const RISK_CARDS_PER_POOL = 10;

// Consecutive-correct-answer bonus: the "correct" points in
// RISK_DIFFICULTY_POINTS get multiplied by 1 + STEP per streak beyond the
// first correct answer, capped at CAP. Wrong/give-up answers always reset
// the streak to 0 and are never scaled (the penalty stays flat).
export const RISK_STREAK_MULTIPLIER_STEP = 0.25;
export const RISK_STREAK_MULTIPLIER_CAP = 2;
