import type { UiLanguage } from "../../../i18n";

export type IntroBlock = {
  kind: "paragraph" | "unordered" | "ordered";
  text: string;
  order?: number;
};

export type IntroInlinePart = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type WordleCellState = "correct" | "present" | "absent";

export type MemoryCard = {
  id: string;
  symbol: string;
  matched: boolean;
  revealed: boolean;
};

export type MatchingPair = {
  left: string;
  right: string;
};

type StationPuzzleViewModel = {
  stationId: string;
  name: string;
  quizQuestion?: string;
  quizAnswers?: readonly string[];
  quizCorrectAnswerIndex?: number;
};

export const WORDLE_MAX_ATTEMPTS = 6;
export const HANGMAN_MAX_MISSES = 7;
export const MASTERMIND_MAX_ATTEMPTS = 8;
export const TEXT_PUZZLE_MAX_ATTEMPTS = 3;
export const MEMORY_MAX_MISTAKES = 7;
export const NUMERIC_PINPAD_LAYOUT = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "backspace",
  "0",
  "submit",
] as const;
export const NUMERIC_PINPAD_SUBLABELS: Record<string, string> = {
  "0": "+",
  "1": "",
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
};
export const QUIZ_BRAIN_ICON_URI =
  "https://cdn-icons-png.flaticon.com/512/5677/5677920.png";

const BOGGLE_BOARD_SIZE = 9;
export const MASTERMIND_SYMBOLS = ["A", "B", "C", "D", "E", "F"] as const;
const BOGGLE_FILLER_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MEMORY_SYMBOL_POOL = ["🍀", "🔥", "💧", "🌙", "⭐", "⚡", "🎯", "🧭"];
const CAESAR_SECRET_FALLBACKS = [
  "SURVIVOR QUEST",
  "TEAM SPIRIT",
  "FIELD MISSION",
  "TRAIL CHALLENGE",
] as const;
export const SIMON_BUTTONS = [
  { id: "1", label: "1", color: "#ef4444" },
  { id: "2", label: "2", color: "#f97316" },
  { id: "3", label: "3", color: "#eab308" },
  { id: "4", label: "4", color: "#22c55e" },
  { id: "5", label: "5", color: "#14b8a6" },
  { id: "6", label: "6", color: "#3b82f6" },
  { id: "7", label: "7", color: "#6366f1" },
  { id: "8", label: "8", color: "#a855f7" },
  { id: "9", label: "9", color: "#ec4899" },
] as const;
const MINI_SUDOKU_PUZZLES = [
  {
    given: ["1", null, "2", null] as (string | null)[],
    solution: ["1", "2", "2", "1"] as string[],
  },
  {
    given: [null, "1", null, "2"] as (string | null)[],
    solution: ["2", "1", "1", "2"] as string[],
  },
];
export const HANGMAN_ALPHABET = [
  "A",
  "Ą",
  "B",
  "C",
  "Ć",
  "D",
  "E",
  "Ę",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "Ł",
  "M",
  "N",
  "Ń",
  "O",
  "Ó",
  "P",
  "Q",
  "R",
  "S",
  "Ś",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "Ź",
  "Ż",
];
const WORDLE_FALLBACK_SECRET = "SURVIVOR";
const HANGMAN_FALLBACK_SECRET = "SURVIVOR QUEST";
const INVALID_COMPLETION_CODE_MARKERS = [
  "invalid completion code",
  "http 400",
];

const MATCHING_FALLBACK_PAIRS_ENGLISH: MatchingPair[] = [
  { left: "Compass", right: "Navigation" },
  { left: "Flashlight", right: "Light" },
  { left: "Map", right: "Orientation" },
];

const MATCHING_FALLBACK_PAIRS_UKRAINIAN: MatchingPair[] = [
  { left: "Компас", right: "Навігація" },
  { left: "Ліхтарик", right: "Світло" },
  { left: "Мапа", right: "Орієнтування" },
];

const MATCHING_FALLBACK_PAIRS_RUSSIAN: MatchingPair[] = [
  { left: "Компас", right: "Навигация" },
  { left: "Фонарик", right: "Свет" },
  { left: "Карта", right: "Ориентирование" },
];

const MATCHING_FALLBACK_PAIRS: Record<UiLanguage, MatchingPair[]> = {
  polish: [
    { left: "Kompas", right: "Nawigacja" },
    { left: "Latarka", right: "Światło" },
    { left: "Mapa", right: "Orientacja" },
  ],
  english: MATCHING_FALLBACK_PAIRS_ENGLISH,
  ukrainian: MATCHING_FALLBACK_PAIRS_UKRAINIAN,
  russian: MATCHING_FALLBACK_PAIRS_RUSSIAN,
};

export function normalizeWordleSecret(value: string) {
  return value.toUpperCase().replace(/[^A-ZĄĆĘŁŃÓŚŹŻ0-9]/g, "");
}

export function normalizeHangmanSecret(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-ZĄĆĘŁŃÓŚŹŻ0-9 -]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveCorrectAnswerText(station: StationPuzzleViewModel) {
  const answers = station.quizAnswers ?? [];
  const correctIndex = station.quizCorrectAnswerIndex ?? -1;
  if (correctIndex >= 0 && correctIndex < answers.length) {
    return (answers[correctIndex] ?? "").trim();
  }

  return answers.find((answer) => answer.trim().length > 0)?.trim() ?? "";
}

export function resolveSeed(text: string) {
  return Array.from(text).reduce((accumulator, character, index) => {
    return accumulator + character.charCodeAt(0) * (index + 1);
  }, 0);
}

export function shuffleDeterministic<T>(items: T[], seedText: string) {
  const values = [...items];
  let seed = Math.max(1, resolveSeed(seedText));
  for (let index = values.length - 1; index > 0; index -= 1) {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    const swapIndex = seed % (index + 1);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }

  return values;
}

export function scrambleWord(word: string, seedText: string) {
  const normalized = normalizeWordleSecret(word);
  if (normalized.length < 2) {
    return normalized;
  }

  const shuffled = shuffleDeterministic(
    Array.from(normalized),
    seedText,
  ).join("");
  if (shuffled !== normalized) {
    return shuffled;
  }

  return `${normalized.slice(1)}${normalized[0]}`;
}

export function buildMastermindFeedback(guess: string, secret: string) {
  const guessChars = Array.from(guess);
  const secretChars = Array.from(secret);
  let exact = 0;
  const unmatchedGuess: string[] = [];
  const unmatchedSecret = new Map<string, number>();

  secretChars.forEach((symbol, index) => {
    if (guessChars[index] === symbol) {
      exact += 1;
      return;
    }

    unmatchedGuess.push(guessChars[index] ?? "");
    unmatchedSecret.set(symbol, (unmatchedSecret.get(symbol) ?? 0) + 1);
  });

  let misplaced = 0;
  unmatchedGuess.forEach((symbol) => {
    const available = unmatchedSecret.get(symbol) ?? 0;
    if (available > 0) {
      misplaced += 1;
      unmatchedSecret.set(symbol, available - 1);
    }
  });

  return { exact, misplaced };
}

export function resolveMastermindSecret(station: StationPuzzleViewModel) {
  const source = resolveCorrectAnswerText(station) || station.name;
  const normalized = source.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) {
    return "ABCD";
  }

  return Array.from({ length: 4 }, (_, index) => {
    const character = normalized[index % normalized.length];
    const charCode = character.charCodeAt(0);
    return MASTERMIND_SYMBOLS[charCode % MASTERMIND_SYMBOLS.length];
  }).join("");
}

export function normalizePuzzleText(value: string) {
  return value.toUpperCase().replace(/\s+/g, " ").trim();
}

export function normalizePuzzleWord(value: string) {
  return normalizeWordleSecret(value);
}

export function caesarShift(value: string, shift: number) {
  const A = "A".charCodeAt(0);
  const Z = "Z".charCodeAt(0);
  return Array.from(value.toUpperCase())
    .map((character) => {
      const code = character.charCodeAt(0);
      if (code < A || code > Z) {
        return character;
      }

      const shifted = ((code - A + shift + 26 * 2) % 26) + A;
      return String.fromCharCode(shifted);
    })
    .join("");
}

export function resolveCaesarShift(station: StationPuzzleViewModel) {
  // Deterministic random shift per station so the challenge is reproducible within a session.
  return (resolveSeed(`${station.stationId}-caesar-shift`) % 25) + 1;
}

export function resolveCaesarSecret(station: StationPuzzleViewModel) {
  const directAnswer = normalizePuzzleText(resolveCorrectAnswerText(station));
  if (directAnswer.length > 0) {
    return directAnswer;
  }

  const fallbackIndex = resolveSeed(`${station.stationId}-caesar-secret`) % CAESAR_SECRET_FALLBACKS.length;
  return CAESAR_SECRET_FALLBACKS[fallbackIndex];
}

export function resolveMemoryDeck(station: StationPuzzleViewModel): MemoryCard[] {
  const symbols = shuffleDeterministic(MEMORY_SYMBOL_POOL, station.stationId).slice(
    0,
    3,
  );
  const cards = shuffleDeterministic(
    symbols.flatMap((symbol, index) => [
      {
        id: `${station.stationId}-${index}-a`,
        symbol,
        matched: false,
        revealed: false,
      },
      {
        id: `${station.stationId}-${index}-b`,
        symbol,
        matched: false,
        revealed: false,
      },
    ]),
    `${station.stationId}-deck`,
  );
  return cards;
}

export function resolveSimonSequence(station: StationPuzzleViewModel) {
  const sequenceFromQuestion =
    station.quizQuestion
      ?.match(/[1-9]/g)
      ?.map((token) => token.trim())
      .filter((token) => token.length > 0) ?? [];

  if (sequenceFromQuestion.length === 10) {
    return sequenceFromQuestion;
  }

  const seed = resolveSeed(station.stationId);
  return Array.from(
    { length: 10 },
    (_, index) => SIMON_BUTTONS[(seed + index * 7) % SIMON_BUTTONS.length].id,
  );
}

export function resolveBoggleTarget(station: StationPuzzleViewModel) {
  const source = resolveCorrectAnswerText(station) || station.name;
  const normalized = normalizePuzzleWord(source);
  if (normalized.length >= 3) {
    return normalized.slice(0, 8);
  }

  return "TEAM";
}

export function resolveBoggleBoard(
  station: StationPuzzleViewModel,
  targetWord: string,
) {
  const board = Array.from({ length: BOGGLE_BOARD_SIZE }, (_, index) => {
    const nextIndex =
      (resolveSeed(`${station.stationId}-${targetWord}-${index}`) + index) %
      BOGGLE_FILLER_LETTERS.length;
    return BOGGLE_FILLER_LETTERS[nextIndex] ?? "A";
  });
  const placementPath = [0, 1, 2, 5, 8, 7, 6, 3, 4];
  Array.from(targetWord)
    .slice(0, placementPath.length)
    .forEach((letter, index) => {
      const boardIndex = placementPath[index] ?? index;
      board[boardIndex] = letter;
    });

  return board;
}

export function canBuildWordFromLetters(board: string[], word: string) {
  const availability = new Map<string, number>();
  board.forEach((letter) => {
    availability.set(letter, (availability.get(letter) ?? 0) + 1);
  });

  for (const letter of Array.from(word)) {
    const remaining = availability.get(letter) ?? 0;
    if (remaining <= 0) {
      return false;
    }
    availability.set(letter, remaining - 1);
  }
  return true;
}

export function canTraceWordOnBoggle(board: string[], targetWord: string) {
  const side = Math.sqrt(board.length);
  const word = Array.from(targetWord);
  if (!Number.isInteger(side) || word.length === 0) {
    return false;
  }

  const directions = [-1, 0, 1];
  const visited = new Set<number>();

  const walk = (cellIndex: number, wordIndex: number): boolean => {
    if (board[cellIndex] !== word[wordIndex]) {
      return false;
    }
    if (wordIndex === word.length - 1) {
      return true;
    }

    visited.add(cellIndex);
    const row = Math.floor(cellIndex / side);
    const col = cellIndex % side;

    for (const rowOffset of directions) {
      for (const colOffset of directions) {
        if (rowOffset === 0 && colOffset === 0) {
          continue;
        }

        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;
        if (
          nextRow < 0 ||
          nextCol < 0 ||
          nextRow >= side ||
          nextCol >= side
        ) {
          continue;
        }

        const nextIndex = nextRow * side + nextCol;
        if (visited.has(nextIndex)) {
          continue;
        }

        if (walk(nextIndex, wordIndex + 1)) {
          visited.delete(cellIndex);
          return true;
        }
      }
    }

    visited.delete(cellIndex);
    return false;
  };

  return board.some((_, index) => walk(index, 0));
}

export function resolveMiniSudokuPuzzle(station: StationPuzzleViewModel) {
  const index = resolveSeed(station.stationId) % MINI_SUDOKU_PUZZLES.length;
  return MINI_SUDOKU_PUZZLES[index];
}

export function resolveMatchingPairs(
  station: StationPuzzleViewModel,
  uiLanguage: UiLanguage = "polish",
): MatchingPair[] {
  const parsedPairs = (station.quizAnswers ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const match = entry.match(/^(.+?)\s*(?:->|=|:)\s*(.+)$/);
      if (!match) {
        return null;
      }
      return { left: match[1].trim(), right: match[2].trim() };
    })
    .filter(
      (entry): entry is MatchingPair =>
        Boolean(entry?.left) && Boolean(entry?.right),
    );

  if (parsedPairs.length >= 2) {
    return parsedPairs;
  }

  return MATCHING_FALLBACK_PAIRS[uiLanguage];
}

export function resolvePuzzleSecret(
  station: StationPuzzleViewModel,
  stationType: "wordle" | "hangman",
) {
  const answers = station.quizAnswers ?? [];
  const correctIndex = station.quizCorrectAnswerIndex ?? -1;
  const correctAnswer =
    correctIndex >= 0 && correctIndex < answers.length
      ? (answers[correctIndex] ?? "")
      : "";
  const firstAvailableAnswer =
    answers.find((answer) => answer.trim().length > 0) ?? "";
  const source = correctAnswer || firstAvailableAnswer || station.name;

  const normalizedSource =
    stationType === "wordle"
      ? normalizeWordleSecret(source)
      : normalizeHangmanSecret(source);
  if (normalizedSource.length > 0) {
    return normalizedSource;
  }

  return stationType === "wordle"
    ? WORDLE_FALLBACK_SECRET
    : HANGMAN_FALLBACK_SECRET;
}

export function buildWordleEvaluation(
  guess: string,
  secret: string,
): WordleCellState[] {
  const letters = Array.from(secret);
  const evaluation: WordleCellState[] = Array.from(
    { length: letters.length },
    () => "absent",
  );
  const remainingByLetter = new Map<string, number>();

  letters.forEach((letter, index) => {
    if (guess[index] === letter) {
      evaluation[index] = "correct";
      return;
    }

    remainingByLetter.set(letter, (remainingByLetter.get(letter) ?? 0) + 1);
  });

  Array.from(guess).forEach((letter, index) => {
    if (evaluation[index] === "correct") {
      return;
    }

    const remaining = remainingByLetter.get(letter) ?? 0;
    if (remaining <= 0) {
      return;
    }

    evaluation[index] = "present";
    remainingByLetter.set(letter, remaining - 1);
  });

  return evaluation;
}

export function isGuessableHangmanCharacter(value: string) {
  return /^[A-ZĄĆĘŁŃÓŚŹŻ0-9]$/.test(value);
}

export function parseIntroBlocks(rawText: string): IntroBlock[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  return lines.map((line) => {
    const unorderedMatch = /^[-*]\s+(.*)$/.exec(line);
    if (unorderedMatch) {
      return { kind: "unordered", text: unorderedMatch[1].trim() };
    }

    const orderedMatch = /^(\d+)\.\s+(.*)$/.exec(line);
    if (orderedMatch) {
      return {
        kind: "ordered",
        order: Number(orderedMatch[1]),
        text: orderedMatch[2].trim(),
      };
    }

    return { kind: "paragraph", text: line.trim() };
  });
}

export function parseIntroInline(text: string): IntroInlinePart[] {
  const tokenPattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts: IntroInlinePart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index) });
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push({ text: token.slice(1, -1), italic: true });
    } else {
      parts.push({ text: token });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts;
}

export function isInvalidCompletionCodeErrorMessage(value: string | null) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return false;
  }

  return INVALID_COMPLETION_CODE_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
}

export function formatRemainingTimeLabel(seconds: number) {
  if (seconds <= 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const safe =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
    return null;
  }

  const numeric = Number.parseInt(safe, 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

export function blendHexColors(from: string, to: string, ratio: number) {
  const fromRgb = hexToRgb(from);
  const toRgb = hexToRgb(to);
  const t = clamp01(ratio);
  if (!fromRgb || !toRgb) {
    return t >= 0.5 ? to : from;
  }

  const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * t);
  const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * t);
  const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
