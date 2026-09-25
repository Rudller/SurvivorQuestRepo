import { RiskDifficulty, RiskPigType, StationType } from '@prisma/client';

export const RISK_DIFFICULTY_ORDER: RiskDifficulty[] = [
  RiskDifficulty.EASY,
  RiskDifficulty.MEDIUM,
  RiskDifficulty.HARD,
];

export const RISK_DIFFICULTY_POINTS: Record<
  RiskDifficulty,
  { correct: number; incorrect: number }
> = {
  EASY: { correct: 10, incorrect: -2 },
  MEDIUM: { correct: 20, incorrect: -10 },
  HARD: { correct: 40, incorrect: -30 },
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
 * Kod karty bez numeru — to, co pula ma zanim dopisze się `-1…-10`.
 * Kategoria może go nadpisać per poziom (RiskCategory.cardCodePrefixes), bo
 * wydrukowane karty nie zawsze trzymają się naszego formatu: pierwszy nakład
 * miał na średnich kartach "SREDNE", a przedruk 12 kompletów po 150 kart
 * kosztuje więcej niż jedno pole w adminie.
 */
export function defaultRiskCardCodePrefix(
  categorySlug: string,
  difficulty: RiskDifficulty,
): string {
  return `${RISK_CARD_CODE_PREFIX}-${categorySlug}-${RISK_DIFFICULTY_SLUG[difficulty]}`.toUpperCase();
}

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
  prefixOverride?: string | null,
): string {
  const prefix =
    prefixOverride || defaultRiskCardCodePrefix(categorySlug, difficulty);
  return `${prefix}-${index}`.toUpperCase();
}

export type RiskCardCodePrefixes = Partial<Record<RiskDifficulty, string>>;

// Litery, cyfry i pojedyncze myślniki między nimi — to samo, co daje
// defaultRiskCardCodePrefix, więc nadpisanie nie wprowadza znaków, których
// skaner albo drukarnia wcześniej nie widziały.
const RISK_CARD_CODE_PREFIX_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

/**
 * Normalizuje prefiks wpisany w adminie. Pusty oznacza powrót do formatu
 * domyślnego (null), niepoprawny — null z flagą, żeby wywołujący mógł
 * odróżnić "wyczyść" od "odrzuć".
 */
export function normalizeRiskCardCodePrefix(
  raw: string,
): { ok: true; value: string | null } | { ok: false } {
  const value = raw.trim().toUpperCase().replace(/-+$/, '');
  if (!value) {
    return { ok: true, value: null };
  }
  return RISK_CARD_CODE_PREFIX_PATTERN.test(value)
    ? { ok: true, value }
    : { ok: false };
}

/** Odczyt kolumny JSON — wszystko, co nie jest poprawnym prefiksem, odpada. */
export function readRiskCardCodePrefixes(raw: unknown): RiskCardCodePrefixes {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const source = raw as Record<string, unknown>;
  const result: RiskCardCodePrefixes = {};
  for (const difficulty of RISK_DIFFICULTY_ORDER) {
    const value = source[difficulty];
    if (typeof value !== 'string') continue;
    const normalized = normalizeRiskCardCodePrefix(value);
    if (normalized.ok && normalized.value) {
      result[difficulty] = normalized.value;
    }
  }
  return result;
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

// Upper bound on a reviewed-answer card's free-text answer. Generous enough for
// the "name three causes of..." answers these cards are for, small enough that
// the Game Master's review panel stays readable and a stuck key can't fill the
// column with megabytes.
export const RISK_REVIEWED_ANSWER_MAX_LENGTH = 2000;

// --- Świnie ---

// Fraction of the field that gets a pig on every grant tick, taken from the
// bottom of the table. This is what makes the mechanic a catch-up one: the
// teams having a bad time get the ammunition.
export const RISK_PIG_WEAKEST_FRACTION = 1 / 4;

// One extra pig per tick on top of the bottom slice, handed to whoever has
// received the fewest so far. Looks like pure luck from the outside, but it is
// what guarantees a team that is never in the bottom quarter still gets to
// throw one before the game ends.
export const RISK_PIG_WILDCARD_COUNT = 1;

// Wording for every pig, kept next to the enum so adding a type is one edit in
// each of two places rather than a hunt across the codebase.
export const RISK_PIG_LABELS: Record<RiskPigType, string> = {
  FLASHLIGHT: 'Latarka',
  UPSIDE_DOWN: 'Do góry nogami',
  SHAKE: 'Trzęsienie',
  FOG: 'Mgła',
  DARKNESS: 'Ciemność',
  OVERHEAD: 'Nad głową',
  MIRROR: 'Lustro',
  SLIDE: 'Ślizg',
  SILENCE: 'Cisza',
};

export const RISK_PIG_TYPES = Object.keys(RISK_PIG_LABELS) as RiskPigType[];

// Upper bound on one chat message. Deliberately far below the reviewed-answer
// ceiling: this is a room people talk in, not a place to paste an essay, and a
// runaway message would push everything else off a tablet screen.
export const RISK_CHAT_MESSAGE_MAX_LENGTH = 500;

// How much history a tablet gets when it opens the room for the first time.
// Later polls ask for everything after the newest id they already hold, so this
// only bounds the cold start.
export const RISK_CHAT_HISTORY_LIMIT = 50;

// Cold-start depth of the event feed the tablet shows under its top bar. It
// renders a handful of lines, so this only needs to cover what a tablet that
// joins late should catch up on.
export const RISK_FEED_HISTORY_LIMIT = 20;

// Event codes carried in RiskChatMessage.systemEvent. The wording lives in
// buildSystemMessageContent for now; keeping the code separate is what lets the
// text move to the client for translation later without touching stored rows.
export const RISK_CHAT_SYSTEM_EVENTS = {
  gameStart: 'game-start',
  gameEnd: 'game-end',
  leadChange: 'lead-change',
  deckExhausted: 'deck-exhausted',
  pigThrown: 'pig-thrown',
  cardScored: 'card-scored',
} as const;

// Shown in place of a team name when a team was removed or never named.
export function resolveRiskTeamDisplayName(team: {
  name: string | null;
  slotNumber: number;
}) {
  return team.name?.trim() || `Drużyna ${team.slotNumber}`;
}

// Station types a Ryzykanci deck never carries. The whole game runs at tables in
// a single conference room: a card is drawn, solved against a countdown and
// handed back within a minute or two. That rules out the long-sitting puzzles (a
// whole sudoku grid, a full mastermind ladder, a boggle sweep) and the slow,
// quiet ones (memory's flip cycle, simon's audio sequence) — and QR_HUNT, which
// sends a team walking between stickers spread around a venue nobody leaves
// here (it also has no working wiring on the Ryzykanci screen). REBUS and
// STRONG_PASSWORD are excluded by choice, not by a technical limit, and so is
// CAESAR_CIPHER (2026-09-25: nie pasuje do tempa gry przy stole).
// The admin pickers already hide these; this is the guard behind that.
export const RISK_EXCLUDED_STATION_TYPES = new Set<StationType>([
  StationType.CAESAR_CIPHER,
  StationType.MINI_SUDOKU,
  StationType.MASTERMIND,
  StationType.BOGGLE,
  StationType.MEMORY,
  StationType.SIMON,
  StationType.QR_HUNT,
  StationType.REBUS,
  StationType.STRONG_PASSWORD,
]);
