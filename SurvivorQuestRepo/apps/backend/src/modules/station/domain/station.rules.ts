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
    stationType === 'matching'
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
    stationType === 'mini-sudoku'
  );
}

export function isMatchingStationType(stationType: StationType) {
  return stationType === 'matching';
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
