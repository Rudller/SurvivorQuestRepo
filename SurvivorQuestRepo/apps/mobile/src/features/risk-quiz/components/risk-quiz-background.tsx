import { View } from "react-native";
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";

type RiskQuizBackgroundProps = {
  isLightTheme: boolean;
};

// Fixed virtual canvas the decorative layer is drawn on; "slice" scaling below
// stretches/crops it to fill whatever the real screen size is, so the suit
// layout stays proportional across phones and tablets.
const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 800;

type Suit = "spade" | "heart" | "diamond" | "club";

// Every suit shape is drawn in its own 24x24 box (same convention as the
// icon components elsewhere in this app) and recentered with a -12,-12
// translate before the per-mark transform below, so scale/rotate/position
// all pivot around the shape's visual center.
function SuitShape({ suit }: { suit: Suit }) {
  if (suit === "diamond") {
    return <Path d="M12,2 L21,12 L12,22 L3,12 Z" />;
  }

  if (suit === "heart") {
    return (
      <Path d="M12,21 C12,21 3,14.5 3,8.5 C3,5.5 5.5,3 8.5,3 C10,3 11.3,3.8 12,5 C12.7,3.8 14,3 15.5,3 C18.5,3 21,5.5 21,8.5 C21,14.5 12,21 12,21 Z" />
    );
  }

  if (suit === "spade") {
    return (
      <G>
        <Path d="M12,3 C12,3 3,9.5 3,15.5 C3,18.5 5.5,21 8.5,21 C10,21 11.3,20.2 12,19 C12.7,20.2 14,21 15.5,21 C18.5,21 21,18.5 21,15.5 C21,9.5 12,3 12,3 Z" />
        <Path d="M10.5,20 L13.5,20 L14.2,23.5 L9.8,23.5 Z" />
      </G>
    );
  }

  return (
    <G>
      <Circle cx={12} cy={8.3} r={4.3} />
      <Circle cx={7.7} cy={13.3} r={4.3} />
      <Circle cx={16.3} cy={13.3} r={4.3} />
      <Path d="M10.3,14.5 L13.7,14.5 L14.4,22 L9.6,22 Z" />
    </G>
  );
}

// Scattered card-suit watermarks — position (percent of the viewbox), suit,
// size, and rotation. Kept sparse and very low-opacity so the scan screen's
// real content stays the clear focal point.
const SUIT_MARKS: { x: number; y: number; suit: Suit; size: number; rotation: number }[] = [
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
  const vignetteColor = isLightTheme ? "#5c4a1f" : "#000000";

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
              <SuitShape suit={mark.suit} />
            </G>
          );
        })}

        <Rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#riskQuizVignette)" />
      </Svg>
    </View>
  );
}
