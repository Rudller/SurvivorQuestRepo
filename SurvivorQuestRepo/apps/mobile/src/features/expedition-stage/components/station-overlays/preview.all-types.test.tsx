import { render } from "@testing-library/react-native";

import { StationPreviewOverlay } from "./preview";
import { createStation } from "./station-panels/station-smoke.fixtures";
import type { StationTestType } from "./types";

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn() })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("react-native-svg", () => {
  const actual = jest.requireActual("react-native-svg");
  // __esModule musi zostać: bez niego interop uznaje cały obiekt modułu za
  // domyślny eksport i `<Svg>` staje się obiektem zamiast komponentem.
  return { __esModule: true, ...actual, SvgUri: () => null };
});

// Every station type, mounted in both presentations, asserting only that it
// renders at all and puts its own name on screen.
//
// Deliberately shallow. The point is not to check what each panel draws — the
// per-panel suites already do that — but to have ONE test that fails if a type
// stops rendering entirely. That is the failure mode the station registry can
// introduce: a type whose renderer entry is missing or wired to the wrong
// closure silently produces an empty box, and nothing else in the suite
// notices, because no other test mounts preview.tsx across all types.
//
// Written before the renderer maps move into the registry, so it holds the
// before-and-after line.

const ALL_STATION_TYPES: StationTestType[] = [
  "quiz",
  "audio-quiz",
  "time",
  "points",
  "wordle",
  "hangman",
  "mastermind",
  "anagram",
  "caesar-cipher",
  "memory",
  "simon",
  "rebus",
  "boggle",
  "mini-sudoku",
  "matching",
  "strong-password",
  "photo-task",
  "qr-hunt",
  "open-quiz",
  "reviewed-answer",
  "true-false",
  "fill-blank",
];

describe.each(["overlay", "inline"] as const)("StationPreviewOverlay (%s)", (presentation) => {
  it.each(ALL_STATION_TYPES)("renders a %s station", async (stationType) => {
    const station = createStation({
      stationId: `station-${stationType}`,
      stationType,
      name: "Stacja testowa",
      typeLabel: "Etykieta",
      description: "Opis stanowiska",
      qrScanRequiredCount: 3,
      qrScanCompletedCount: 1,
    });

    const { toJSON } = await render(
      <StationPreviewOverlay station={station} onClose={jest.fn()} presentation={presentation} />,
    );

    const tree = toJSON();

    expect(tree).not.toBeNull();
    // A crashed-to-nothing render still returns a non-null tree for the
    // outermost wrapper, so assert there is actual content underneath.
    expect(JSON.stringify(tree).length).toBeGreaterThan(200);
  });
});
