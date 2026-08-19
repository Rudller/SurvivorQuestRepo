import { Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../shared/layout/use-adaptive-layout";

export type AlreadyCompletedNotice = {
  variant: "success" | "failed" | "pending";
  message: string;
};

type AlreadyCompletedNoticeOverlayProps = {
  notice: AlreadyCompletedNotice | null;
  isLightTheme: boolean;
  onDismiss: () => void;
};

// Shown instead of the "launching..." prestart screen when a station is
// tapped/scanned but is already done/failed — informational only, so it
// never opens the full station overlay and auto-dismisses on its own
// (see the timer in use-expedition-stage-overlay-flow.ts). Mirrors
// QuizOutcomePopupPanel's look without that panel's button/timeout/
// difficulty concerns, which don't apply here.
export function AlreadyCompletedNoticeOverlay({ notice, isLightTheme, onDismiss }: AlreadyCompletedNoticeOverlayProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;

  if (!notice) {
    return null;
  }

  const accent =
    notice.variant === "success"
      ? { border: "rgba(16, 185, 129, 0.55)", bg: "rgba(16, 185, 129, 0.18)", text: "#6ee7b7", icon: "✓" }
      : notice.variant === "pending"
        ? { border: "rgba(251, 191, 36, 0.55)", bg: "rgba(251, 191, 36, 0.16)", text: "#fde68a", icon: "⏳" }
        : { border: "rgba(239, 68, 68, 0.55)", bg: "rgba(239, 68, 68, 0.16)", text: "#fca5a5", icon: "✕" };
  const horizontalInset = adaptiveLayout.s(isTabletLayout ? 44 : 24, 18, 56);
  const panelMaxWidth = adaptiveLayout.s(isTabletLayout ? 420 : 300, 240, 460);
  const panelRadius = adaptiveLayout.s(isTabletLayout ? 32 : 24, 18, 40);
  const panelPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 32 : 24, 18, 38);
  const panelPaddingVertical = adaptiveLayout.s(isTabletLayout ? 40 : 32, 24, 48);

  return (
    <Pressable
      className="absolute inset-0 items-center justify-center"
      style={{
        zIndex: 80,
        paddingHorizontal: horizontalInset,
        backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.3)" : "rgba(15, 25, 20, 0.6)",
      }}
      onPress={onDismiss}
    >
      <Pressable
        className="w-full items-center border"
        style={{
          maxWidth: panelMaxWidth,
          borderRadius: panelRadius,
          paddingHorizontal: panelPaddingHorizontal,
          paddingVertical: panelPaddingVertical,
          borderColor: accent.border,
          backgroundColor: EXPEDITION_THEME.panel,
        }}
        onPress={(event) => event.stopPropagation()}
      >
        <View
          className="items-center justify-center border"
          style={{
            width: adaptiveLayout.s(isTabletLayout ? 84 : 68, 56, 100),
            height: adaptiveLayout.s(isTabletLayout ? 84 : 68, 56, 100),
            borderRadius: adaptiveLayout.s(isTabletLayout ? 20 : 16, 12, 26),
            borderColor: accent.border,
            backgroundColor: accent.bg,
          }}
        >
          <Text
            className="font-black"
            style={{ color: accent.text, fontSize: adaptiveLayout.fs(isTabletLayout ? 36 : 28, 24, 44) }}
          >
            {accent.icon}
          </Text>
        </View>
        <Text
          className="mt-4 text-center font-bold"
          style={{
            color: EXPEDITION_THEME.textPrimary,
            fontSize: adaptiveLayout.fs(isTabletLayout ? 26 : 21, 18, 30),
            lineHeight: adaptiveLayout.s(isTabletLayout ? 34 : 28, 24, 40),
          }}
        >
          {notice.message}
        </Text>
      </Pressable>
    </Pressable>
  );
}
