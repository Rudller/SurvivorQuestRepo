import type { ExpeditionCaseFile, ExpeditionTask } from "../model/types";
import {
  countUnlockedCaseFiles,
  resolveUnlockStationNumber,
  sortCaseFiles,
} from "./case-files.model";

function caseFile(overrides: Partial<ExpeditionCaseFile> = {}): ExpeditionCaseFile {
  return {
    id: "c-1",
    kind: "text",
    locked: false,
    order: 0,
    unlockStationId: null,
    ...overrides,
  };
}

describe("sortCaseFiles", () => {
  it("układa dowody w kolejności ustalonej przez admina", () => {
    const sorted = sortCaseFiles([
      caseFile({ id: "c-3", order: 2 }),
      caseFile({ id: "c-1", order: 0 }),
      caseFile({ id: "c-2", order: 1 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["c-1", "c-2", "c-3"]);
  });

  it("rozstrzyga remis identyfikatorem, żeby teczka nie mrugała", () => {
    // Dwa dowody o tym samym `order` bez stabilnego rozstrzygnięcia zamieniałyby
    // się miejscami między kolejnymi odpytaniami stanu sesji.
    const first = sortCaseFiles([
      caseFile({ id: "c-b", order: 1 }),
      caseFile({ id: "c-a", order: 1 }),
    ]);
    const second = sortCaseFiles([
      caseFile({ id: "c-a", order: 1 }),
      caseFile({ id: "c-b", order: 1 }),
    ]);

    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
  });

  it("nie rusza tablicy wejściowej", () => {
    const input = [caseFile({ id: "c-2", order: 1 }), caseFile({ id: "c-1", order: 0 })];

    sortCaseFiles(input);

    expect(input.map((item) => item.id)).toEqual(["c-2", "c-1"]);
  });
});

describe("countUnlockedCaseFiles", () => {
  it("liczy tylko odblokowane", () => {
    expect(
      countUnlockedCaseFiles([
        caseFile({ id: "a", locked: false }),
        caseFile({ id: "b", locked: true }),
        caseFile({ id: "c", locked: false }),
      ]),
    ).toBe(2);
  });
});

describe("resolveUnlockStationNumber", () => {
  const tasks: ExpeditionTask[] = [
    {
      stationId: "s-1",
      stationNumber: 4,
      status: "todo",
      pointsAwarded: 0,
      startedAt: null,
      finishedAt: null,
    },
  ];

  it("tłumaczy identyfikator stanowiska na numer tej drużyny", () => {
    // Numeracja bywa rotowana per drużyna, więc serwer wysyła samo id.
    expect(resolveUnlockStationNumber(caseFile({ unlockStationId: "s-1" }), tasks)).toBe(4);
  });

  it("zwraca null dla dowodu bez przypisanego stanowiska", () => {
    expect(resolveUnlockStationNumber(caseFile({ unlockStationId: null }), tasks)).toBeNull();
  });

  it("zwraca null, gdy stanowiska nie ma na liście zadań", () => {
    expect(resolveUnlockStationNumber(caseFile({ unlockStationId: "s-9" }), tasks)).toBeNull();
  });
});
