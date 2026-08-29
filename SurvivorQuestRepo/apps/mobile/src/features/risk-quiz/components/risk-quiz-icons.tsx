import Svg, { Circle, Path, Rect } from "react-native-svg";

type IconProps = {
  size: number;
  color: string;
};

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
