import { useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { getExpeditionThemeFamily, getExpeditionThemeMode } from "../../features/onboarding/model/constants";
import { pseudoRandom } from "../math/pseudo-random";

type SnowCapProps = {
  /** Promień rogów panelu — czapa kończy się przed zaokrągleniem. */
  cornerRadius: number;
  /** Wysokość czapy razem z soplami. */
  height?: number;
  /** Ziarno kształtu, żeby sąsiednie panele nie miały identycznych zasp. */
  seed?: number;
};

/**
 * Śnieg osiadły na górnej krawędzi panelu. Rysuje się tylko w oprawie
 * świątecznej — w każdej innej zwraca null, więc wywołujący nie musi niczego
 * sprawdzać.
 *
 * Leży absolutnie, wystając ponad krawędź, więc NIE zmienia wysokości ani
 * układu panelu. Rodzic nie może mieć overflow: hidden, inaczej czapa zostanie
 * ucięta do środka panelu.
 */
export function SnowCap({ cornerRadius, height = 12, seed = 1 }: SnowCapProps) {
  const [width, setWidth] = useState(0);

  if (getExpeditionThemeFamily() !== "christmas") {
    return null;
  }

  const isLightTheme = getExpeditionThemeMode() === "light";
  const inset = Math.max(4, cornerRadius * 0.55);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
      style={{ position: "absolute", top: -height * 0.55, left: inset, right: inset, height }}
    >
      {width > 0 ? (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Path
            d={buildSnowCapPath(width, height, seed)}
            fill="#ffffff"
            fillOpacity={isLightTheme ? 1 : 0.94}
            // Na jasnym motywie biel na bladym panelu by zniknęła — chłodny
            // obrys oddziela zaspę od tła.
            stroke={isLightTheme ? "#b9c9d4" : "none"}
            strokeWidth={isLightTheme ? 1 : 0}
          />
        </Svg>
      ) : null}
    </View>
  );
}

/**
 * Kształt zaspy w pikselach rzeczywistej szerokości: nierówny górny brzeg z
 * pagórków i kilka sopli zwisających poniżej krawędzi panelu. Liczony z
 * szerokości, a nie rozciągany, żeby pagórki na szerokim panelu tabletu nie
 * zamieniały się w płaskie wały.
 */
export function buildSnowCapPath(width: number, height: number, seed: number) {
  const base = height * 0.55;
  const valley = height * 0.32;
  const edge = Math.min(10, width * 0.08);
  const segments = Math.max(3, Math.round((width - edge * 2) / 38));
  const segment = (width - edge * 2) / segments;

  let d = `M0,${base} Q0,${valley} ${edge},${valley}`;
  for (let index = 0; index < segments; index += 1) {
    const x0 = edge + index * segment;
    const peak = height * (0.02 + pseudoRandom(seed * 31 + index) * 0.2);
    // Punkt kontrolny dwa razy dalej od cięciwy niż szczyt — wtedy krzywa
    // faktycznie dochodzi do wysokości `peak`.
    const controlY = 2 * peak - valley;
    d += ` Q${x0 + segment / 2},${controlY} ${x0 + segment},${valley}`;
  }
  d += ` Q${width},${valley} ${width},${base}`;

  // Sople: kilka, w losowych (ale stałych) miejscach, od prawej do lewej, bo w
  // tę stronę idzie dolna krawędź ścieżki.
  const dripCount = Math.max(1, Math.round(segments / 3));
  const drips = Array.from({ length: dripCount }, (_, index) => {
    const x = edge * 2 + pseudoRandom(seed * 17 + index) * (width - edge * 4);
    const radius = 2 + pseudoRandom(seed * 7 + index) * 2;
    const depth = base + (height - base) * (0.5 + pseudoRandom(seed * 13 + index) * 0.5);
    return { x, radius, depth };
  }).sort((a, b) => b.x - a.x);

  for (const drip of drips) {
    d += ` L${drip.x + drip.radius},${base}`;
    d += ` Q${drip.x + drip.radius},${drip.depth} ${drip.x},${drip.depth}`;
    d += ` Q${drip.x - drip.radius},${drip.depth} ${drip.x - drip.radius},${base}`;
  }

  return `${d} L0,${base} Z`;
}
