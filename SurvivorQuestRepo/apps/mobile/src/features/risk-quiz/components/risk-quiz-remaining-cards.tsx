import { Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { useUiLanguage } from "../../i18n";
import { RISK_QUIZ_TEXT } from "../model/risk-quiz-text";

type RiskQuizRemainingCardsProps = {
  // Total unattempted stations left for this team across every deck, or
  // null while the count hasn't loaded yet.
  remainingCards: number | null;
};

export function RiskQuizRemainingCards({ remainingCards }: RiskQuizRemainingCardsProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const text = RISK_QUIZ_TEXT[useUiLanguage()].remainingCards;
  const isTabletLayout = adaptiveLayout.isTablet;
  const labelFontSize = adaptiveLayout.fs(isTabletLayout ? 13 : 11, 10, 15);
  const valueFontSize = adaptiveLayout.fs(isTabletLayout ? 40 : 30, 24, 46);

  return (
    <View style={{ alignItems: "center" }}>
      <Text className="uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: labelFontSize }}>
        {text.label}
      </Text>
      <Text className="font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: valueFontSize }}>
        {remainingCards === null ? "…" : remainingCards}
      </Text>
    </View>
  );
}
