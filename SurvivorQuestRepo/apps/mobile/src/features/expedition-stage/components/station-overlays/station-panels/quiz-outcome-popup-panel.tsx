import { Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

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

  return (
    <View
      className="absolute inset-0 items-center justify-center px-6"
      style={{ zIndex: 80, backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.3)" : "rgba(15, 25, 20, 0.6)" }}
    >
      <View
        className="relative w-full max-w-md rounded-3xl border px-6 py-6"
        style={{
          borderColor: quizOutcomeAccent.border,
          backgroundColor: EXPEDITION_THEME.panel,
        }}
      >
        {isTimeoutOutcomePopup && timeoutSecondsLeft !== null ? (
          <View
            className="absolute right-4 top-4 rounded-lg border px-2 py-1"
            style={{
              borderColor: "rgba(245, 158, 11, 0.45)",
              backgroundColor: "rgba(245, 158, 11, 0.16)",
            }}
          >
            <Text className="text-xs font-bold" style={{ color: "#fcd34d" }}>
              {`${timeoutSecondsLeft}s`}
            </Text>
          </View>
        ) : null}
        <View
          className="mb-4 w-full items-center justify-center rounded-2xl border py-4"
          style={{
            borderColor: quizOutcomeAccent.border,
            backgroundColor: quizOutcomeAccent.bg,
          }}
        >
          <Text className="text-4xl font-black" style={{ color: quizOutcomeAccent.text }}>
            {quizOutcomeAccent.icon}
          </Text>
        </View>
        <Text className="text-center text-3xl font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary }}>
          {quizOutcomeTitle}
        </Text>
        <Text className="mt-3 text-center text-base leading-7" style={{ color: EXPEDITION_THEME.textMuted }}>
          {popup.message}
        </Text>
        <Pressable
          className="mt-6 h-12 w-full items-center justify-center rounded-xl px-4 py-3 active:opacity-90"
          style={{
            backgroundColor:
              popup.variant === "success"
                ? "#059669"
                : isTimeoutOutcomePopup
                  ? "#b45309"
                  : "#dc2626",
          }}
          onPress={onClose}
        >
          <Text className="w-full text-center text-base font-semibold" style={{ color: quizOutcomeButtonTextColor }}>
            {isTimeoutOutcomePopup ? text.backToMapNow : text.backToMap}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

