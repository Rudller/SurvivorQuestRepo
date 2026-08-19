import { Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";

type RiskQuizDeckStackProps = {
  // How many category "decks" ("talie") the assigned scheme has — one
  // card-back graphic is fanned out per deck.
  deckCount: number;
  // Total unattempted stations left for this team across every deck, or
  // null while the count hasn't loaded yet.
  remainingCards: number | null;
};

// Enough distinct tilt angles to fan out a handful of decks without any two
// looking identical; cycles if a scheme somehow has more categories than this.
const CARD_ROTATIONS_DEG = [-10, 7, -4, 11, -14, 5];

export function RiskQuizDeckStack({ deckCount, remainingCards }: RiskQuizDeckStackProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
  const cardWidth = adaptiveLayout.s(isTabletLayout ? 92 : 66, 56, 104);
  const cardHeight = cardWidth * 1.4;
  const cardOverlap = cardWidth * 0.45;
  const labelFontSize = adaptiveLayout.fs(isTabletLayout ? 13 : 11, 10, 15);
  const valueFontSize = adaptiveLayout.fs(isTabletLayout ? 40 : 30, 24, 46);
  const safeDeckCount = Math.max(1, deckCount);

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          flexDirection: "row",
          height: cardHeight + adaptiveLayout.s(20, 14, 26),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {Array.from({ length: safeDeckCount }).map((_, index) => (
          <View
            key={index}
            style={{
              width: cardWidth,
              height: cardHeight,
              marginLeft: index === 0 ? 0 : -cardOverlap,
              borderRadius: adaptiveLayout.s(12, 8, 16),
              borderWidth: 2,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panelStrong,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ rotate: `${CARD_ROTATIONS_DEG[index % CARD_ROTATIONS_DEG.length]}deg` }],
            }}
          >
            <View
              style={{
                width: "68%",
                height: "68%",
                borderRadius: adaptiveLayout.s(8, 6, 10),
                borderWidth: 1.5,
                borderColor: EXPEDITION_THEME.accent,
              }}
            />
          </View>
        ))}
      </View>
      <Text
        className="mt-3 uppercase tracking-widest"
        style={{ color: EXPEDITION_THEME.textSubtle, fontSize: labelFontSize }}
      >
        Zostało kart
      </Text>
      <Text className="font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: valueFontSize }}>
        {remainingCards === null ? "…" : remainingCards}
      </Text>
    </View>
  );
}
