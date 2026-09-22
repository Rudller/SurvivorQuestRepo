import { resolveThemeFamily } from "./realization-mode";
import {
  buildSessionRealization,
  type SessionRealizationSource,
} from "./session-realization";

// Regresja, która przeszła niezauważona przez cały refaktor: mapowanie
// realizacji do sesji wypisuje pola jedno po drugim, więc pominięcie
// któregokolwiek nie jest błędem kompilacji ani nie wywraca żadnego testu —
// pole po prostu cicho znika. Tak zginął `themePack`: backend go serwował,
// admin zapisywał, testy resolvera przechodziły na zielono, a oprawa
// kryminalna nie działała nigdzie w aplikacji.
//
// Testy resolvera nie mogły tego złapać, bo podają mu `themePack` wprost.
// Dziura była w MAPOWANIU, nie w logice wyboru palety — więc testujemy
// mapowanie, i to na całej drodze aż do rodziny motywu.

function source(overrides: Partial<SessionRealizationSource> = {}): SessionRealizationSource {
  return {
    id: "realization-1",
    companyName: "Testowa",
    type: "outdoor-games",
    status: "in-progress",
    scheduledAt: "2026-09-22T10:00:00.000Z",
    durationMinutes: 120,
    teamCount: 2,
    stationIds: [],
    locationRequired: false,
    ...overrides,
  };
}

function build(overrides: Partial<SessionRealizationSource> = {}) {
  return buildSessionRealization({
    realization: source(overrides),
    status: "in-progress",
    selectedLanguage: "polish",
    joinCode: "ABCD12",
    durationMinutes: 120,
    hideLeaderboardMinutesBeforeEnd: 0,
  });
}

describe("oprawa przeniesiona z bootstrapu do sesji", () => {
  it.each([
    ["crime", "crime"],
    ["christmas", "christmas"],
  ])("przenosi pakiet %s i daje rodzinę %s", (themePack, expectedFamily) => {
    const sessionRealization = build({ themePack });

    expect(sessionRealization.themePack).toBe(themePack);
    // Cała droga, nie tylko przepisanie pola: od bootstrapu, przez sesję, po
    // rodzinę palety, którą przeczyta mobile-app.tsx.
    expect(resolveThemeFamily(sessionRealization)).toBe(expectedFamily);
  });

  it("zostaje przy ekspedycji, gdy realizacja nie niesie oprawy", () => {
    const sessionRealization = build({ themePack: undefined });

    expect(resolveThemeFamily(sessionRealization)).toBe("expedition");
  });

  it("Ryzykanci wygrywają z pakietem oprawy także po przejściu przez sesję", () => {
    const sessionRealization = build({ type: "risk-quiz", themePack: "crime" });

    expect(resolveThemeFamily(sessionRealization)).toBe("risk");
  });

  it("nie gubi pozostałych pól przy okazji", () => {
    // Ta sama klasa błędu co z themePack dotyczy każdego innego pola. Kilka
    // reprezentantów różnych kształtów: string, boolean z domyślną wartością,
    // tablica i pole przycinane.
    const sessionRealization = build({
      companyName: "Agencja Noir",
      introText: "  Sprawa otwarta.  ",
      showLeaderboard: false,
      stationIds: ["s1", "s2"],
      hideTaskList: true,
    });

    expect(sessionRealization.companyName).toBe("Agencja Noir");
    expect(sessionRealization.introText).toBe("Sprawa otwarta.");
    expect(sessionRealization.showLeaderboard).toBe(false);
    expect(sessionRealization.stationIds).toEqual(["s1", "s2"]);
    expect(sessionRealization.hideTaskList).toBe(true);
    expect(sessionRealization.joinCode).toBe("ABCD12");
  });

  it("domyśla brakujące ustawienia tabeli wyników zamiast zostawiać undefined", () => {
    const sessionRealization = build({ showLeaderboard: true });

    expect(sessionRealization.showLeaderboardDuringGame).toBe(true);
    expect(sessionRealization.showLeaderboardOnFinish).toBe(true);
    expect(sessionRealization.timedStationPointsDecayEnabled).toBe(false);
  });
});
