import { canBuildWordFromLetters, resolveBoggleBoard, resolveBoggleTarget } from "./puzzle-helpers";

describe("resolveBoggleTarget", () => {
  it("keeps all 9 letters of a word that fills the 3x3 board, instead of truncating to 8", () => {
    const station = {
      stationId: "st-boggle-1",
      name: "Boggle",
      quizAnswers: ["Komunikat"],
      quizCorrectAnswerIndex: 0,
    };

    const target = resolveBoggleTarget(station);

    expect(target).toBe("KOMUNIKAT");
    expect(target.length).toBe(9);
  });

  it("produces a board that actually contains every letter of a 9-letter target word", () => {
    const station = {
      stationId: "st-boggle-2",
      name: "Boggle",
      quizAnswers: ["Komunikat"],
      quizCorrectAnswerIndex: 0,
    };

    const target = resolveBoggleTarget(station);
    const board = resolveBoggleBoard(station, target);

    expect(board).toHaveLength(9);
    expect(canBuildWordFromLetters(board, target)).toBe(true);
  });
});
