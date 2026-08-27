import { Text } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

import { HIDDEN_RESET_HOLD_MS, HiddenResetOnHold } from "./hidden-reset-on-hold";

// This gesture is the last way off a screen a team can be stranded on (the
// waiting-for-start screens poll forever when the stored server address is
// unreachable), so the hold duration, the confirm step and the cancel path all
// need a guard — a silent regression here is only discovered on a tablet
// mid-game, with no way to recover it.

async function renderHold(props: Partial<Parameters<typeof HiddenResetOnHold>[0]> = {}) {
  const onReset = jest.fn();
  const view = await render(
    <HiddenResetOnHold language="polish" onReset={onReset} {...props}>
      <Text>Czekamy na rozpoczęcie gry...</Text>
    </HiddenResetOnHold>,
  );

  return { ...view, onReset };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("HiddenResetOnHold", () => {
  it("stays hidden until the press has been held long enough", async () => {
    const { getByText, queryByText } = await renderHold();

    await fireEvent(getByText("Czekamy na rozpoczęcie gry..."), "pressIn");
    await act(async () => {
      jest.advanceTimersByTime(HIDDEN_RESET_HOLD_MS - 1);
    });

    expect(queryByText("Wróć do startu")).toBeNull();

    await act(async () => {

      jest.advanceTimersByTime(1);

    });

    expect(queryByText("Wróć do startu")).not.toBeNull();
  });

  it("cancels the hold when the finger lifts early", async () => {
    const { getByText, queryByText } = await renderHold();

    await fireEvent(getByText("Czekamy na rozpoczęcie gry..."), "pressIn");
    await act(async () => {
      jest.advanceTimersByTime(HIDDEN_RESET_HOLD_MS - 500);
    });
    await fireEvent(getByText("Czekamy na rozpoczęcie gry..."), "pressOut");
    await act(async () => {
      jest.advanceTimersByTime(HIDDEN_RESET_HOLD_MS);
    });

    expect(queryByText("Wróć do startu")).toBeNull();
  });

  it("resets only after the confirmation is tapped", async () => {
    const { getByText, onReset } = await renderHold();

    await fireEvent(getByText("Czekamy na rozpoczęcie gry..."), "pressIn");
    await act(async () => {
      jest.advanceTimersByTime(HIDDEN_RESET_HOLD_MS);
    });

    expect(onReset).not.toHaveBeenCalled();

    await fireEvent.press(getByText("Wróć do startu"));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("closes without resetting when cancelled", async () => {
    const { getByText, queryByText, onReset } = await renderHold();

    await fireEvent(getByText("Czekamy na rozpoczęcie gry..."), "pressIn");
    await act(async () => {
      jest.advanceTimersByTime(HIDDEN_RESET_HOLD_MS);
    });
    await fireEvent.press(getByText("Anuluj"));

    expect(onReset).not.toHaveBeenCalled();
    expect(queryByText("Wróć do startu")).toBeNull();
  });

  it("promises a rejoin or a clean start screen depending on what the caller does", async () => {
    const rejoin = await renderHold({ variant: "rejoin" });
    await fireEvent(rejoin.getByText("Czekamy na rozpoczęcie gry..."), "pressIn");
    await act(async () => {
      jest.advanceTimersByTime(HIDDEN_RESET_HOLD_MS);
    });

    expect(rejoin.getByText(/tym samym kodem/)).toBeTruthy();

    const exit = await renderHold({ variant: "exit" });
    await fireEvent(exit.getByText("Czekamy na rozpoczęcie gry..."), "pressIn");
    await act(async () => {
      jest.advanceTimersByTime(HIDDEN_RESET_HOLD_MS);
    });

    expect(exit.getByText(/wybrać serwer i kod od nowa/)).toBeTruthy();
  });
});
