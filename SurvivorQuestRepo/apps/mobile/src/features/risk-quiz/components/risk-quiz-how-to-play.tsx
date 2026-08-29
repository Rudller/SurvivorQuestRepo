import { Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { CardBackIcon, QrScannerIcon, StopwatchIcon } from "./risk-quiz-icons";

// The three beats of one card. Labels are split into two lines by hand so the
// columns stay the same height whatever the screen width.
const ROUND_STEPS = [
  { Icon: CardBackIcon, firstLine: "Znajdź", secondLine: "kartę" },
  { Icon: QrScannerIcon, firstLine: "Zeskanuj", secondLine: "kod QR" },
  { Icon: StopwatchIcon, firstLine: "Zdąż", secondLine: "w czasie" },
] as const;

export function RiskQuizHowToPlay() {
  const adaptiveLayout = useAdaptiveLayout();
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
        {ROUND_STEPS.map((step) => (
          <View key={step.firstLine} style={{ flex: 1, alignItems: "center" }}>
            <View style={{ marginBottom: stepIconMarginBottom }}>
              <step.Icon size={stepIconSize} color={EXPEDITION_THEME.accent} />
            </View>
            <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: stepFontSize }}>
              {step.firstLine}
            </Text>
            <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: stepFontSize }}>
              {step.secondLine}
            </Text>
          </View>
        ))}
      </View>

      <Text
        className="text-center"
        style={{ color: EXPEDITION_THEME.textMuted, fontSize: footerFontSize, marginTop: footerMarginTop }}
      >
        Seria bez pudła mnoży punkty za kolejne karty.
      </Text>
    </View>
  );
}
