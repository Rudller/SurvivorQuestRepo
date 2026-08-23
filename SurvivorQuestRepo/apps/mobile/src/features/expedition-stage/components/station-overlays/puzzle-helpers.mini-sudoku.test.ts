import {
  MINI_SUDOKU_DIFFICULTY_CONFIG,
  resolveMiniSudokuPuzzle,
  type ChallengeDifficulty,
} from "./puzzle-helpers";

const DIFFICULTIES: ChallengeDifficulty[] = ["easy", "medium", "hard"];
const REQUIRED_DIGITS = "123456789";

function countSolutions(given: (string | null)[], limit = 2) {
  const values = given.map((value) => Number(value ?? 0));
  let solutionCount = 0;

  function canPlace(index: number, candidate: number) {
    const row = Math.floor(index / 9);
    const column = index % 9;
    const blockRow = Math.floor(row / 3) * 3;
    const blockColumn = Math.floor(column / 3) * 3;

    for (let offset = 0; offset < 9; offset += 1) {
      if (values[row * 9 + offset] === candidate || values[offset * 9 + column] === candidate) {
        return false;
      }
    }

    for (let rowOffset = 0; rowOffset < 3; rowOffset += 1) {
      for (let columnOffset = 0; columnOffset < 3; columnOffset += 1) {
        if (values[(blockRow + rowOffset) * 9 + blockColumn + columnOffset] === candidate) {
          return false;
        }
      }
    }

    return true;
  }

  function solve() {
    if (solutionCount >= limit) {
      return;
    }

    let bestIndex = -1;
    let bestCandidates: number[] = [];
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] !== 0) {
        continue;
      }

      const candidates = Array.from({ length: 9 }, (_, candidateIndex) => candidateIndex + 1).filter((candidate) =>
        canPlace(index, candidate),
      );
      if (candidates.length === 0) {
        return;
      }
      if (bestIndex === -1 || candidates.length < bestCandidates.length) {
        bestIndex = index;
        bestCandidates = candidates;
      }
    }

    if (bestIndex === -1) {
      solutionCount += 1;
      return;
    }

    for (const candidate of bestCandidates) {
      values[bestIndex] = candidate;
      solve();
      values[bestIndex] = 0;
    }
  }

  solve();
  return solutionCount;
}

describe("resolveMiniSudokuPuzzle", () => {
  it.each(DIFFICULTIES)("builds a valid, uniquely solvable %s puzzle", (difficulty) => {
    const puzzle = resolveMiniSudokuPuzzle(
      { stationId: `sudoku-${difficulty}`, name: "Sudoku" },
      difficulty,
    );

    expect(puzzle.given.filter(Boolean)).toHaveLength(MINI_SUDOKU_DIFFICULTY_CONFIG[difficulty].givenCount);
    expect(puzzle.given).toHaveLength(81);
    expect(puzzle.solution).toHaveLength(81);
    expect(countSolutions(puzzle.given)).toBe(1);

    puzzle.given.forEach((value, index) => {
      if (value) {
        expect(value).toBe(puzzle.solution[index]);
      }
    });

    for (let index = 0; index < 9; index += 1) {
      const row = puzzle.solution.slice(index * 9, index * 9 + 9).sort().join("");
      const column = puzzle.solution.filter((_, cellIndex) => cellIndex % 9 === index).sort().join("");
      const blockRow = Math.floor(index / 3) * 3;
      const blockColumn = (index % 3) * 3;
      const block = Array.from({ length: 9 }, (_, cellIndex) => {
        const rowOffset = Math.floor(cellIndex / 3);
        const columnOffset = cellIndex % 3;
        return puzzle.solution[(blockRow + rowOffset) * 9 + blockColumn + columnOffset];
      }).sort().join("");
      expect(row).toBe(REQUIRED_DIGITS);
      expect(column).toBe(REQUIRED_DIGITS);
      expect(block).toBe(REQUIRED_DIGITS);
    }
  });

  it("does not reuse the old ascending easy board and varies by station", () => {
    const first = resolveMiniSudokuPuzzle({ stationId: "easy-a", name: "Sudoku" }, "easy");
    const second = resolveMiniSudokuPuzzle({ stationId: "easy-b", name: "Sudoku" }, "easy");

    expect(first.solution.slice(0, 9).join("")).not.toBe("123456789");
    expect(first).not.toEqual(second);
    expect(resolveMiniSudokuPuzzle({ stationId: "easy-a", name: "Sudoku" }, "easy")).toEqual(first);
  });
});
