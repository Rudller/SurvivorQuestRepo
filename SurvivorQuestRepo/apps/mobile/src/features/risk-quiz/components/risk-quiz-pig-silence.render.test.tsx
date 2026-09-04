import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

import { RiskQuizPigEffectLayer } from "./risk-quiz-pig-effects";

// This is the only pig that opens the microphone, so the branches that matter
// are "the team said yes", "the team said no", and "the pig expired" — the last
// one because a recorder left running after the effect ends would keep the mic
// live for the rest of the game.
//
// mock* prefixes are required: jest.mock is hoisted above these consts.
const mockRequestPermissions = jest.fn();
const mockRecord = jest.fn();
const mockStop = jest.fn(() => Promise.resolve());
const mockGetStatus = jest.fn(() => ({ metering: -50 }));
const mockSetAudioMode = jest.fn((_mode: unknown) => Promise.resolve());

jest.mock("expo-audio", () => ({
  RecordingPresets: { LOW_QUALITY: {}, HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: () => mockRequestPermissions(),
  setAudioModeAsync: (mode: unknown) => mockSetAudioMode(mode),
  useAudioRecorder: () => ({
    record: mockRecord,
    stop: mockStop,
    getStatus: mockGetStatus,
  }),
}));

jest.mock("expo-sensors", () => ({
  Accelerometer: {
    isAvailableAsync: () => Promise.resolve(false),
    setUpdateInterval: jest.fn(),
    addListener: () => ({ remove: jest.fn() }),
  },
  LightSensor: {
    isAvailableAsync: () => Promise.resolve(false),
    setUpdateInterval: jest.fn(),
    addListener: () => ({ remove: jest.fn() }),
  },
}));

const OVERLAY = "risk-pig-silence-overlay";

async function renderSilence() {
  return render(
    <RiskQuizPigEffectLayer type="SILENCE" isLightTheme={false}>
      <Text>Pytanie po cichu</Text>
    </RiskQuizPigEffectLayer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStop.mockResolvedValue(undefined);
  mockGetStatus.mockReturnValue({ metering: -50 });
});

describe("SILENCE pig", () => {
  it("starts the recorder once the team allows the microphone", async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });

    const view = await renderSilence();

    await waitFor(() => expect(mockRecord).toHaveBeenCalled());
    expect(view.getByTestId(OVERLAY)).toBeTruthy();
    expect(view.getByText("Pytanie po cichu")).toBeTruthy();
  });

  it("falls back to another effect when the microphone is refused", async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });

    const view = await renderSilence();

    await waitFor(() => expect(mockRequestPermissions).toHaveBeenCalled());
    await waitFor(() => expect(view.queryByTestId(OVERLAY)).toBeNull());
    // Refusing must never start a recording anyway.
    expect(mockRecord).not.toHaveBeenCalled();
    expect(view.getByText("Pytanie po cichu")).toBeTruthy();
  });

  it("survives a permission check that rejects", async () => {
    mockRequestPermissions.mockRejectedValue(new Error("no audio module"));

    const view = await renderSilence();

    await waitFor(() => expect(mockRequestPermissions).toHaveBeenCalled());
    expect(view.getByText("Pytanie po cichu")).toBeTruthy();
  });

  // The important one: the microphone must not outlive the pig.
  it("releases the microphone when the pig expires", async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });

    const view = await renderSilence();
    await waitFor(() => expect(mockRecord).toHaveBeenCalled());

    await view.rerender(
      <RiskQuizPigEffectLayer type={null} isLightTheme={false}>
        <Text>Pytanie po cichu</Text>
      </RiskQuizPigEffectLayer>,
    );

    expect(mockStop).toHaveBeenCalled();
    // ...and the audio session put back the way the rest of the app expects it.
    expect(mockSetAudioMode).toHaveBeenCalledWith(
      expect.objectContaining({ allowsRecording: false }),
    );
    expect(view.queryByTestId(OVERLAY)).toBeNull();
  });
});
