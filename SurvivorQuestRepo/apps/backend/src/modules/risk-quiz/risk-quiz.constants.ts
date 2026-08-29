import { RiskDifficulty, StationType } from '@prisma/client';

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

// Marks a printed Ryzykanci card apart from a normal station's qrEntryCode
// sticker. Nothing in scanCard() needs it — codes are only ever matched inside
// one realization's Ryzykanci deck — but the two kinds of stickers get printed
// and sorted by hand, and the prefix is what tells the piles apart.
export const RISK_CARD_CODE_PREFIX = 'RYZYKANCI';

/**
 * The one place the printed card code format is defined. Codes are
 * deterministic from (category slug, difficulty, index) so the same physical
 * sticker stays valid across every realization reusing that category — which
 * also lets the scheme library render them without any RiskCard row existing.
 *
 * Always uppercase: scanCard() uppercases whatever it scans before matching,
 * so a stored lowercase code could never match.
 */
export function buildRiskCardCode(
  categorySlug: string,
  difficulty: RiskDifficulty,
  index: number,
): string {
  return `${RISK_CARD_CODE_PREFIX}-${categorySlug}-${RISK_DIFFICULTY_SLUG[difficulty]}-${index}`.toUpperCase();
}

// Duplicate physical QR cards generated per (category, difficulty) pool, so
// several teams can draw from the same pool in parallel.
export const RISK_CARDS_PER_POOL = 10;

// Consecutive-correct-answer bonus: the "correct" points in
// RISK_DIFFICULTY_POINTS get multiplied by 1 + STEP per streak beyond the
// first correct answer, capped at CAP. Wrong/give-up answers always reset
// the streak to 0 and are never scaled (the penalty stays flat).
export const RISK_STREAK_MULTIPLIER_STEP = 0.25;
export const RISK_STREAK_MULTIPLIER_CAP = 2;

// Station types a Ryzykanci deck never carries. The whole game runs at tables in
// a single conference room: a card is drawn, solved against a countdown and
// handed back within a minute or two. That rules out the long-sitting puzzles (a
// whole sudoku grid, a full mastermind ladder, a boggle sweep) and the slow,
// quiet ones (memory's flip cycle, simon's audio sequence) — and QR_HUNT, which
// sends a team walking between stickers spread around a venue nobody leaves
// here (it also has no working wiring on the Ryzykanci screen).
// The admin pickers already hide these; this is the guard behind that.
export const RISK_EXCLUDED_STATION_TYPES = new Set<StationType>([
  StationType.MINI_SUDOKU,
  StationType.MASTERMIND,
  StationType.BOGGLE,
  StationType.MEMORY,
  StationType.SIMON,
  StationType.QR_HUNT,
]);
