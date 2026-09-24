import type { ExpeditionThemeFamily, ExpeditionThemeMode } from "../../onboarding/model/constants";
import {
  BACKDROP_SAFE_FRAME,
  BACKDROP_VIEWBOX_HEIGHT,
  BACKDROP_VIEWBOX_WIDTH,
  buildGraphiteBands,
  buildRfidArcs,
  buildSteppedTraces,
  resolveBackdropSpec,
  type BackdropPath,
} from "./hidden-map-backdrop.model";

const FAMILIES: ExpeditionThemeFamily[] = ["expedition", "risk", "crime", "christmas"];
const MODES: ExpeditionThemeMode[] = ["dark", "light"];

/**
 * Skaner ścieżki SVG, który śledzi bieżący punkt przez M/L/H/A/Z.
 *
 * Zwykłe wyciągnięcie wszystkich liczb z łańcucha nie wystarcza: `H` niesie
 * samo x, a `A` wpycha między współrzędne promienie i flagi, więc naiwne
 * parowanie liczb na (x, y) dałoby nonsens i test przepuszczałby błędy.
 */
function pathPoints(d: string): { x: number; y: number }[] {
  const tokens = d.trim().split(/[\s,]+/);
  const points: { x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  let index = 0;

  const next = () => Number(tokens[index++]);

  while (index < tokens.length) {
    const command = tokens[index++];

    switch (command) {
      case "M":
      case "L":
        x = next();
        y = next();
        points.push({ x, y });
        break;
      case "H":
        x = next();
        points.push({ x, y });
        break;
      case "V":
        y = next();
        points.push({ x, y });
        break;
      case "A":
        // rx ry obrót large-arc sweep, dopiero potem punkt docelowy
        next();
        next();
        next();
        next();
        next();
        x = next();
        y = next();
        points.push({ x, y });
        break;
      case "Z":
        break;
      default:
        throw new Error(`Nieobsługiwana komenda ścieżki: ${command} w "${d}"`);
    }
  }

  return points;
}

function bounds(paths: BackdropPath[]) {
  return paths.map((path) => {
    const points = pathPoints(path.d);

    return {
      id: path.id,
      minX: Math.min(...points.map((point) => point.x)),
      maxX: Math.max(...points.map((point) => point.x)),
      minY: Math.min(...points.map((point) => point.y)),
      maxY: Math.max(...points.map((point) => point.y)),
    };
  });
}

describe("hidden-map-backdrop — model", () => {
  it("ma decyzję o tle dla każdej oprawy", () => {
    // Record wymusza to już na kompilacji; test dokumentuje regułę i łapie
    // rodzinę dopisaną obejściem typu.
    for (const family of FAMILIES) {
      for (const mode of MODES) {
        expect(resolveBackdropSpec(family, mode)).toBeDefined();
      }
    }
  });

  describe("budżet czerwieni", () => {
    // Najważniejsza reguła tej warstwy i jedyna, którą przyszła edycja złamie
    // po cichu: dołożenie drugiego czerwonego elementu nie wywali kompilacji
    // ani niczego wizualnie oczywistego, a zamieni pomiar z karty w fikcję.
    it.each(MODES)("w oprawie kryminalnej (%s) ma dokładnie jeden akcent", (mode) => {
      expect(resolveBackdropSpec("crime", mode).accentMarks).toHaveLength(1);
    });

    it.each(MODES)("w oprawie kryminalnej (%s) zajmuje ułamek procenta kanwy", (mode) => {
      const marks = resolveBackdropSpec("crime", mode).accentMarks;
      const canvas = BACKDROP_VIEWBOX_WIDTH * BACKDROP_VIEWBOX_HEIGHT;
      const share = marks.reduce((sum, mark) => sum + mark.width * mark.height, 0) / canvas;

      // Na karcie dostępu czerwień to 0,51% powierzchni. Tło ma zostać poniżej.
      expect(share).toBeLessThan(0.005);
    });

    it("trzyma akcent w bezpiecznej ramce, bo to jedyny element wymagany zawsze", () => {
      for (const mark of resolveBackdropSpec("crime", "dark").accentMarks) {
        expect(mark.x).toBeGreaterThanOrEqual(BACKDROP_SAFE_FRAME.minX);
        expect(mark.x + mark.width).toBeLessThanOrEqual(BACKDROP_SAFE_FRAME.maxX);
        expect(mark.y).toBeGreaterThanOrEqual(BACKDROP_SAFE_FRAME.minY);
        expect(mark.y + mark.height).toBeLessThanOrEqual(BACKDROP_SAFE_FRAME.maxY);
      }
    });
  });

  it("maluje pasy tokenem ciemniejszym niż panel", () => {
    // Asercja na tożsamość tokenu, nie na arytmetykę koloru. Podmiana na
    // panelStrong albo accentStrong sprawiłaby, że tło wychodzi na wierzch i
    // panele przestają czytać się jako osobna warstwa.
    for (const mode of MODES) {
      expect(resolveBackdropSpec("crime", mode).bandColorToken).toBe("border");
    }
  });

  it("odwraca pasy z wypełnienia na kontur w wariancie jasnym", () => {
    expect(resolveBackdropSpec("crime", "dark").bandStyle).toBe("fill");
    expect(resolveBackdropSpec("crime", "light").bandStyle).toBe("stroke");
  });

  it("gasi poświatę i przesuw w jasnym kryminale", () => {
    // Wydruk nie ma źródła światła ani się nie skanuje — świadoma asymetria
    // względem wariantu ciemnego.
    const spec = resolveBackdropSpec("crime", "light");

    expect(spec.glowOpacity).toBe(0);
    expect(spec.hasScanSweep).toBe(false);
  });

  describe("wykrwawianie poza kadr", () => {
    // To jest niezmiennik, na którym stoi cały argument o `slice`: przy każdej
    // proporcji ekranu kadr obcina motyw, więc żaden element nie może kończyć
    // się w widocznym obszarze uciętym kikutem.

    it("prowadzi pasy przez całą wysokość z zapasem", () => {
      for (const band of bounds(buildGraphiteBands())) {
        expect(band.minY).toBeLessThan(0);
        expect(band.maxY).toBeGreaterThan(BACKDROP_VIEWBOX_HEIGHT);
      }
    });

    it("prowadzi linie włosowe przez całą szerokość z zapasem", () => {
      for (const trace of bounds(buildSteppedTraces())) {
        expect(trace.minX).toBeLessThan(0);
        expect(trace.maxX).toBeGreaterThan(BACKDROP_VIEWBOX_WIDTH);
      }
    });

    it("chowa końce łuków RFID za lewą krawędzią", () => {
      const arcs = bounds(buildRfidArcs());

      expect(arcs).toHaveLength(3);

      for (const arc of arcs) {
        expect(arc.minX).toBeLessThan(0);
      }
    });
  });

  it("generuje poprawnie uformowane ścieżki", () => {
    const paths = [...buildGraphiteBands(), ...buildSteppedTraces(), ...buildRfidArcs()];

    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) {
      expect(path.d).toMatch(/^M[\s-\d.]/);
      expect(path.d).not.toMatch(/NaN|undefined|Infinity/);
      expect(() => pathPoints(path.d)).not.toThrow();
    }
  });

  it("nadaje ścieżkom unikalne identyfikatory", () => {
    const ids = [...buildGraphiteBands(), ...buildSteppedTraces(), ...buildRfidArcs()].map(
      (path) => path.id,
    );

    expect(new Set(ids).size).toBe(ids.length);
  });
});
