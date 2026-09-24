import { resolveStageBackdropKind, type StageBackdropKind } from "./stage-backdrop-kind";

describe("resolveStageBackdropKind", () => {
  const base = { isLoading: false, hideMap: false, mapImageUrl: undefined };

  const cases: [string, Parameters<typeof resolveStageBackdropKind>[0], StageBackdropKind][] = [
    ["ładowanie wygrywa ze wszystkim", { ...base, isLoading: true, hideMap: true }, "loading"],
    ["widoczna mapa to mapa", { ...base }, "map"],
    [
      "wgrana grafika wygrywa z dekoracją",
      { ...base, hideMap: true, mapImageUrl: "https://example.test/plan.png" },
      "image",
    ],
    ["brak grafiki oddaje ekran dekoracji", { ...base, hideMap: true }, "backdrop"],
    ["pusty adres grafiki to brak grafiki", { ...base, hideMap: true, mapImageUrl: "" }, "backdrop"],
    [
      "same spacje w adresie to też brak grafiki",
      { ...base, hideMap: true, mapImageUrl: "   " },
      "backdrop",
    ],
  ];

  it.each(cases)("%s", (_name, input, expected) => {
    expect(resolveStageBackdropKind(input)).toBe(expected);
  });
});
