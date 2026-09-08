import { fireEvent, render } from "@testing-library/react-native";

import { QuizOutcomePopupPanel, type QuizOutcomePopup } from "./quiz-outcome-popup-panel";

/**
 * Testy zachowania, nie wyglądu. Kolory i rozmiary należą do profilu i są
 * przybite w quiz-outcome-presentation.test.ts — powtarzanie ich tutaj
 * powielałoby implementację i pękałoby przy każdej korekcie skóry.
 *
 * Tutaj pilnujemy rzeczy, które realnie regresują: maszyny stanów wejścia i
 * wyjścia, kolejki popupów z ekranu mapy oraz tego, że `onClose` nie zostało
 * odroczone do końca animacji.
 */

const TEXT = {
  outcomePassed: "Zaliczono",
  outcomeTimedOut: "Czas minął",
  outcomeFailed: "Nie zaliczono",
  outcomePending: "Czekamy na zatwierdzenie",
  backToMapNow: "Wróć do mapy teraz",
  backToMap: "Wróć na mapę",
};

function renderPanel(overrides: {
  popup?: QuizOutcomePopup | null;
  timeoutSecondsLeft?: number | null;
  cornerStyle?: "rounded" | "chamfered";
  onClose?: () => void;
} = {}) {
  return render(
    <QuizOutcomePopupPanel
      popup={overrides.popup === undefined ? { variant: "success", message: "Brawo" } : overrides.popup}
      timeoutSecondsLeft={overrides.timeoutSecondsLeft ?? null}
      isLightTheme={false}
      cornerStyle={overrides.cornerStyle}
      text={TEXT}
      onClose={overrides.onClose ?? jest.fn()}
    />,
  );
}

function panelElement(popup: QuizOutcomePopup | null, timeoutSecondsLeft: number | null = null) {
  return (
    <QuizOutcomePopupPanel
      popup={popup}
      timeoutSecondsLeft={timeoutSecondsLeft}
      isLightTheme={false}
      text={TEXT}
      onClose={jest.fn()}
    />
  );
}

describe("popup wyniku stanowiska", () => {
  it("nie renderuje niczego bez wyniku", async () => {
    const { queryByText } = await renderPanel({ popup: null });

    expect(queryByText(TEXT.outcomePassed)).toBeNull();
    expect(queryByText(TEXT.outcomeFailed)).toBeNull();
    expect(queryByText(TEXT.backToMap)).toBeNull();
  });

  it.each([
    ["success", TEXT.outcomePassed],
    ["failed", TEXT.outcomeFailed],
    ["timeout", TEXT.outcomeTimedOut],
    ["pending", TEXT.outcomePending],
  ] as const)("wariant %s pokazuje swój tytuł", async (variant, title) => {
    const { getByText } = await renderPanel({ popup: { variant, message: "treść" } });

    expect(getByText(title)).toBeTruthy();
  });

  it("woła onClose natychmiast, bez czekania na animację wyjścia", async () => {
    const onClose = jest.fn();
    const { getByText } = await renderPanel({ onClose });

    await fireEvent.press(getByText(TEXT.backToMap));

    // Odroczenie onClose do końca animacji zepsułoby auto-zamknięcie popupu
    // timeoutu i ścieżki, na których onDismiss zamyka całe stanowisko.
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("zostaje na ekranie po zniknięciu propa, żeby zdążyć odegrać wyjście", async () => {
    const { getByText, rerender } = await renderPanel({ popup: { variant: "failed", message: "treść" } });
    expect(getByText(TEXT.outcomeFailed)).toBeTruthy();

    await rerender(panelElement(null));

    // Gdyby komponent wrócił do `return null`, animacji wyjścia nie byłoby czym odegrać.
    expect(getByText(TEXT.outcomeFailed)).toBeTruthy();
  });

  it("przechodzi z jednego wyniku na kolejny bez zatrzymania na null", async () => {
    // Na ekranie mapy popup jest kolejką (use-expedition-session.ts), więc prop
    // potrafi zmienić się z A na B bez przejścia przez null.
    const { getByText, queryByText, rerender } = await renderPanel({
      popup: { variant: "success", message: "pierwszy" },
    });
    expect(getByText("pierwszy")).toBeTruthy();

    await rerender(panelElement({ variant: "failed", message: "drugi" }));

    expect(getByText("drugi")).toBeTruthy();
    expect(getByText(TEXT.outcomeFailed)).toBeTruthy();
    expect(queryByText("pierwszy")).toBeNull();
  });

  it("odliczanie pokazuje się tylko przy wyniku timeout", async () => {
    const withCountdown = await renderPanel({ popup: { variant: "timeout", message: "treść" }, timeoutSecondsLeft: 7 });
    expect(withCountdown.getByText("7s")).toBeTruthy();

    const withoutCountdown = await renderPanel({
      popup: { variant: "failed", message: "treść" },
      timeoutSecondsLeft: 7,
    });
    expect(withoutCountdown.queryByText("7s")).toBeNull();
  });

  it("timeout dostaje własną etykietę przycisku", async () => {
    const timeout = await renderPanel({ popup: { variant: "timeout", message: "treść" } });
    expect(timeout.getByText(TEXT.backToMapNow)).toBeTruthy();

    const pending = await renderPanel({ popup: { variant: "pending", message: "treść" } });
    expect(pending.getByText(TEXT.backToMap)).toBeTruthy();
  });

  it("skóra Ryzykantów renderuje tę samą treść co skóra ekspedycji", async () => {
    const { getByText } = await renderPanel({
      popup: { variant: "success", message: "Brawo" },
      cornerStyle: "chamfered",
    });

    expect(getByText(TEXT.outcomePassed)).toBeTruthy();
    expect(getByText("Brawo")).toBeTruthy();
    expect(getByText(TEXT.backToMap)).toBeTruthy();
  });
});
