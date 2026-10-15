import { useId } from "react";
import { View } from "react-native";
import Svg, { Defs, G, RadialGradient, Rect, Stop } from "react-native-svg";

import { EXPEDITION_THEME } from "../../features/onboarding/model/constants";
import { ChristmasShape, type ChristmasShapeKind } from "./christmas-shapes";

type ChristmasBackgroundProps = {
  isLightTheme: boolean;
};

/**
 * Statyczne tło oprawy świątecznej: baza palety, ciepła złota poświata u góry
 * (jak światło lampek), rzadkie znaki wodne i winieta. Wzór kompozycji z
 * features/risk-quiz/components/risk-quiz-background.tsx, ta sama kanwa 400x800
 * przycinana `slice`.
 *
 * Rysunek jest STATYCZNY — śnieg idzie osobną warstwą (shared/ui/snowfall.tsx)
 * na transformach, bo przemalowywanie pełnoekranowego SVG kosztuje klatkę.
 */
const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 800;

// Pozycje w procentach kanwy. Rzadko i blado, żeby treść ekranu zostawała
// jedynym punktem skupienia — to tło, nie ilustracja.
const MARKS: { x: number; y: number; kind: ChristmasShapeKind; size: number; rotation: number }[] = [
  { x: 9, y: 11, kind: "snowflake", size: 54, rotation: -12 },
  { x: 86, y: 7, kind: "star", size: 34, rotation: 10 },
  { x: 91, y: 33, kind: "tree", size: 62, rotation: 6 },
  { x: 5, y: 44, kind: "bauble", size: 38, rotation: -14 },
  { x: 52, y: 4, kind: "snowflake", size: 30, rotation: 18 },
  { x: 14, y: 80, kind: "tree", size: 70, rotation: -4 },
  { x: 87, y: 74, kind: "snowflake", size: 48, rotation: 24 },
  { x: 62, y: 93, kind: "bauble", size: 44, rotation: 8 },
  { x: 40, y: 58, kind: "star", size: 22, rotation: -20 },
];

export function ChristmasBackground({ isLightTheme }: ChristmasBackgroundProps) {
  // <Defs> są globalne dla dokumentu SVG — każda instancja potrzebuje własnych
  // identyfikatorów (wzorzec z hidden-map-backdrop.tsx).
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glowId = `christmasGlow${instanceId}`;
  const vignetteId = `christmasVignette${instanceId}`;

  const markColor = isLightTheme ? EXPEDITION_THEME.border : EXPEDITION_THEME.textPrimary;
  const markOpacity = isLightTheme ? 0.14 : 0.07;
  const vignetteColor = isLightTheme ? `rgb(${EXPEDITION_THEME.scrimWashRgb})` : "#000000";

  return (
    <View
      testID="christmas-background"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="18%" r="60%">
            <Stop offset="0" stopColor={EXPEDITION_THEME.accentStrong} stopOpacity={isLightTheme ? 0.12 : 0.16} />
            <Stop offset="1" stopColor={EXPEDITION_THEME.accentStrong} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={vignetteId} cx="50%" cy="42%" r="78%">
            <Stop offset="0" stopColor={vignetteColor} stopOpacity={0} />
            <Stop offset="1" stopColor={vignetteColor} stopOpacity={isLightTheme ? 0.2 : 0.5} />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill={EXPEDITION_THEME.background} />
        <Rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill={`url(#${glowId})`} />

        {MARKS.map((mark, index) => {
          const cx = (mark.x / 100) * VIEWBOX_WIDTH;
          const cy = (mark.y / 100) * VIEWBOX_HEIGHT;
          const scale = mark.size / 24;
          return (
            <G
              key={index}
              opacity={markOpacity}
              transform={`translate(${cx} ${cy}) rotate(${mark.rotation}) scale(${scale}) translate(-12 -12)`}
            >
              <ChristmasShape kind={mark.kind} color={markColor} />
            </G>
          );
        })}

        <Rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill={`url(#${vignetteId})`} />
      </Svg>
    </View>
  );
}
