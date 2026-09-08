import { useEffect, useState } from "react";
import { Animated, Pressable, Text, View, useAnimatedValue } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { ChamferedPanel, PanelSurface, type PanelCornerStyle } from "../../../../../shared/ui/chamfered-panel";
import { resolveQuizOutcomePresentation, type QuizOutcomeSkinName } from "./quiz-outcome-presentation";

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
  // overlay uses. Ta skóra jest zamrożona: wygląd i brak animacji odtwarzają
  // stan sprzed odświeżenia, patrz quiz-outcome-presentation.ts.
  cornerStyle?: PanelCornerStyle;
  text: QuizOutcomePopupPanelText;
  onClose: () => void;
};

const ENTER_DURATION_MS = 260;
const EXIT_DURATION_MS = 220;
// Sekwencja drgania przepisana z triggerInvalidCodeFeedbackController
// (station-controllers.ts) — ten sam sygnał, którym odpowiada błędny kod.
const SHAKE_STEPS: { toValue: number; duration: number }[] = [
  { toValue: -10, duration: 45 },
  { toValue: 10, duration: 45 },
  { toValue: -8, duration: 40 },
  { toValue: 8, duration: 40 },
  { toValue: -4, duration: 35 },
  { toValue: 4, duration: 35 },
  { toValue: 0, duration: 35 },
];
// Pierścień nagrody — wartości z pulsującego pierścienia zadania fotograficznego.
const RING_HALF_DURATION_MS = 900;
// Oddech wariantu "czekamy na zatwierdzenie" — tempo niepilne z pulsu timera.
const BREATH_HALF_DURATION_MS = 620;

export function QuizOutcomePopupPanel({
  popup,
  timeoutSecondsLeft,
  isLightTheme,
  cornerStyle = "rounded",
  text,
  onClose,
}: QuizOutcomePopupPanelProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const presentation: QuizOutcomeSkinName = cornerStyle === "chamfered" ? "chamfered" : "rounded";
  const shouldAnimate = presentation === "rounded";

  // Popup na ekranie mapy jest kolejką (use-expedition-session.ts): prop potrafi
  // przejść z A na B bez zatrzymania na null. Dlatego treść trzymamy w stanie i
  // zależymy od wariantu oraz wiadomości, a nie od referencji obiektu.
  const [displayedPopup, setDisplayedPopup] = useState<QuizOutcomePopup | null>(popup);
  const [isMounted, setIsMounted] = useState(Boolean(popup));
  // Licznik znika w tej samej klatce, w której startuje wyjście
  // (closeQuizOutcomePopup zeruje i licznik, i popup) — bez retencji badge mrugnąłby.
  const [displayedSecondsLeft, setDisplayedSecondsLeft] = useState<number | null>(timeoutSecondsLeft);

  const revealAnimation = useAnimatedValue(popup ? 1 : 0);
  const shakeAnimation = useAnimatedValue(0);
  const glyphPopAnimation = useAnimatedValue(1);
  const ringAnimation = useAnimatedValue(0);
  const breathAnimation = useAnimatedValue(0);

  const incomingVariant = popup?.variant ?? null;
  const incomingMessage = popup?.message ?? null;

  useEffect(() => {
    if (timeoutSecondsLeft !== null) {
      setDisplayedSecondsLeft(timeoutSecondsLeft);
    }
  }, [timeoutSecondsLeft]);

  useEffect(() => {
    const hasPopup = incomingVariant !== null && incomingMessage !== null;

    if (!shouldAnimate) {
      setDisplayedPopup(hasPopup ? { variant: incomingVariant, message: incomingMessage } : null);
      setIsMounted(hasPopup);
      return;
    }

    if (hasPopup) {
      setDisplayedPopup({ variant: incomingVariant, message: incomingMessage });
      setIsMounted(true);
      revealAnimation.stopAnimation();
      // Bez zerowania drugi popup z kolejki wjechałby bez animacji — wartość
      // stoi już na 1 po poprzednim.
      revealAnimation.setValue(0);
      shakeAnimation.setValue(0);
      glyphPopAnimation.setValue(1);
      Animated.timing(revealAnimation, {
        toValue: 1,
        duration: ENTER_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }

        // Nagroda i sygnał porażki idą PO wejściu, nie równolegle — karta
        // jednocześnie wjeżdżająca i drgająca czyta się jak zacięcie klatek.
        if (incomingVariant === "success") {
          Animated.sequence([
            Animated.timing(glyphPopAnimation, { toValue: 1.12, duration: 90, useNativeDriver: true }),
            Animated.timing(glyphPopAnimation, { toValue: 1, duration: 70, useNativeDriver: true }),
          ]).start();
        }

        if (incomingVariant === "failed") {
          Animated.sequence(
            SHAKE_STEPS.map((step) =>
              Animated.timing(shakeAnimation, { ...step, useNativeDriver: true }),
            ),
          ).start();
        }
      });
      return;
    }

    revealAnimation.stopAnimation();
    Animated.timing(revealAnimation, {
      toValue: 0,
      duration: EXIT_DURATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      // `finished === false` znaczy, że w trakcie wyjścia przyszedł nowy popup i
      // przerwał animację — wtedy nie wolno zdmuchnąć świeżo ustawionej treści.
      if (finished) {
        setIsMounted(false);
        setDisplayedPopup(null);
      }
    });
  }, [shouldAnimate, incomingVariant, incomingMessage, revealAnimation, shakeAnimation, glyphPopAnimation]);

  const activeVariant = shouldAnimate ? displayedPopup?.variant : popup?.variant;

  useEffect(() => {
    if (!shouldAnimate || activeVariant !== "success") {
      return;
    }

    ringAnimation.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnimation, { toValue: 1, duration: RING_HALF_DURATION_MS, useNativeDriver: true }),
        Animated.timing(ringAnimation, { toValue: 0, duration: RING_HALF_DURATION_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();

    // Bez tego pętla przeżyje zmianę wariantu i zawiesi Jest na wyjściu workera.
    return () => loop.stop();
  }, [shouldAnimate, activeVariant, ringAnimation]);

  useEffect(() => {
    if (!shouldAnimate || activeVariant !== "pending") {
      return;
    }

    breathAnimation.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnimation, { toValue: 1, duration: BREATH_HALF_DURATION_MS, useNativeDriver: true }),
        Animated.timing(breathAnimation, { toValue: 0, duration: BREATH_HALF_DURATION_MS, useNativeDriver: true }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [shouldAnimate, activeVariant, breathAnimation]);

  const activePopup = shouldAnimate ? displayedPopup : popup;

  if (!activePopup || (shouldAnimate && !isMounted)) {
    return null;
  }

  const isTabletLayout = adaptiveLayout.isTablet;
  const isTimeoutOutcomePopup = activePopup.variant === "timeout";
  // EXPEDITION_THEME to gettery — skóra MUSI być liczona w renderze. Zamknięcie
  // jej w useMemo bez trybu motywu w zależnościach zamroziłoby kolory na tym,
  // który był aktywny przy pierwszym renderze.
  const skin = resolveQuizOutcomePresentation({
    presentation,
    variant: activePopup.variant,
    isTablet: isTabletLayout,
    isLightTheme,
    scaled: adaptiveLayout.s,
    fontScaled: adaptiveLayout.fs,
    hit: adaptiveLayout.hit,
  });
  const isChamfered = presentation === "chamfered";

  const quizOutcomeTitle = (() => {
    if (activePopup.variant === "success") {
      return text.outcomePassed;
    }
    if (isTimeoutOutcomePopup) {
      return text.outcomeTimedOut;
    }
    if (activePopup.variant === "pending") {
      return text.outcomePending;
    }
    return text.outcomeFailed;
  })();

  const glyphStyle = [
    { color: skin.glyphColor, fontSize: skin.glyphFontSize, fontWeight: "900" as const },
    shouldAnimate ? { transform: [{ scale: glyphPopAnimation }] } : null,
    shouldAnimate && skin.hasPendingBreath
      ? { opacity: breathAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }) }
      : null,
  ];

  const glyph = <Animated.Text style={glyphStyle}>{skin.glyph}</Animated.Text>;

  const panelBody = (
    <>
      {isTimeoutOutcomePopup && displayedSecondsLeft !== null ? (
        <PanelSurface
          cornerStyle={cornerStyle}
          radius={skin.countdownRadius}
          borderColor={skin.countdownBorderColor}
          borderWidth={1}
          backgroundColor={skin.countdownBackgroundColor}
          style={{
            position: "absolute",
            right: skin.countdownOffset,
            top: skin.countdownOffset,
            paddingHorizontal: skin.countdownPaddingHorizontal,
            paddingVertical: skin.countdownPaddingVertical,
          }}
        >
          <Text className="font-bold" style={{ color: skin.countdownTextColor, fontSize: skin.countdownFontSize }}>
            {`${displayedSecondsLeft}s`}
          </Text>
        </PanelSurface>
      ) : null}
      <PanelSurface
        cornerStyle={cornerStyle}
        radius={skin.wellRadius}
        borderColor={skin.wellBorderColor}
        borderWidth={1}
        backgroundColor={skin.wellBackgroundColor}
        style={{
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: skin.wellMarginBottom,
          minHeight: skin.wellMinHeight,
        }}
      >
        {skin.badgeSize > 0 ? (
          <View style={{ width: skin.badgeSize, height: skin.badgeSize, alignItems: "center", justifyContent: "center" }}>
            {skin.hasSuccessPulse ? (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  borderRadius: skin.badgeRadius,
                  borderWidth: 1,
                  borderColor: skin.ringColor,
                  opacity: ringAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                  transform: [{ scale: ringAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
                }}
              />
            ) : null}
            <View
              style={{
                width: skin.badgeSize,
                height: skin.badgeSize,
                borderRadius: skin.badgeRadius,
                borderWidth: 1,
                borderColor: skin.badgeBorderColor,
                backgroundColor: skin.badgeBackgroundColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {glyph}
            </View>
          </View>
        ) : (
          glyph
        )}
      </PanelSurface>
      <Text className="text-center font-extrabold" style={{ color: skin.titleColor, fontSize: skin.titleFontSize }}>
        {quizOutcomeTitle}
      </Text>
      <Text
        className="mt-3 self-center text-center"
        style={{
          color: skin.messageColor,
          maxWidth: skin.messageMaxWidth,
          fontSize: skin.messageFontSize,
          lineHeight: skin.messageLineHeight,
        }}
      >
        {activePopup.message}
      </Text>
      <Pressable className="w-full active:opacity-90" style={{ marginTop: skin.actionMarginTop }} onPress={onClose}>
        <PanelSurface
          cornerStyle={cornerStyle}
          radius={skin.actionRadius}
          borderColor="transparent"
          borderWidth={0}
          backgroundColor={skin.actionBackgroundColor}
          style={{
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            minHeight: skin.actionMinHeight,
            paddingHorizontal: skin.actionPaddingHorizontal,
            paddingVertical: skin.actionPaddingVertical,
          }}
        >
          <Text
            className="w-full text-center font-semibold"
            style={{ color: skin.actionLabelColor, fontSize: skin.actionLabelFontSize }}
          >
            {isTimeoutOutcomePopup ? text.backToMapNow : text.backToMap}
          </Text>
        </PanelSurface>
      </Pressable>
    </>
  );

  return (
    // Realne style props zamiast `absolute inset-0 …`: NativeWind gubi className
    // na Animated.View, a to jest kontener, bez którego popup wyleci poza ekran.
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 80,
        paddingHorizontal: skin.horizontalInset,
        backgroundColor: isLightTheme
          ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.3)`
          : `rgba(${EXPEDITION_THEME.scrimDeepRgb}, 0.6)`,
        ...(shouldAnimate ? { opacity: revealAnimation } : {}),
      }}
      // Scrim celowo NIE jest Pressable i nie ma tu pointerEvents: onClose
      // odpala quizOutcomeActionRef, które na części ścieżek zamyka całe
      // stanowisko, więc przypadkowe stuknięcie miałoby konsekwencje. Nie
      // ujednolicać z klikalnym already-completed-notice, który jest czysto
      // informacyjny.
    >
      {isChamfered ? (
        <ChamferedPanel
          cut={skin.cardRadius}
          backgroundColor={skin.cardBackgroundColor}
          borderColor={skin.cardBorderColor}
          borderWidth={skin.cardBorderWidth}
          glowColor={EXPEDITION_THEME.accent}
          glowRadius={skin.glowRadius}
          glowOpacity={0.55}
          glowPulse
          texture="cross-hatch"
          textureColor={EXPEDITION_THEME.accent}
          textureOpacity={0.08}
          textureScale={1.3}
          style={{
            width: "100%",
            maxWidth: skin.cardMaxWidth,
            paddingHorizontal: skin.cardPaddingHorizontal,
            paddingVertical: skin.cardPaddingVertical,
          }}
        >
          {panelBody}
        </ChamferedPanel>
      ) : (
        <Animated.View
          style={{
            position: "relative",
            width: "100%",
            maxWidth: skin.cardMaxWidth,
            borderWidth: skin.cardBorderWidth,
            borderRadius: skin.cardRadius,
            paddingHorizontal: skin.cardPaddingHorizontal,
            paddingVertical: skin.cardPaddingVertical,
            borderColor: skin.cardBorderColor,
            backgroundColor: skin.cardBackgroundColor,
            opacity: revealAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
            transform: [
              { translateX: shakeAnimation },
              { translateY: revealAnimation.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              { scale: revealAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          }}
        >
          {panelBody}
        </Animated.View>
      )}
    </Animated.View>
  );
}
