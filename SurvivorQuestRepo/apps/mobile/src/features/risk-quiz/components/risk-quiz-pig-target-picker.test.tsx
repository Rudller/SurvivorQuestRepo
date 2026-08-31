import { fireEvent, render } from "@testing-library/react-native";

import { RiskQuizPigTargetPicker } from "./risk-quiz-pig-target-picker";
import type { RiskPigTarget } from "../api/risk-quiz.api";

// The picker carries the one rule that keeps twelve teams playable: a crew
// already under a pig cannot be piled on. These guard that, plus the "losuj cel"
// path, which sends no target at all and lets the server choose.

function target(overrides: Partial<RiskPigTarget> = {}): RiskPigTarget {
  return {
    teamId: "team-2",
    teamName: "Wilki",
    teamColor: "amber",
    isAvailable: true,
    ...overrides,
  };
}

function renderPicker(overrides: Partial<Parameters<typeof RiskQuizPigTargetPicker>[0]> = {}) {
  return render(
    <RiskQuizPigTargetPicker
      visible
      type="FLASHLIGHT"
      targets={[target()]}
      isThrowing={false}
      errorMessage={null}
      onThrow={jest.fn()}
      onClose={jest.fn()}
      {...overrides}
    />,
  );
}

describe("RiskQuizPigTargetPicker", () => {
  it("names the pig it is about to throw", async () => {
    const { getByText } = await renderPicker();

    expect(getByText("Świnia: Latarka")).toBeTruthy();
    expect(getByText("Ekran gaśnie — świeć sobie palcem.")).toBeTruthy();
  });

  it("throws at the chosen team", async () => {
    const onThrow = jest.fn();
    const { getByTestId } = await renderPicker({ onThrow });

    await fireEvent.press(getByTestId("risk-pig-target-team-2"));

    expect(onThrow).toHaveBeenCalledWith("team-2");
  });

  it("refuses to throw at a team that is already under a pig", async () => {
    const onThrow = jest.fn();
    const { getByTestId, getByText } = await renderPicker({
      targets: [target({ isAvailable: false })],
      onThrow,
    });

    await fireEvent.press(getByTestId("risk-pig-target-team-2"));

    expect(onThrow).not.toHaveBeenCalled();
    // Still listed, just visibly out of reach — seeing who is suffering is part
    // of the fun.
    expect(getByText("już oświniona")).toBeTruthy();
  });

  it("sends no target at all when the throw is random", async () => {
    const onThrow = jest.fn();
    const { getByTestId } = await renderPicker({ onThrow });

    await fireEvent.press(getByTestId("risk-pig-random"));

    expect(onThrow).toHaveBeenCalledWith(undefined);
  });

  it("blocks the random throw when nobody can be hit", async () => {
    const onThrow = jest.fn();
    const { getByTestId } = await renderPicker({
      targets: [target({ isAvailable: false })],
      onThrow,
    });

    await fireEvent.press(getByTestId("risk-pig-random"));

    expect(onThrow).not.toHaveBeenCalled();
  });

  it("blocks a second throw while the first is still in flight", async () => {
    const onThrow = jest.fn();
    const { getByTestId } = await renderPicker({ isThrowing: true, onThrow });

    await fireEvent.press(getByTestId("risk-pig-target-team-2"));
    await fireEvent.press(getByTestId("risk-pig-random"));

    expect(onThrow).not.toHaveBeenCalled();
  });

  it("explains an empty room rather than showing a bare list", async () => {
    const { getByText } = await renderPicker({ targets: [] });

    expect(getByText("Nie ma kogo oświnić — grasz sam.")).toBeTruthy();
  });

  it("surfaces a throw error", async () => {
    const { getByText } = await renderPicker({
      errorMessage: "Nie udało się rzucić świni.",
    });

    expect(getByText("Nie udało się rzucić świni.")).toBeTruthy();
  });
});
