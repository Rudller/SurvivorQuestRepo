import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

import { RiskQuizPigEffectLayer } from "./risk-quiz-pig-effects";

// The light sensor is Android-only and missing from plenty of devices, so the
// two branches that matter are "we have one" and "we do not" — and neither is
// allowed to leave the team staring at a screen they cannot get back.
//
// The mock* prefixes are required: jest.mock is hoisted above these consts, and
// only names starting with "mock" may be referenced from the factory.
const mockIsAvailableAsync = jest.fn();
const mockSetUpdateInterval = jest.fn((_interval: number) => undefined);
const mockAddListener = jest.fn((_listener: unknown) => ({ remove: jest.fn() }));

jest.mock("expo-sensors", () => ({
  LightSensor: {
    isAvailableAsync: () => mockIsAvailableAsync(),
    setUpdateInterval: (interval: number) => mockSetUpdateInterval(interval),
    addListener: (listener: unknown) => mockAddListener(listener),
  },
  // OVERHEAD is the unavailable-sensor fallback, so it has to answer too.
  Accelerometer: {
    isAvailableAsync: () => Promise.resolve(false),
    setUpdateInterval: jest.fn(),
    addListener: () => ({ remove: jest.fn() }),
  },
}));

// Queried by testID, not by text: the briefing card that covers the screen
// for the first couple of seconds carries the same wording, so matching on
// text would pass whether or not the overlay was ever rendered.
const OVERLAY = "risk-pig-darkness-overlay";

async function renderDarkness() {
  return render(
    <RiskQuizPigEffectLayer type="DARKNESS" isLightTheme={false}>
      <Text>Pytanie w ciemności</Text>
    </RiskQuizPigEffectLayer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAddListener.mockReturnValue({ remove: jest.fn() });
});

describe("DARKNESS pig", () => {
  it("subscribes to the light sensor and tells the team what to do", async () => {
    mockIsAvailableAsync.mockResolvedValue(true);

    const view = await renderDarkness();

    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());
    expect(mockSetUpdateInterval).toHaveBeenCalled();
    expect(view.getByTestId(OVERLAY)).toBeTruthy();
  });

  // The card underneath has to stay mounted and reachable: the overlay only
  // darkens it, it never replaces it.
  it("keeps the screen content underneath", async () => {
    mockIsAvailableAsync.mockResolvedValue(true);

    const view = await renderDarkness();

    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());
    expect(view.getByText("Pytanie w ciemności")).toBeTruthy();
  });

  it("falls back to another effect when the device has no light sensor", async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    const view = await renderDarkness();

    await waitFor(() => expect(mockIsAvailableAsync).toHaveBeenCalled());
    // No sensor means no darkness hint — asking a team to hide a tablet that
    // cannot tell whether they did would be an unwinnable instruction.
    await waitFor(() => expect(view.queryByTestId(OVERLAY)).toBeNull());
    expect(view.getByText("Pytanie w ciemności")).toBeTruthy();
  });

  it("survives a sensor that rejects instead of answering", async () => {
    mockIsAvailableAsync.mockRejectedValue(new Error("sensor gone"));

    const view = await renderDarkness();

    await waitFor(() => expect(mockIsAvailableAsync).toHaveBeenCalled());
    expect(view.getByText("Pytanie w ciemności")).toBeTruthy();
  });
});
