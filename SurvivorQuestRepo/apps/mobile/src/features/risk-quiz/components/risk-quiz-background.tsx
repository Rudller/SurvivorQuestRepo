import { View } from "react-native";
import Svg, { Defs, G, RadialGradient, Rect, Stop } from "react-native-svg";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { CardSuitShape, type CardSuit } from "./card-suits";

type RiskQuizBackgroundProps = {
  isLightTheme: boolean;
};

// Fixed virtual canvas the decorative layer is drawn on; "slice" scaling below
// stretches/crops it to fill whatever the real screen size is, so the suit
// layout stays proportional across phones and tablets.
const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 800;

// Scattered card-suit watermarks — position (percent of the viewbox), suit,
// size, and rotation. Kept sparse and very low-opacity so the scan screen's
// real content stays the clear focal point.
const SUIT_MARKS: { x: number; y: number; suit: CardSuit; size: number; rotation: number }[] = [
  { x: 8, y: 10, suit: "spade", size: 58, rotation: -18 },
  { x: 86, y: 6, suit: "diamond", size: 42, rotation: 12 },
  { x: 92, y: 34, suit: "club", size: 52, rotation: 22 },
  { x: 4, y: 46, suit: "heart", size: 36, rotation: -10 },
  { x: 14, y: 82, suit: "club", size: 64, rotation: 8 },
  { x: 88, y: 78, suit: "spade", size: 46, rotation: -14 },
  { x: 50, y: 4, suit: "diamond", size: 32, rotation: 4 },
  { x: 60, y: 92, suit: "heart", size: 50, rotation: -6 },
];

export function RiskQuizBackground({ isLightTheme }: RiskQuizBackgroundProps) {
  const glyphColor = isLightTheme ? EXPEDITION_THEME.border : EXPEDITION_THEME.textPrimary;
  const glyphOpacity = isLightTheme ? 0.1 : 0.06;
  // Light mode dims the edges with the theme family's own wash tone so the
  // vignette never tints the screen a different colour than the palette.
  const vignetteColor = isLightTheme ? `rgb(${EXPEDITION_THEME.scrimWashRgb})` : "#000000";

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <RadialGradient id="riskQuizGlow" cx="50%" cy="34%" r="58%">
            <Stop offset="0" stopColor={EXPEDITION_THEME.accent} stopOpacity={isLightTheme ? 0.14 : 0.18} />
            <Stop offset="1" stopColor={EXPEDITION_THEME.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="riskQuizVignette" cx="50%" cy="42%" r="78%">
            <Stop offset="0" stopColor={vignetteColor} stopOpacity={0} />
            <Stop offset="1" stopColor={vignetteColor} stopOpacity={isLightTheme ? 0.22 : 0.5} />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill={EXPEDITION_THEME.background} />
        <Rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#riskQuizGlow)" />

        {SUIT_MARKS.map((mark, index) => {
          const cx = (mark.x / 100) * VIEWBOX_WIDTH;
          const cy = (mark.y / 100) * VIEWBOX_HEIGHT;
          const scale = mark.size / 24;
          return (
            <G
              key={index}
              transform={`translate(${cx} ${cy}) rotate(${mark.rotation}) scale(${scale}) translate(-12 -12)`}
              fill={glyphColor}
              fillOpacity={glyphOpacity}
            >
              <CardSuitShape suit={mark.suit} />
            </G>
          );
        })}

        <Rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#riskQuizVignette)" />
      </Svg>
    </View>
  );
}
