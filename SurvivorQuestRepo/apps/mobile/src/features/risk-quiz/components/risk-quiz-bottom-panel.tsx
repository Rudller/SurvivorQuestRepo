import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { QrScannerIcon } from "./risk-quiz-icons";
import { ChamferedPanel } from "../../../shared/ui/chamfered-panel";

// Animated flame icon shown next to the streak count while it's active.
const STREAK_FIRE_GIF_URL = "https://cdn.pixabay.com/animation/2025/06/26/05/26/05-26-59-506_512.gif";

// Scale-squish-and-release "flip", matching the memory station's card flip
// (see memory-station-panel.tsx) — a true 3D rotateY/backfaceVisibility flip
// does not render reliably on react-native-web, so we swap the icon/color at
// the animation's midpoint instead, same as the proven memory-card pattern.
const FLIP_HALF_DURATION_MS = 150;

type RiskQuizBottomPanelProps = {
  remainingLabel: string;
  isCompleted: boolean;
  streak: number;
  multiplier: number;
  onOpenQrScanner: () => void;
  isScannerOpening?: boolean;
  // While a card is open, the scan button flips into a red "close" button
  // instead — closing abandons the current card client-side (no answer is
  // submitted) and returns to the idle deck view.
  isCardOpen?: boolean;
  onCloseCard?: () => void;
};

function CloseCardIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6L18 18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M18 6L6 18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function RiskQuizBottomPanel({
  remainingLabel,
  isCompleted,
  streak,
  multiplier,
  onOpenQrScanner,
  isScannerOpening = false,
  isCardOpen = false,
  onCloseCard,
}: RiskQuizBottomPanelProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const flipScaleAnimation = useRef(new Animated.Value(1)).current;
  const wasCardOpenRef = useRef(isCardOpen);
  const [showsCloseIcon, setShowsCloseIcon] = useState(isCardOpen);

  useEffect(() => {
    if (wasCardOpenRef.current === isCardOpen) {
      return;
    }
    wasCardOpenRef.current = isCardOpen;
    const swapTimeout = setTimeout(() => {
      setShowsCloseIcon(isCardOpen);
    }, FLIP_HALF_DURATION_MS);
    Animated.sequence([
      Animated.timing(flipScaleAnimation, {
        toValue: 0,
        duration: FLIP_HALF_DURATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(flipScaleAnimation, {
        toValue: 1,
        duration: FLIP_HALF_DURATION_MS,
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      clearTimeout(swapTimeout);
    };
  }, [isCardOpen, flipScaleAnimation]);

  const isTabletLayout = adaptiveLayout.isTablet;
  // 45-degree corner cuts instead of a radius: each corner reads as two hard
  // bends, matching the angular look of the expedition panels.
  const panelCut = adaptiveLayout.s(isTabletLayout ? 24 : 22, 18, 28);
  const panelBorderWidth = adaptiveLayout.s(isTabletLayout ? 3 : 2, 2, 4);
  const panelGlowRadius = adaptiveLayout.s(isTabletLayout ? 18 : 14, 12, 22);
  const panelPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 18 : 16, 14, 22);
  const panelPaddingVertical = adaptiveLayout.s(isTabletLayout ? 13 : 12, 10, 16);
  const labelFontSize = adaptiveLayout.fs(isTabletLayout ? 11 : 10, 10, 12);
  const valueFontSize = adaptiveLayout.fs(isTabletLayout ? 24 : 20, 18, 26);
  const fireIconSize = adaptiveLayout.s(isTabletLayout ? 26 : 20, 18, 30);
  const footerFontSize = adaptiveLayout.fs(isTabletLayout ? 12 : 11, 10, 13);
  const qrButtonSize = adaptiveLayout.hit(isTabletLayout ? 62 : 56);
  const qrIconSize = adaptiveLayout.s(isTabletLayout ? 34 : 30, 28, 38);
  const qrButtonMarginHorizontal = adaptiveLayout.s(isTabletLayout ? 14 : 12, 10, 16);
  const footerMarginTop = adaptiveLayout.s(isTabletLayout ? 9 : 8, 6, 10);
  const centerColumnHeight = qrButtonSize + footerMarginTop + footerFontSize * 1.25;
  const sideLabelTop = Math.max(0, centerColumnHeight / 2 - valueFontSize * 1.25);
  const footerLabel = isCardOpen
    ? "Zamknij kartę"
    : isCompleted
      ? "Realizacja zakończona"
      : isScannerOpening
        ? "Otwieranie skanera..."
        : "Skanuj kartę";
  const hasStreak = streak > 0;

  return (
    <ChamferedPanel
      cut={panelCut}
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
        paddingHorizontal: panelPaddingHorizontal,
        paddingVertical: panelPaddingVertical,
      }}
    >
      <View style={{ minHeight: centerColumnHeight, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, height: centerColumnHeight, alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Text className="uppercase tracking-widest" style={{ position: "absolute", top: sideLabelTop, color: EXPEDITION_THEME.textSubtle, fontSize: labelFontSize }}>
            Czas
          </Text>
          <Text
            className="font-extrabold"
            style={{ color: isCompleted ? EXPEDITION_THEME.danger : EXPEDITION_THEME.accentStrong, fontSize: valueFontSize }}
          >
            {remainingLabel}
          </Text>
        </View>

        <View style={{ width: qrButtonSize + qrButtonMarginHorizontal * 2, alignItems: "center" }}>
          <Pressable
            className="items-center justify-center active:opacity-90"
            style={{
              width: qrButtonSize,
              height: qrButtonSize,
              opacity: !isCardOpen && (isScannerOpening || isCompleted) ? 0.7 : 1,
            }}
            onPress={isCardOpen ? onCloseCard : onOpenQrScanner}
            disabled={isCardOpen ? false : isScannerOpening || isCompleted}
          >
            <Animated.View
              className="items-center justify-center rounded-full"
              style={{
                width: qrButtonSize,
                height: qrButtonSize,
                backgroundColor: showsCloseIcon ? "#ef4444" : isCompleted ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
                transform: [{ scaleY: flipScaleAnimation }],
              }}
            >
              {showsCloseIcon ? <CloseCardIcon size={qrIconSize} /> : <QrScannerIcon size={qrIconSize} color="#0f172a" />}
            </Animated.View>
          </Pressable>
          <Text className="text-center" style={{ marginTop: footerMarginTop, color: EXPEDITION_THEME.textSubtle, fontSize: footerFontSize }}>
            {footerLabel}
          </Text>
        </View>

        <View style={{ flex: 1, height: centerColumnHeight, alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Text
            className="uppercase tracking-widest text-center"
            numberOfLines={1}
            style={{ position: "absolute", top: sideLabelTop, color: EXPEDITION_THEME.textSubtle, fontSize: labelFontSize }}
          >
            Seria
          </Text>
          {hasStreak ? (
            <View style={{ flexDirection: "row", alignItems: "center", columnGap: 4 }}>
              <Image
                source={{ uri: STREAK_FIRE_GIF_URL }}
                style={{ width: fireIconSize, height: fireIconSize }}
              />
              <Text className="font-extrabold" style={{ color: EXPEDITION_THEME.accentStrong, fontSize: valueFontSize }}>
                x{multiplier}
              </Text>
            </View>
          ) : (
            <Text className="font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: valueFontSize }}>
              x{multiplier}
            </Text>
          )}
        </View>
      </View>
    </ChamferedPanel>
  );
}
