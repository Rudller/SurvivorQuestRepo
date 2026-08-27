import { Circle, G, Path } from "react-native-svg";

export type CardSuit = "spade" | "heart" | "diamond" | "club";

// Bridge order — the sequence a dealer counts in, which is what the waiting
// indicator animates through.
export const CARD_SUIT_ORDER: CardSuit[] = ["spade", "heart", "diamond", "club"];

// Every suit shape is drawn in its own 24x24 box (same convention as the icon
// components elsewhere in this app). Callers supply fill via a wrapping <G> or
// <Svg>, and recenter with a -12,-12 translate when they need to rotate or
// scale around the shape's visual center.
export function CardSuitShape({ suit }: { suit: CardSuit }) {
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
