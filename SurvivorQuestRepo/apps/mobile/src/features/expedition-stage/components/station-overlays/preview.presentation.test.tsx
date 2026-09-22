import { fireEvent, render } from "@testing-library/react-native";

import { StationPreviewOverlay } from "./preview";
import { createStation } from "./station-panels/station-smoke.fixtures";
import type { StationTestType } from "./types";

// preview.tsx pulls in use-audio-quiz-playback.ts and use-simon-audio.ts, which
// import expo-audio — its native module isn't available under jest-expo's test
// environment. Nothing here plays audio, so a minimal mock is enough.
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn() })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// SvgUri fetches its icons over the network (the app points it at unpkg.com).
// Left real, every case here makes live HTTP requests that fail in CI and log
// a wall of errors; the icons are irrelevant to the chrome under test.
jest.mock("react-native-svg", () => {
  const actual = jest.requireActual("react-native-svg");
  // __esModule musi zostać: bez niego interop uznaje cały obiekt modułu za
  // domyślny eksport i `<Svg>` staje się obiektem zamiast komponentem.
  return { __esModule: true, ...actual, SvgUri: () => null };
});

// Characterization test for the `presentation` prop, written BEFORE the
// presentation-profile refactor so it can prove that refactor changed nothing.
//
// preview.tsx branches on `isInlinePresentation` in 35 places. Almost all of
// them are layout numbers that no test can meaningfully assert, but four are
// structural — an element is present in one mode and absent in the other — and
// those are exactly what a reader would notice if the refactor broke:
//
//   1. the header row (station label + close button)  -> overlay only
//   2. the dimming backdrop                            -> overlay only
//
// The card chrome (border, radius, padding) is deliberately NOT asserted:
// those are the values the profile is meant to move, and pinning them here
// would force this file to be edited in the same commit that moves them,
// which is precisely what a characterization test must not do.
//
// If an assertion below ever has to change, that is a real presentation
// regression, not a test that needs updating.

const CLOSE_GLYPH = "✕";

// One representative per station family, per the families in
// use-station-preview-model.ts: quiz, code-entry, photo upload, QR scan and
// board. The chrome under test is shared by all types, so the point of the
// matrix is to prove the branching does not accidentally depend on the type.
const REPRESENTATIVES: { type: StationTestType; label: string }[] = [
  { type: "open-quiz", label: "Quiz otwarty" },
  { type: "time", label: "Na czas" },
  { type: "photo-task", label: "Zadanie foto" },
  { type: "qr-hunt", label: "Polowanie QR" },
  { type: "wordle", label: "Wordle" },
];

async function renderStation(type: StationTestType, label: string, presentation: "overlay" | "inline") {
  const station = createStation({
    stationId: `station-${type}`,
    stationType: type,
    name: "Stacja testowa",
    typeLabel: label,
    // qr-hunt renders its progress dots off these; harmless for other types.
    qrScanRequiredCount: 3,
    qrScanCompletedCount: 1,
  });

  const result = await render(
    <StationPreviewOverlay station={station} onClose={jest.fn()} presentation={presentation} />,
  );

  return { ...result, headerLabel: `${station.name} • ${station.typeLabel}` };
}

describe("StationPreviewOverlay presentation chrome", () => {
  describe.each(REPRESENTATIVES)("$type", ({ type, label }) => {
    it("shows the header row and close button in overlay presentation", async () => {
      const { queryByText, headerLabel } = await renderStation(type, label, "overlay");

      expect(queryByText(headerLabel)).not.toBeNull();
      expect(queryByText(CLOSE_GLYPH)).not.toBeNull();
    });

    it("hides the header row and close button in inline presentation", async () => {
      const { queryByText, headerLabel } = await renderStation(type, label, "inline");

      // Inline hosts (Ryzykanci) draw their own header and close affordance;
      // rendering ours too is the visible bug this guards against.
      expect(queryByText(headerLabel)).toBeNull();
      expect(queryByText(CLOSE_GLYPH)).toBeNull();
    });
  });

  it("routes the close button through onRequestClose when the host supplies one", async () => {
    const onClose = jest.fn();
    const onRequestClose = jest.fn();
    const station = createStation({ stationType: "open-quiz", name: "Stacja testowa", typeLabel: "Quiz otwarty" });

    const { getByText } = await render(
      <StationPreviewOverlay
        station={station}
        onClose={onClose}
        onRequestClose={onRequestClose}
        presentation="overlay"
      />,
    );

    await fireEvent.press(getByText(CLOSE_GLYPH));

    // onRequestClose wins when present — it is how the host gets a chance to
    // confirm before the overlay tears down mid-attempt.
    expect(onRequestClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
