import { resolveFailureOutcomeMessage, resolveSuccessOutcomeMessage } from "./preview";
import { createStation } from "./station-panels/station-smoke.fixtures";
import type { StationTestType } from "./types";

// preview.tsx mounts audio hooks at module scope via its imports; this file
// only calls two pure functions out of it, but the import still pulls the tree.
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn() })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// Characterization table for the two outcome-message ladders in preview.tsx
// (~15 `if` branches each), captured BEFORE they move into the station
// registry. The registry will carry these as `outcome: { success, failure }`
// per station type; this test is the proof that the move changed no wording.
//
// Instead of a hand-written expected string per case — which would only
// restate the implementation — the `text` dictionary is a Proxy returning each
// key's own name. The resolver's return value is therefore the KEY it picked,
// and the table below reads as "which text key does this station type get".
//
// Two asymmetries are deliberately pinned, because they look like oversights
// and a well-meaning refactor would "fix" them into a regression:
//   - success has a time/points branch, failure does NOT (falls to outcomeFailed)
//   - failure has a photo-task branch, success does NOT (falls to quizSuccessPopup)

type TextDictionary = Parameters<typeof resolveSuccessOutcomeMessage>[1];

const TEXT_KEYS = new Proxy(
  {},
  { get: (_target, property) => String(property) },
) as unknown as TextDictionary;

function successKeyFor(stationType: StationTestType) {
  return resolveSuccessOutcomeMessage(createStation({ stationType }), TEXT_KEYS);
}

function failureKeyFor(stationType: StationTestType) {
  return resolveFailureOutcomeMessage(createStation({ stationType }), TEXT_KEYS);
}

const OUTCOME_TABLE: [StationTestType, string, string][] = [
  // type                success key                failure key
  ["wordle", "wordleSolvedPopup", "wordleFailedPopup"],
  ["hangman", "hangmanSolvedPopup", "hangmanFailedPopup"],
  ["mastermind", "mastermindSolvedPopup", "mastermindFailedPopup"],
  ["anagram", "anagramSolvedPopup", "anagramFailedPopup"],
  ["caesar-cipher", "caesarSolvedPopup", "caesarFailedPopup"],
  ["memory", "memorySolvedPopup", "memoryFailedPopup"],
  ["simon", "simonSolvedPopup", "simonFailedPopup"],
  ["rebus", "rebusSolvedPopup", "rebusFailedPopup"],
  ["open-quiz", "openQuizSolvedPopup", "openQuizFailedPopup"],
  ["fill-blank", "openQuizSolvedPopup", "openQuizFailedPopup"],
  ["true-false", "trueFalseSolvedPopup", "trueFalseFailedPopup"],
  ["boggle", "boggleSolvedPopup", "boggleFailedPopup"],
  ["mini-sudoku", "miniSudokuSolvedPopup", "miniSudokuFailedPopup"],
  ["matching", "matchingSolvedPopup", "matchingFailedPopup"],
  ["time", "codeApproved", "outcomeFailed"],
  ["points", "codeApproved", "outcomeFailed"],
  ["photo-task", "quizSuccessPopup", "photoTaskRejectedPopup"],
  ["quiz", "quizSuccessPopup", "outcomeFailed"],
  ["audio-quiz", "quizSuccessPopup", "outcomeFailed"],
  ["qr-hunt", "quizSuccessPopup", "outcomeFailed"],
  ["strong-password", "quizSuccessPopup", "outcomeFailed"],
  ["reviewed-answer", "quizSuccessPopup", "outcomeFailed"],
];

describe("station outcome messages", () => {
  it.each(OUTCOME_TABLE)("%s resolves to %s / %s", (stationType, successKey, failureKey) => {
    expect(successKeyFor(stationType)).toBe(successKey);
    expect(failureKeyFor(stationType)).toBe(failureKey);
  });

  it("covers every station type", () => {
    // Guards the table against drifting out of date: a new StationTestType
    // added without a row here means its outcome wording was never pinned,
    // and the registry migration would move it blind.
    const covered = OUTCOME_TABLE.map(([stationType]) => stationType);
    const allTypes: StationTestType[] = [
      "quiz",
      "audio-quiz",
      "time",
      "points",
      "wordle",
      "hangman",
      "mastermind",
      "anagram",
      "caesar-cipher",
      "memory",
      "simon",
      "rebus",
      "boggle",
      "mini-sudoku",
      "matching",
      "strong-password",
      "photo-task",
      "qr-hunt",
      "open-quiz",
      "reviewed-answer",
      "true-false",
      "fill-blank",
    ];

    expect([...covered].sort()).toEqual([...allTypes].sort());
  });

  it("keeps fill-blank reporting with the open-quiz wording", () => {
    // fill-blank runs the open-quiz flow end to end. If the registry migration
    // gives it its own entry, this is the line that catches the divergence.
    expect(successKeyFor("fill-blank")).toBe(successKeyFor("open-quiz"));
    expect(failureKeyFor("fill-blank")).toBe(failureKeyFor("open-quiz"));
  });
});
