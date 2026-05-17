import { Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";

export type QuizOutcomePopup = {
  variant: "success" | "failed" | "timeout";
  message: string;
};

type QuizOutcomePopupPanelText = {
  outcomePassed: string;
  outcomeTimedOut: string;
  outcomeFailed: string;
  backToMapNow: string;
  backToMap: string;
};

type QuizOutcomePopupPanelProps = {
  popup: QuizOutcomePopup | null;
  timeoutSecondsLeft: number | null;
  isLightTheme: boolean;
  text: QuizOutcomePopupPanelText;
  onClose: () => void;
};

export function QuizOutcomePopupPanel({
  popup,
  timeoutSecondsLeft,
  isLightTheme,
  text,
  onClose,
}: QuizOutcomePopupPanelProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;

  if (!popup) {
    return null;
  }

  const isTimeoutOutcomePopup = popup.variant === "timeout";
  const quizOutcomeTitle = (() => {
    if (popup.variant === "success") {
      return text.outcomePassed;
    }
    if (isTimeoutOutcomePopup) {
      return text.outcomeTimedOut;
    }
    return text.outcomeFailed;
  })();
  const quizOutcomeAccent =
    popup.variant === "success"
      ? { border: "rgba(16, 185, 129, 0.55)", bg: "rgba(16, 185, 129, 0.18)", text: "#6ee7b7", icon: "✓" }
      : isTimeoutOutcomePopup
        ? { border: "rgba(245, 158, 11, 0.55)", bg: "rgba(245, 158, 11, 0.16)", text: "#fcd34d", icon: "⏳" }
        : { border: "rgba(239, 68, 68, 0.55)", bg: "rgba(239, 68, 68, 0.16)", text: "#fca5a5", icon: "✕" };
  const quizOutcomeButtonTextColor = isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.textPrimary;
  const horizontalInset = adaptiveLayout.s(isTabletLayout ? 44 : 24, 18, 56);
  const panelMaxWidth = adaptiveLayout.s(isTabletLayout ? 760 : 460, 340, 840);
  const panelRadius = adaptiveLayout.s(isTabletLayout ? 32 : 24, 18, 40);
  const panelPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 28 : 20, 16, 34);
  const panelPaddingVertical = adaptiveLayout.s(isTabletLayout ? 30 : 22, 18, 36);
  const actionMinHeight = adaptiveLayout.hit(isTabletLayout ? 64 : 50);

  return (
    <View
      className="absolute inset-0 items-center justify-center"
      style={{
        zIndex: 80,
        paddingHorizontal: horizontalInset,
        backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.3)" : "rgba(15, 25, 20, 0.6)",
      }}
    >
      <View
        className="relative w-full border"
        style={{
          maxWidth: panelMaxWidth,
          borderRadius: panelRadius,
          paddingHorizontal: panelPaddingHorizontal,
          paddingVertical: panelPaddingVertical,
          borderColor: quizOutcomeAccent.border,
          backgroundColor: EXPEDITION_THEME.panel,
        }}
      >
        {isTimeoutOutcomePopup && timeoutSecondsLeft !== null ? (
          <View
            className="absolute border"
            style={{
              right: adaptiveLayout.s(isTabletLayout ? 20 : 14, 10, 24),
              top: adaptiveLayout.s(isTabletLayout ? 20 : 14, 10, 24),
              borderRadius: adaptiveLayout.s(isTabletLayout ? 12 : 9, 8, 16),
              paddingHorizontal: adaptiveLayout.s(isTabletLayout ? 10 : 8, 7, 14),
              paddingVertical: adaptiveLayout.s(isTabletLayout ? 6 : 4, 3, 8),
              borderColor: "rgba(245, 158, 11, 0.45)",
              backgroundColor: "rgba(245, 158, 11, 0.16)",
            }}
          >
            <Text
              className="font-bold"
              style={{ color: "#fcd34d", fontSize: adaptiveLayout.fs(isTabletLayout ? 14 : 12, 10, 17) }}
            >
              {`${timeoutSecondsLeft}s`}
            </Text>
          </View>
        ) : null}
        <View
          className="w-full items-center justify-center border"
          style={{
            marginBottom: adaptiveLayout.s(isTabletLayout ? 22 : 16, 12, 28),
            borderRadius: adaptiveLayout.s(isTabletLayout ? 20 : 14, 12, 26),
            minHeight: adaptiveLayout.s(isTabletLayout ? 110 : 84, 72, 140),
            borderColor: quizOutcomeAccent.border,
            backgroundColor: quizOutcomeAccent.bg,
          }}
        >
          <Text
            className="font-black"
            style={{ color: quizOutcomeAccent.text, fontSize: adaptiveLayout.fs(isTabletLayout ? 52 : 38, 32, 62) }}
          >
            {quizOutcomeAccent.icon}
          </Text>
        </View>
        <Text
          className="text-center font-extrabold"
          style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletLayout ? 42 : 30, 26, 50) }}
        >
          {quizOutcomeTitle}
        </Text>
        <Text
          className="mt-3 self-center text-center"
          style={{
            color: EXPEDITION_THEME.textMuted,
            maxWidth: adaptiveLayout.s(isTabletLayout ? 620 : 400, 280, 700),
            fontSize: adaptiveLayout.fs(isTabletLayout ? 21 : 16, 14, 25),
            lineHeight: adaptiveLayout.s(isTabletLayout ? 34 : 28, 24, 40),
          }}
        >
          {popup.message}
        </Text>
        <Pressable
          className="w-full items-center justify-center active:opacity-90"
          style={{
            marginTop: adaptiveLayout.s(isTabletLayout ? 28 : 24, 18, 34),
            borderRadius: adaptiveLayout.s(isTabletLayout ? 16 : 12, 10, 20),
            minHeight: actionMinHeight,
            paddingHorizontal: adaptiveLayout.s(isTabletLayout ? 16 : 12, 10, 20),
            paddingVertical: adaptiveLayout.s(isTabletLayout ? 14 : 10, 8, 18),
            backgroundColor:
              popup.variant === "success"
                ? "#059669"
                : isTimeoutOutcomePopup
                  ? "#b45309"
                  : "#dc2626",
          }}
          onPress={onClose}
        >
          <Text
            className="w-full text-center font-semibold"
            style={{ color: quizOutcomeButtonTextColor, fontSize: adaptiveLayout.fs(isTabletLayout ? 23 : 16, 14, 27) }}
          >
            {isTimeoutOutcomePopup ? text.backToMapNow : text.backToMap}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

