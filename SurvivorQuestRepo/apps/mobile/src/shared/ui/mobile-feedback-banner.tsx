import type { ViewStyle } from "react-native";
import { Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../features/onboarding/model/constants";

type MobileFeedbackBannerTone = "error" | "success" | "info";

type MobileFeedbackBannerProps = {
  message: string;
  tone?: MobileFeedbackBannerTone;
  style?: ViewStyle;
};

function resolveBannerStyles(tone: MobileFeedbackBannerTone) {
  if (tone === "error") {
    return {
      borderColor: EXPEDITION_THEME.danger,
      backgroundColor: "rgba(239, 111, 108, 0.12)",
      textColor: EXPEDITION_THEME.danger,
    };
  }

  if (tone === "success") {
    return {
      borderColor: EXPEDITION_THEME.border,
      backgroundColor: EXPEDITION_THEME.panelStrong,
      textColor: EXPEDITION_THEME.accentStrong,
    };
  }

  return {
    borderColor: EXPEDITION_THEME.border,
    backgroundColor: EXPEDITION_THEME.panelStrong,
    textColor: EXPEDITION_THEME.textMuted,
  };
}

export function MobileFeedbackBanner({ message, tone = "error", style }: MobileFeedbackBannerProps) {
  const palette = resolveBannerStyles(tone);

  return (
    <View
      className="rounded-2xl border px-3 py-2"
      style={[
        {
          borderColor: palette.borderColor,
          backgroundColor: palette.backgroundColor,
        },
        style,
      ]}
    >
      <Text className="text-sm" style={{ color: palette.textColor }}>
        {message}
      </Text>
    </View>
  );
}

