import type {
  StationTestType,
  StationTestViewModel,
} from "../../expedition-stage/components/station-overlays/types";
import { resolveRiskCorrectAnswer } from "./risk-quiz-correct-answer";

function station(
  stationType: StationTestType,
  overrides: Partial<StationTestViewModel> = {},
): StationTestViewModel {
  return {
    stationId: "station-1",
    stationType,
    name: "Zadanie",
    typeLabel: stationType,
    description: "",
    imageUrl: "",
    points: 0,
    timeLimitSeconds: 60,
    timeLimitLabel: "1:00",
    quizAnswers: ["Kraków", "Gniezno", "Poznań", "Płock"],
    quizCorrectAnswerIndex: 1,
    status: "todo",
    startedAt: null,
    ...overrides,
  };
}

describe("resolveRiskCorrectAnswer", () => {
  it("names the quiz answer the server graded against", () => {
    expect(resolveRiskCorrectAnswer(station("quiz"), 2)).toEqual({ kind: "answer", text: "Poznań" });
    expect(resolveRiskCorrectAnswer(station("audio-quiz"), 0)).toEqual({ kind: "answer", text: "Kraków" });
  });

  it("falls back to the station's own key when the server sent no index", () => {
    expect(resolveRiskCorrectAnswer(station("quiz"))).toEqual({ kind: "answer", text: "Gniezno" });
  });

  it("gives the expected answer of an open question", () => {
    expect(resolveRiskCorrectAnswer(station("open-quiz"))).toEqual({ kind: "answer", text: "Gniezno" });
  });

  it("reveals the secret of word puzzles in the form the panel checked", () => {
    const secretStation = { quizAnswers: ["Przygoda", "", "", ""] as [string, string, string, string], quizCorrectAnswerIndex: 0 };
    expect(resolveRiskCorrectAnswer(station("wordle", secretStation))).toEqual({ kind: "secret", text: "PRZYGODA" });
    expect(resolveRiskCorrectAnswer(station("hangman", secretStation))).toEqual({ kind: "secret", text: "PRZYGODA" });
    expect(resolveRiskCorrectAnswer(station("anagram", secretStation))).toEqual({ kind: "secret", text: "PRZYGODA" });
  });

  it("has nothing to reveal for code, photo, reviewed and pairing cards", () => {
    for (const type of ["time", "points", "photo-task", "reviewed-answer", "matching", "true-false"] as const) {
      expect(resolveRiskCorrectAnswer(station(type))).toBeNull();
    }
  });
});
