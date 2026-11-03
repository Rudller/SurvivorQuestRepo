import type { ExpeditionCaseFile, ExpeditionTask } from "../model/types";
import {
  countUnlockedCaseFiles,
  resolveSwipeTarget,
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

describe("resolveSwipeTarget", () => {
  // Odstęp między kartami na Galaxy Tab Active5 Pro: ~600 dp.
  const base = { index: 2, interval: 600, count: 6 };

  it("spokojny swipe za 15% karty przechodzi dalej, nawet bez prędkości", () => {
    expect(resolveSwipeTarget({ ...base, dx: -120, vx: 0 })).toBe(3);
    expect(resolveSwipeTarget({ ...base, dx: 120, vx: 0 })).toBe(1);
  });

  it("krótki, wolny ruch zostawia kartę na miejscu", () => {
    expect(resolveSwipeTarget({ ...base, dx: -60, vx: 0.05 })).toBe(2);
  });

  it("krótki, ale szybki ruch też zmienia kartę", () => {
    expect(resolveSwipeTarget({ ...base, dx: -40, vx: -0.8 })).toBe(3);
  });

  it("nawet długi swipe przesuwa najwyżej o jedną kartę i nie wychodzi poza talię", () => {
    expect(resolveSwipeTarget({ ...base, dx: -2000, vx: -3 })).toBe(3);
    expect(resolveSwipeTarget({ ...base, index: 5, dx: -300, vx: 0 })).toBe(5);
    expect(resolveSwipeTarget({ ...base, index: 0, dx: 300, vx: 0 })).toBe(0);
  });
});
