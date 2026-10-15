import { Circle, G, Path } from "react-native-svg";

export type ChristmasShapeKind = "snowflake" | "tree" | "bauble" | "star";

/**
 * Kształty znaków wodnych oprawy świątecznej. Każdy w pudełku 24x24, ta sama
 * konwencja co CardSuitShape w features/risk-quiz/components/card-suits.tsx —
 * wywołujący centruje przez translate(-12 -12) przy obrocie i skalowaniu.
 *
 * Kolor przychodzi propsem, a nie z otaczającego <G>, bo płatek jest rysowany
 * kreską, a reszta wypełnieniem.
 */
export function ChristmasShape({ kind, color }: { kind: ChristmasShapeKind; color: string }) {
  if (kind === "snowflake") {
    return (
      <G stroke={color} strokeWidth={1.4} strokeLinecap="round" fill="none">
        {/* Trzy osie przez środek i po parze gałązek na każdym ramieniu. */}
        <Path d="M12,2 L12,22 M3.3,7 L20.7,17 M3.3,17 L20.7,7" />
        <Path d="M9.5,3.8 L12,6 L14.5,3.8 M9.5,20.2 L12,18 L14.5,20.2" />
        <Path d="M3.9,10.2 L6.8,9 L6.3,5.9 M20.1,13.8 L17.2,15 L17.7,18.1" />
        <Path d="M3.9,13.8 L6.8,15 L6.3,18.1 M20.1,10.2 L17.2,9 L17.7,5.9" />
      </G>
    );
  }

  if (kind === "tree") {
    return (
      <G fill={color}>
        <Path d="M12,2 L17,9 L14.5,9 L19,15 L16,15 L21,20 L3,20 L8,15 L5,15 L9.5,9 L7,9 Z" />
        <Path d="M10.5,20 L13.5,20 L13.5,23 L10.5,23 Z" />
      </G>
    );
  }

  if (kind === "bauble") {
    return (
      <G fill={color}>
        <Circle cx={12} cy={14} r={8} />
        <Path d="M10,4 L14,4 L14,6.5 L10,6.5 Z" />
        <Path d="M11,4 C11,2 13,2 13,4" fill="none" stroke={color} strokeWidth={1} />
      </G>
    );
  }

  return (
    <Path
      fill={color}
      d="M12,2 L14.4,8.8 L21.5,9 L15.9,13.4 L17.9,20.3 L12,16.2 L6.1,20.3 L8.1,13.4 L2.5,9 L9.6,8.8 Z"
    />
  );
}
