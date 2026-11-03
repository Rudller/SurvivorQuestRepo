import { clampPan, clampZoom, fitContain, MAX_ZOOM, MIN_ZOOM } from "./case-file-image-zoom.model";

const TABLET = { width: 800, height: 1280 };

describe("clampZoom", () => {
  it("nie pozwala zmniejszyć poniżej całego zdjęcia ani powiększyć ponad limit", () => {
    expect(clampZoom(0.4)).toBe(MIN_ZOOM);
    expect(clampZoom(2)).toBe(2);
    expect(clampZoom(12)).toBe(MAX_ZOOM);
  });
});

describe("fitContain", () => {
  it("wpisuje poziome zdjęcie 4:3 w pionowy tablet na całą szerokość", () => {
    expect(fitContain({ width: 1600, height: 1200 }, TABLET)).toEqual({ width: 800, height: 600 });
  });

  it("bez znanych proporcji zakłada całe okno", () => {
    expect(fitContain(null, TABLET)).toEqual(TABLET);
  });
});

describe("clampPan", () => {
  const landscape = { width: 800, height: 600 };

  it("przy 1× nie pozwala przesuwać zdjęcia", () => {
    expect(clampPan({ x: 120, y: -80 }, 1, landscape, TABLET)).toEqual({ x: 0, y: 0 });
  });

  it("przy powiększeniu ogranicza przesunięcie do krawędzi zdjęcia", () => {
    // 2.5× poziomego 800×600 na 800×1280: luz 600 w poziomie, 110 w pionie.
    expect(clampPan({ x: 1000, y: -1000 }, 2.5, landscape, TABLET)).toEqual({ x: 600, y: -110 });
    expect(clampPan({ x: 150, y: 50 }, 2.5, landscape, TABLET)).toEqual({ x: 150, y: 50 });
  });

  it("nie pozwala wjechać w czarne tło, póki powiększone zdjęcie mieści się w oknie", () => {
    // 2× poziomego zdjęcia: 1200 px wysokości < 1280 okna — w pionie brak luzu.
    expect(clampPan({ x: 0, y: 300 }, 2, landscape, TABLET)).toEqual({ x: 0, y: 0 });
  });
});
