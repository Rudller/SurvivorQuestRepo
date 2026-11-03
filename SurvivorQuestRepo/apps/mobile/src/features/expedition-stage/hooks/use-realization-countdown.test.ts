import { act, renderHook } from "@testing-library/react-native";

import { useRealizationCountdownFlags } from "./use-realization-countdown";

describe("useRealizationCountdownFlags", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-16T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("w trakcie gry nie przerysowuje ekranu co sekundę", async () => {
    let renders = 0;
    await renderHook(() => {
      renders += 1;
      // Start 11:00, 120 min → koniec 13:00; próg 10 min.
      return useRealizationCountdownFlags("2026-10-16T11:00:00.000Z", 120, 600);
    });
    const afterMount = renders;

    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    expect(renders).toBe(afterMount);
  });

  it("przełącza flagi, gdy zegar przekroczy próg i gdy czas minie", async () => {
    const { result } = await renderHook(() => useRealizationCountdownFlags("2026-10-16T11:00:00.000Z", 61, 120));
    // Koniec 12:01, próg 2 min → od razu poniżej progu, ale jeszcze nie koniec.
    expect(result.current).toEqual({ isCompleted: false, isBelowThreshold: true });

    await act(async () => {
      jest.advanceTimersByTime(61_000);
    });

    expect(result.current).toEqual({ isCompleted: true, isBelowThreshold: true });
  });
});
