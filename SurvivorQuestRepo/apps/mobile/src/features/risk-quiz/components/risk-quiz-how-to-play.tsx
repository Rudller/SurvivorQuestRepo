import { Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { AnswerBubbleIcon, CardBackIcon, QrScannerIcon } from "./risk-quiz-icons";
import { useUiLanguage } from "../../i18n";
import { RISK_QUIZ_TEXT } from "../model/risk-quiz-text";

// The three beats of one card. Each label is split into two lines by hand so the
// columns stay the same height whatever the screen width — which is also why the
// wording lives in the text table as two fields rather than one sentence.
const STEP_ICONS = [CardBackIcon, QrScannerIcon, AnswerBubbleIcon] as const;

export function RiskQuizHowToPlay() {
  const adaptiveLayout = useAdaptiveLayout();
  const text = RISK_QUIZ_TEXT[useUiLanguage()].howToPlay;
  const isTabletLayout = adaptiveLayout.isTablet;
  const stepIconSize = adaptiveLayout.s(isTabletLayout ? 38 : 28, 24, 44);
  const stepFontSize = adaptiveLayout.fs(isTabletLayout ? 15 : 12, 11, 17);
  const footerFontSize = adaptiveLayout.fs(isTabletLayout ? 14 : 12, 11, 16);
  const stepIconMarginBottom = adaptiveLayout.s(isTabletLayout ? 12 : 8, 6, 14);
  const footerMarginTop = adaptiveLayout.s(isTabletLayout ? 26 : 20, 16, 32);
  const stepPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 20 : 12, 10, 26);

  return (
    <View style={{ width: "100%", maxWidth: 420, paddingHorizontal: stepPaddingHorizontal }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        {text.steps.map((step, stepIndex) => {
          const Icon = STEP_ICONS[stepIndex];
          return (
          <View key={step.firstLine} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ marginBottom: stepIconMarginBottom }}>
              <Icon size={stepIconSize} color={EXPEDITION_THEME.accent} />
            </View>
            <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: stepFontSize }}>
              {step.firstLine}
            </Text>
            <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: stepFontSize }}>
              {step.secondLine}
            </Text>
          </View>
          );
        })}
      </View>

      <Text
        className="text-center"
        style={{ color: EXPEDITION_THEME.textMuted, fontSize: footerFontSize, marginTop: footerMarginTop }}
      >
        {text.streakNote}
      </Text>
    </View>
  );
}
