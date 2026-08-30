import type { StationType } from './station.types';

export const STATION_TYPES: StationType[] = [
  'quiz',
  'audio-quiz',
  'time',
  'points',
  'wordle',
  'hangman',
  'mastermind',
  'anagram',
  'caesar-cipher',
  'memory',
  'simon',
  'rebus',
  'boggle',
  'mini-sudoku',
  'matching',
  'strong-password',
  'photo-task',
  'qr-hunt',
  'open-quiz',
  'reviewed-answer',
  'true-false',
  'fill-blank',
];
export const COMPLETION_CODE_REGEX = /^[A-Z0-9-]{3,32}$/;
export const QUIZ_ANSWER_COUNT = 4;

export function isStationType(value: unknown): value is StationType {
  return (
    typeof value === 'string' && STATION_TYPES.includes(value as StationType)
  );
}

export function isCompletionCodeRequiredStationType(stationType: StationType) {
  return stationType === 'time' || stationType === 'points';
}

export function isQuizDataStationType(stationType: StationType) {
  return (
    stationType === 'quiz' ||
    stationType === 'audio-quiz' ||
    stationType === 'wordle' ||
    stationType === 'hangman' ||
    stationType === 'mastermind' ||
    stationType === 'anagram' ||
    stationType === 'caesar-cipher' ||
    stationType === 'memory' ||
    stationType === 'simon' ||
    stationType === 'rebus' ||
    stationType === 'boggle' ||
    stationType === 'mini-sudoku' ||
    stationType === 'matching' ||
    stationType === 'strong-password' ||
    stationType === 'open-quiz' ||
    stationType === 'reviewed-answer' ||
    stationType === 'true-false' ||
    stationType === 'fill-blank'
  );
}

export function isWordPuzzleStationType(stationType: StationType) {
  return (
    stationType === 'wordle' ||
    stationType === 'hangman' ||
    stationType === 'mastermind' ||
    stationType === 'anagram' ||
    stationType === 'caesar-cipher' ||
    stationType === 'rebus' ||
    stationType === 'boggle' ||
    stationType === 'memory' ||
    stationType === 'simon' ||
    stationType === 'mini-sudoku' ||
    stationType === 'strong-password'
  );
}

export function isMatchingStationType(stationType: StationType) {
  return stationType === 'matching';
}

export function isQrHuntStationType(stationType: StationType) {
  return stationType === 'qr-hunt';
}

export function isOpenQuizStationType(stationType: StationType) {
  return stationType === 'open-quiz';
}

// An open question whose answer only the Game Master can judge: there is no
// machine-checkable correct answer, so quizData carries the question plus an
// optional answer key shown to the reviewer and never to the team.
export function isReviewedAnswerStationType(stationType: StationType) {
  return stationType === 'reviewed-answer';
}

// A sentence with a gap in it, answered by typing the missing word. Stored and
// checked exactly like an open question — only the presentation differs.
export function isFillBlankStationType(stationType: StationType) {
  return stationType === 'fill-blank';
}

// Four statements, each marked true or false by the team. The verdict for each
// statement rides along in the answer string (see TRUE_FALSE_DELIMITER on the
// admin side) so no extra quizData field is needed.
export function isTrueFalseStationType(stationType: StationType) {
  return stationType === 'true-false';
}

// Separates a true/false statement from its verdict inside one answer slot, the
// same trick matching plays with "left -> right". Keeping the flag out of the
// statement text is what lets the auto-translator rewrite the statement without
// ever touching the answer.
export const TRUE_FALSE_DELIMITER = '::';

export function joinTrueFalseAnswer(statement: string, isTrue: boolean) {
  return `${statement.trim()} ${TRUE_FALSE_DELIMITER} ${isTrue ? 'T' : 'F'}`;
}

export function splitTrueFalseAnswer(value: string) {
  const trimmed = value.trim();
  // Last occurrence, so a statement that itself contains the delimiter still
  // parses — only the trailing flag is structural.
  const markerIndex = trimmed.lastIndexOf(TRUE_FALSE_DELIMITER);
  if (markerIndex < 0) {
    return { statement: '', isTrue: false };
  }

  const flag = trimmed.slice(markerIndex + TRUE_FALSE_DELIMITER.length).trim();
  if (flag !== 'T' && flag !== 'F') {
    return { statement: '', isTrue: false };
  }

  const statement = trimmed.slice(0, markerIndex).trim();
  if (!statement) {
    // A flag with nothing to attach it to is not a usable slot; reporting the
    // verdict anyway would let an empty statement read as deliberately true.
    return { statement: '', isTrue: false };
  }

  return { statement, isTrue: flag === 'T' };
}

export function normalizeTrueFalseAnswer(value: string) {
  const { statement, isTrue } = splitTrueFalseAnswer(value);
  if (!statement) {
    return '';
  }

  return joinTrueFalseAnswer(statement, isTrue);
}

export function normalizeMatchingAnswer(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^(.+?)\s*(?:->|=|:)\s*(.+)$/);
  if (!match) {
    return '';
  }

  const left = match[1].trim();
  const right = match[2].trim();
  if (!left || !right) {
    return '';
  }

  return `${left} -> ${right}`;
}
