import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

type IconProps = {
  size: number;
  color: string;
};

/** Lighter heart of the flame, so it reads as fire and not a coloured blob. */
const EMBER_CORE_COLOR = "#FFE9A8";

export function QrScannerIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        // Source icon path: Material Design Icons (free, Apache-2.0), qrcode-scan
        d="M4,4H10V10H4V4M20,4V10H14V4H20M14,15H16V13H14V11H16V13H18V11H20V13H18V15H20V18H18V20H16V18H13V20H11V16H14V15M16,15V18H18V15H16M4,20V14H10V20H4M6,6V8H8V6H6M16,6V8H18V6H16M6,16V18H8V16H6M4,11H6V13H4V11M9,11H13V15H11V13H9V11M11,6H13V10H11V6M2,2V6H0V2A2,2 0 0,1 2,0H6V2H2M22,0A2,2 0 0,1 24,2V6H22V2H18V0H22M2,18V22H6V24H2A2,2 0 0,1 0,22V18H2M22,22V18H24V22A2,2 0 0,1 22,24H18V22H22Z"
        fill={color}
      />
    </Svg>
  );
}

// Deliberately the same shape as the cards drifting through the background, so
// the "find a card" step points at something the player already sees.
export function CardBackIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4.5} y={2} width={15} height={20} rx={2.5} stroke={color} strokeWidth={2} />
      <Rect x={8.5} y={6} width={7} height={12} rx={1.5} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

// Third beat of the round: the card asks something and the team answers. The
// bubble carries the question mark rather than a clock, since the countdown is
// already spelled out by the timer above the card itself.
export function AnswerBubbleIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 3.5H19A2.5 2.5 0 0 1 21.5 6V14A2.5 2.5 0 0 1 19 16.5H12.5L8 20.5V16.5H5A2.5 2.5 0 0 1 2.5 14V6A2.5 2.5 0 0 1 5 3.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M9.8 8.4a2.2 2.2 0 1 1 2.4 2.8v0.7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12.2} cy={13.7} r={1} fill={color} />
    </Svg>
  );
}

/*
  Audio transport and the streak flame used to be fetched at runtime — the
  transport icons from unpkg, the flame as a GIF from a stock-image CDN. This is
  an outdoor game played on field Wi-Fi, so those simply failed to appear
  whenever the signal was poor, with no fallback behind them. Drawn locally they
  cannot go missing.
*/
export function PlayIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4.8v14.4a1 1 0 0 0 1.53.85l11.2-7.2a1 1 0 0 0 0-1.7L8.53 3.95A1 1 0 0 0 7 4.8Z" fill={color} />
    </Svg>
  );
}

export function PauseIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={6} y={4} width={4.4} height={16} rx={1.4} fill={color} />
      <Rect x={13.6} y={4} width={4.4} height={16} rx={1.4} fill={color} />
    </Svg>
  );
}

/** Flame beside the streak multiplier. */
export function StreakFlameIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12.6 1.8c2.3 3.4 1.2 5.4-.2 7-1.1 1.3-2.2 2.4-1.7 4.2-1.5-.6-2-2.2-1.8-3.6-1.9 1.6-3.4 3.9-3.4 6.5A8.5 8.5 0 0 0 20 16c0-4.4-2.6-6.6-4.6-8.4-1.8-1.6-2.9-3.2-2.8-5.8Z"
        fill={color}
      />
      <Path
        d="M12 13.5c1.4 1.2 2.2 2.3 2.2 3.6a2.4 2.4 0 0 1-4.8 0c0-1 .8-2.2 2.6-3.6Z"
        fill={EMBER_CORE_COLOR}
      />
    </Svg>
  );
}

export function StopwatchIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={14} r={7.5} stroke={color} strokeWidth={2} />
      <Path d="M9.5 2H14.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 2V5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 10V14H15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Front-facing pig head. The snout is one path with an even-odd fill rule, so
// the nostrils are genuine holes rather than dots painted in a second colour —
// the icon then sits on the button's dark panel and on the team-coloured card in
// the top bar without either placement needing to know the other's background.
// Solid ears and snout give it enough weight to still read as a pig at the 20px
// the top bar draws it at, where pure line art turned to mush.
export function PigIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.6 8.4L3.9 3.3L9.4 5.5Z" fill={color} />
      <Path d="M18.4 8.4L20.1 3.3L14.6 5.5Z" fill={color} />
      <Ellipse cx={12} cy={12.8} rx={8} ry={6.6} stroke={color} strokeWidth={1.7} />
      <Circle cx={8.7} cy={10.4} r={0.95} fill={color} />
      <Circle cx={15.3} cy={10.4} r={0.95} fill={color} />
      <Path
        d="M11 12.2H13A2.6 2.6 0 0 1 13 17.4H11A2.6 2.6 0 0 1 11 12.2ZM11.85 14.8A0.85 0.85 0 1 1 10.15 14.8A0.85 0.85 0 1 1 11.85 14.8ZM13.85 14.8A0.85 0.85 0 1 1 12.15 14.8A0.85 0.85 0 1 1 13.85 14.8Z"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
}
