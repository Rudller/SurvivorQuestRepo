import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { resolveCodeStationPresentation } from "./code-station-presentation";

/**
 * Stanowiska kodowe renderują się w dwóch prezentacjach: w overlayu ekspedycji
 * i inline u Ryzykantów. Różnią się wyłącznie liczbami układu, a nie tym, co
 * panel robi — dlatego te liczby stoją w jednej tabeli zamiast rozsypane po
 * ciele komponentu jako `minimalChrome ? … : …`.
 *
 * Ten test przybija obie kolumny tabeli. Jest celowo dosłowny: zmiana wyglądu
 * jednej prezentacji ma tu zapalić dokładnie jedną lampkę, a jeśli zapala dwie,
 * to znaczy, że coś, co miało być rozdzielone, dalej jest wspólne.
 */

// scale = 1, więc `scaled` tylko przycina do widełek — dzięki temu w
// oczekiwaniach widać surowe wartości z projektu, a nie wynik mnożenia.
const scaled = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function resolve(presentation: "overlay" | "inline", isTablet: boolean) {
  return resolveCodeStationPresentation({
    presentation,
    isTablet,
    viewportWidth: 390,
    scaled,
    keyLabelFontSize: 20,
    actionFontSize: 16,
  });
}

describe("profil prezentacji stanowiska kodowego", () => {
  it("overlay na telefonie", () => {
    expect(resolve("overlay", false)).toEqual({
      footerClearance: 72,
      horizontalPadding: 24,
      numericPadScale: 0.8,
      numericPadMaxWidth: 256,
      keyboardGap: 2,
      desiredKeySize: 46,
      minKeySize: 24,
      minKeyHeight: 44,
      keyLabelFontSize: 20,
      codeRowHeight: 57,
      submitButtonWidth: 132,
      codeInputPaddingHorizontal: 16,
      codeInputPaddingVertical: 12,
      codeInputFontSize: 20,
      submitLabelFontSize: 16,
      keyboardMarginTop: 12,
      keyboardMarginBottom: 6,
      borderColor: EXPEDITION_THEME.border,
      backgroundColor: EXPEDITION_THEME.panelMuted,
      screenDerivedKeyboardWidth: 0,
    });
  });

  it("overlay na tablecie", () => {
    expect(resolve("overlay", true)).toEqual({
      footerClearance: 100,
      horizontalPadding: 24,
      numericPadScale: 0.8,
      numericPadMaxWidth: 256,
      keyboardGap: 6,
      desiredKeySize: 62,
      minKeySize: 40,
      minKeyHeight: 44,
      keyLabelFontSize: 20,
      codeRowHeight: 78,
      submitButtonWidth: 164,
      codeInputPaddingHorizontal: 16,
      codeInputPaddingVertical: 12,
      codeInputFontSize: 26,
      submitLabelFontSize: 16,
      keyboardMarginTop: 16,
      keyboardMarginBottom: 8,
      borderColor: EXPEDITION_THEME.border,
      backgroundColor: EXPEDITION_THEME.panelMuted,
      screenDerivedKeyboardWidth: 0,
    });
  });

  it("inline na telefonie", () => {
    expect(resolve("inline", false)).toEqual({
      footerClearance: 0,
      horizontalPadding: 0,
      numericPadScale: 1,
      numericPadMaxWidth: 320,
      keyboardGap: 2,
      desiredKeySize: 56,
      minKeySize: 24,
      minKeyHeight: 24,
      keyLabelFontSize: 20 * 1.15 * 0.9,
      codeRowHeight: 41,
      submitButtonWidth: 104 * 0.9,
      codeInputPaddingHorizontal: 14,
      codeInputPaddingVertical: 9,
      codeInputFontSize: 20 * 0.9,
      submitLabelFontSize: 16 * 0.9,
      keyboardMarginTop: 6,
      keyboardMarginBottom: 0,
      borderColor: "transparent",
      backgroundColor: "transparent",
      screenDerivedKeyboardWidth: (390 - 24) * 0.9,
    });
  });

  it("inline na tablecie", () => {
    expect(resolve("inline", true)).toEqual({
      footerClearance: 0,
      horizontalPadding: 0,
      numericPadScale: 1,
      numericPadMaxWidth: 320,
      keyboardGap: 2,
      desiredKeySize: 84,
      minKeySize: 40,
      minKeyHeight: 40,
      keyLabelFontSize: 20 * 1.15 * 0.9,
      codeRowHeight: 50,
      submitButtonWidth: 148 * 0.9,
      codeInputPaddingHorizontal: 14,
      codeInputPaddingVertical: 9,
      codeInputFontSize: 26 * 0.9,
      submitLabelFontSize: 16 * 0.9,
      keyboardMarginTop: 8,
      keyboardMarginBottom: 0,
      borderColor: "transparent",
      backgroundColor: "transparent",
      screenDerivedKeyboardWidth: (390 - 24) * 0.9,
    });
  });

  it("overlay nie ma nic wspólnego z inline poza minimalnym rozmiarem klawisza", () => {
    const overlay = resolve("overlay", false);
    const inline = resolve("inline", false);

    const shared = (Object.keys(overlay) as (keyof typeof overlay)[]).filter((key) => overlay[key] === inline[key]);

    // minKeySize jest wspólne z rozmysłem: minimalne pole dotyku nie zależy od
    // tego, w której prezentacji stoi panel. keyboardGap wychodzi wspólne tylko
    // na telefonie i to zbieg okoliczności, nie decyzja projektowa.
    expect(shared.sort()).toEqual(["keyboardGap", "minKeySize"].sort());
  });
});
