import { Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { ChamferedPanel, PanelSurface, type PanelCornerStyle } from "../../../../../shared/ui/chamfered-panel";

export type QuizOutcomePopup = {
  variant: "success" | "failed" | "timeout" | "pending";
  message: string;
};

type QuizOutcomePopupPanelText = {
  outcomePassed: string;
  outcomeTimedOut: string;
  outcomeFailed: string;
  outcomePending: string;
  backToMapNow: string;
  backToMap: string;
};

type QuizOutcomePopupPanelProps = {
  popup: QuizOutcomePopup | null;
  timeoutSecondsLeft: number | null;
  isLightTheme: boolean;
  // "chamfered" dresses the popup as one more of Ryzykanci's card-table
  // panels — 45-degree corners, the heavy gold outline and the pulsing bloom
  // the bottom bar carries — instead of the rounded card the expedition
  // overlay uses. The outcome colour stays on the icon box and the button,
  // which is what actually says passed/failed.
  cornerStyle?: PanelCornerStyle;
  text: QuizOutcomePopupPanelText;
  onClose: () => void;
};

export function QuizOutcomePopupPanel({
  popup,
  timeoutSecondsLeft,
  isLightTheme,
  cornerStyle = "rounded",
  text,
  onClose,
}: QuizOutcomePopupPanelProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;

  if (!popup) {
    return null;
  }

  const isTimeoutOutcomePopup = popup.variant === "timeout";
  const isPendingOutcomePopup = popup.variant === "pending";
  const quizOutcomeTitle = (() => {
    if (popup.variant === "success") {
      return text.outcomePassed;
    }
    if (isTimeoutOutcomePopup) {
      return text.outcomeTimedOut;
    }
    if (isPendingOutcomePopup) {
      return text.outcomePending;
    }
    return text.outcomeFailed;
  })();
  const quizOutcomeAccent =
    popup.variant === "success"
      ? { border: "rgba(16, 185, 129, 0.55)", bg: "rgba(16, 185, 129, 0.18)", text: "#6ee7b7", icon: "✓" }
      : isTimeoutOutcomePopup || isPendingOutcomePopup
        ? { border: "rgba(245, 158, 11, 0.55)", bg: "rgba(245, 158, 11, 0.16)", text: "#fcd34d", icon: "⏳" }
        : { border: "rgba(239, 68, 68, 0.55)", bg: "rgba(239, 68, 68, 0.16)", text: "#fca5a5", icon: "✕" };
  const quizOutcomeButtonTextColor = isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.textPrimary;
  const horizontalInset = adaptiveLayout.s(isTabletLayout ? 44 : 24, 18, 56);
  const panelMaxWidth = adaptiveLayout.s(isTabletLayout ? 760 : 460, 340, 840);
  const panelRadius = adaptiveLayout.s(isTabletLayout ? 32 : 24, 18, 40);
  const panelPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 28 : 20, 16, 34);
  const panelPaddingVertical = adaptiveLayout.s(isTabletLayout ? 30 : 22, 18, 36);
  const actionMinHeight = adaptiveLayout.hit(isTabletLayout ? 64 : 50);
  const isChamfered = cornerStyle === "chamfered";
  // Same weights the bottom bar uses for its own surface.
  const panelBorderWidth = isChamfered ? adaptiveLayout.s(isTabletLayout ? 3 : 2, 2, 4) : 1;
  const panelGlowRadius = adaptiveLayout.s(isTabletLayout ? 18 : 14, 12, 22);
  const iconBoxRadius = adaptiveLayout.s(isTabletLayout ? 20 : 14, 12, 26);
  const iconBoxMinHeight = adaptiveLayout.s(isTabletLayout ? 110 : 84, 72, 140);
  const iconBoxMarginBottom = adaptiveLayout.s(isTabletLayout ? 22 : 16, 12, 28);
  const actionRadius = adaptiveLayout.s(isTabletLayout ? 16 : 12, 10, 20);
  const actionMarginTop = adaptiveLayout.s(isTabletLayout ? 28 : 24, 18, 34);
  const actionPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 16 : 12, 10, 20);
  const actionPaddingVertical = adaptiveLayout.s(isTabletLayout ? 14 : 10, 8, 18);
  const actionBackgroundColor =
    popup.variant === "success"
      ? "#059669"
      : isTimeoutOutcomePopup || isPendingOutcomePopup
        ? "#b45309"
        : "#dc2626";
  const panelBody = (
    <>
      {isTimeoutOutcomePopup && timeoutSecondsLeft !== null ? (
        <PanelSurface
          cornerStyle={cornerStyle}
          radius={adaptiveLayout.s(isTabletLayout ? 12 : 9, 8, 16)}
          borderColor="rgba(245, 158, 11, 0.45)"
          borderWidth={1}
          backgroundColor="rgba(245, 158, 11, 0.16)"
          style={{
            position: "absolute",
            right: adaptiveLayout.s(isTabletLayout ? 20 : 14, 10, 24),
            top: adaptiveLayout.s(isTabletLayout ? 20 : 14, 10, 24),
            paddingHorizontal: adaptiveLayout.s(isTabletLayout ? 10 : 8, 7, 14),
            paddingVertical: adaptiveLayout.s(isTabletLayout ? 6 : 4, 3, 8),
          }}
        >
          <Text
            className="font-bold"
            style={{ color: "#fcd34d", fontSize: adaptiveLayout.fs(isTabletLayout ? 14 : 12, 10, 17) }}
          >
            {`${timeoutSecondsLeft}s`}
          </Text>
        </PanelSurface>
      ) : null}
      <PanelSurface
        cornerStyle={cornerStyle}
        radius={iconBoxRadius}
        borderColor={quizOutcomeAccent.border}
        borderWidth={1}
        backgroundColor={quizOutcomeAccent.bg}
        style={{
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: iconBoxMarginBottom,
          minHeight: iconBoxMinHeight,
        }}
      >
        <Text
          className="font-black"
          style={{ color: quizOutcomeAccent.text, fontSize: adaptiveLayout.fs(isTabletLayout ? 52 : 38, 32, 62) }}
        >
          {quizOutcomeAccent.icon}
        </Text>
      </PanelSurface>
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
      <Pressable className="w-full active:opacity-90" style={{ marginTop: actionMarginTop }} onPress={onClose}>
        <PanelSurface
          cornerStyle={cornerStyle}
          radius={actionRadius}
          borderColor="transparent"
          borderWidth={0}
          backgroundColor={actionBackgroundColor}
          style={{
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            minHeight: actionMinHeight,
            paddingHorizontal: actionPaddingHorizontal,
            paddingVertical: actionPaddingVertical,
          }}
        >
          <Text
            className="w-full text-center font-semibold"
            style={{ color: quizOutcomeButtonTextColor, fontSize: adaptiveLayout.fs(isTabletLayout ? 23 : 16, 14, 27) }}
          >
            {isTimeoutOutcomePopup ? text.backToMapNow : text.backToMap}
          </Text>
        </PanelSurface>
      </Pressable>
    </>
  );

  return (
    <View
      className="absolute inset-0 items-center justify-center"
      style={{
        zIndex: 80,
        paddingHorizontal: horizontalInset,
        backgroundColor: isLightTheme ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.3)` : `rgba(${EXPEDITION_THEME.scrimDeepRgb}, 0.6)`,
      }}
    >
      {isChamfered ? (
        <ChamferedPanel
          cut={panelRadius}
          backgroundColor={EXPEDITION_THEME.panel}
          borderColor={EXPEDITION_THEME.border}
          borderWidth={panelBorderWidth}
          glowColor={EXPEDITION_THEME.accent}
          glowRadius={panelGlowRadius}
          glowOpacity={0.55}
          glowPulse
          texture="cross-hatch"
          textureColor={EXPEDITION_THEME.accent}
          textureOpacity={0.08}
          textureScale={1.3}
          style={{
            width: "100%",
            maxWidth: panelMaxWidth,
            paddingHorizontal: panelPaddingHorizontal,
            paddingVertical: panelPaddingVertical,
          }}
        >
          {panelBody}
        </ChamferedPanel>
      ) : (
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
          {panelBody}
        </View>
      )}
    </View>
  );
}
