import { Text, View, useWindowDimensions } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

const TABLET_MIN_SHORT_EDGE = 700;
const TABLET_MIN_WIDTH = 900;

type AttemptsIndicatorProps = {
  label: string;
  attemptsLeft: number;
  maxAttempts: number;
  align?: "left" | "center";
};

export function useStationPanelLayout() {
  const { width, height } = useWindowDimensions();
  const shortestEdge = Math.min(width, height);
  const isTablet = width >= TABLET_MIN_WIDTH || shortestEdge >= TABLET_MIN_SHORT_EDGE;

  return {
    isTablet,
    infoFontSize: isTablet ? 14 : 12,
    inputFontSize: isTablet ? 17 : 14,
    actionFontSize: isTablet ? 16 : 13,
    actionMinHeight: isTablet ? 54 : 44,
    resultFontSize: isTablet ? 14 : 12,
  };
}

export function AttemptsIndicator({
  label,
  attemptsLeft,
  maxAttempts,
  align = "left",
}: AttemptsIndicatorProps) {
  const { isTablet, infoFontSize } = useStationPanelLayout();
  const safeMax = Math.max(1, maxAttempts);
  const safeLeft = Math.max(0, Math.min(safeMax, attemptsLeft));
  const lowAttempts = safeLeft <= 1;
  const activeDotColor = lowAttempts ? EXPEDITION_THEME.danger : EXPEDITION_THEME.accentStrong;
  const dotSize = isTablet ? 10 : 8;

  return (
    <View
      className={`flex-row items-center ${align === "center" ? "justify-center" : "justify-between"}`}
      style={{ columnGap: isTablet ? 10 : 8 }}
    >
      <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: infoFontSize }}>
        {label}: {safeLeft}
      </Text>
      <View className="flex-row items-center" style={{ columnGap: isTablet ? 8 : 6 }}>
        {Array.from({ length: safeMax }).map((_, index) => {
          const isActive = index < safeLeft;
          return (
            <View
              key={`attempt-dot-${index}`}
              className="rounded-full border"
              style={{
                width: dotSize,
                height: dotSize,
                borderColor: isActive ? activeDotColor : EXPEDITION_THEME.border,
                backgroundColor: isActive ? activeDotColor : "transparent",
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
