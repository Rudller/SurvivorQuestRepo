import {
  resolveDefaultStationMediaHeight,
  STATION_DEFINITIONS,
  type StationMediaHeightContext,
} from "./station-registry";
import type { StationTestType } from "../types";

// station-registry.tsx importuje komponenty paneli, a te sięgają po natywne
// moduły niedostępne w środowisku testowym. Ten plik dotyka wyłącznie liczb.
jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), remove: jest.fn(), seekTo: jest.fn() })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// The media-height ladder used to live as a chain of ~12 `if`s in
// use-station-preview-model.ts where the ORDER carried meaning. Moving it to
// per-type entries drops that order, so these assertions pin the facts the
// order used to encode. They are deliberately about relationships, not exact
// pixel counts: restating the formulas would only duplicate the implementation.

const TABLET: StationMediaHeightContext = {
  viewportHeight: 1280,
  availableMediaHeight: 1100,
  isTablet: true,
  isNumericCode: false,
};

const PHONE: StationMediaHeightContext = {
  viewportHeight: 800,
  availableMediaHeight: 680,
  isTablet: false,
  isNumericCode: false,
};

function heightFor(stationType: StationTestType, context: StationMediaHeightContext) {
  return (
    STATION_DEFINITIONS[stationType].mediaHeight?.(context) ??
    resolveDefaultStationMediaHeight(context)
  );
}

describe("station media height", () => {
  it("keeps the numeric-code branch ahead of the general code branch", () => {
    // In the old ladder this was pure ordering: `if (isNumericCodeStation)`
    // stood before `if (requiresCode || requiresPhotoUpload)`. Fold that
    // ordering into one entry wrong and a numeric keypad station silently gets
    // the taller alphanumeric box.
    const numeric = { ...TABLET, isNumericCode: true };

    expect(heightFor("time", numeric)).toBeLessThan(heightFor("time", TABLET));
    expect(heightFor("points", numeric)).toBeLessThan(heightFor("points", TABLET));
  });

  it("gives photo-task the code-station height and never the numeric one", () => {
    // photo-task can never be numeric (that flag is code-stations only), so it
    // must land on the same value as a non-numeric code station.
    expect(heightFor("photo-task", TABLET)).toBe(heightFor("time", TABLET));
    expect(heightFor("photo-task", { ...TABLET, isNumericCode: true })).toBe(
      heightFor("time", TABLET),
    );
  });

  it("leaves wordle and mini-sudoku on the default so their boxes can flex", () => {
    // Both deliberately had no branch: their media box flexes and shrinks when
    // the station description needs room. An entry added here would freeze it.
    expect(STATION_DEFINITIONS.wordle.mediaHeight).toBeUndefined();
    expect(STATION_DEFINITIONS["mini-sudoku"].mediaHeight).toBeUndefined();
    expect(heightFor("wordle", TABLET)).toBe(resolveDefaultStationMediaHeight(TABLET));
  });

  it("sizes the QR scanner off the budget left after its siblings", () => {
    // The scanner reserves room for the progress dots above and the description
    // below. Sized off availableMediaHeight directly (the old flat 0.75), both
    // got clipped — so it must come out below that naive figure.
    expect(heightFor("qr-hunt", TABLET)).toBeLessThan(Math.round(TABLET.availableMediaHeight * 0.75));
    expect(heightFor("qr-hunt", TABLET)).toBeGreaterThan(0);
  });

  it("produces a usable height for every station type on both form factors", () => {
    for (const stationType of Object.keys(STATION_DEFINITIONS) as StationTestType[]) {
      expect(heightFor(stationType, TABLET)).toBeGreaterThan(0);
      expect(heightFor(stationType, PHONE)).toBeGreaterThan(0);
      // Nothing may exceed the viewport it has to fit inside.
      expect(heightFor(stationType, TABLET)).toBeLessThanOrEqual(TABLET.viewportHeight);
      expect(heightFor(stationType, PHONE)).toBeLessThanOrEqual(PHONE.viewportHeight);
    }
  });
});
