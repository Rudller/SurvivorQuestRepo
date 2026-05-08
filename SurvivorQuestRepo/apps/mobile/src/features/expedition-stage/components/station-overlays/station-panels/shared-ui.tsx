import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
const RGB_COLOR_PATTERN = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+)\s*)?\)$/i;

type AttemptsIndicatorProps = {
  label: string;
  attemptsLeft: number;
  maxAttempts: number;
  align?: "left" | "center";
};

export function useStationPanelLayout() {
  const adaptiveLayout = useAdaptiveLayout();
  const isTablet = adaptiveLayout.isTablet;

  return {
    isTablet,
    infoFontSize: adaptiveLayout.fs(isTablet ? 14 : 12, 11, 16),
    inputFontSize: adaptiveLayout.fs(isTablet ? 17 : 14, 13, 20),
    actionFontSize: adaptiveLayout.fs(isTablet ? 16 : 13, 12, 19),
    actionMinHeight: adaptiveLayout.hit(isTablet ? 54 : 44),
    resultFontSize: adaptiveLayout.fs(isTablet ? 14 : 12, 11, 16),
    attemptDotSize: adaptiveLayout.s(isTablet ? 10 : 8, 7, 14),
    attemptRowGap: adaptiveLayout.s(isTablet ? 10 : 8, 6, 12),
    attemptDotGap: adaptiveLayout.s(isTablet ? 8 : 6, 4, 10),
  };
}

export function resolveActionLabelColor(isActionDisabled: boolean) {
  if (isActionDisabled) {
    return EXPEDITION_THEME.textMuted;
  }

  return getExpeditionThemeMode() === "light" ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background;
}

export function AttemptsIndicator({
  label,
  attemptsLeft,
  maxAttempts,
  align = "left",
}: AttemptsIndicatorProps) {
  const { infoFontSize, attemptDotSize, attemptRowGap, attemptDotGap } = useStationPanelLayout();
  const safeMax = Math.max(1, maxAttempts);
  const safeLeft = Math.max(0, Math.min(safeMax, attemptsLeft));
  const lowAttempts = safeLeft <= 1;
  const activeDotColor = lowAttempts ? EXPEDITION_THEME.danger : EXPEDITION_THEME.accentStrong;

  return (
    <View
      className={`flex-row items-center ${align === "center" ? "justify-center" : "justify-between"}`}
      style={{ columnGap: attemptRowGap }}
    >
      <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: infoFontSize }}>
        {label}: {safeLeft}
      </Text>
      <View className="flex-row items-center" style={{ columnGap: attemptDotGap }}>
        {Array.from({ length: safeMax }).map((_, index) => {
          const isActive = index < safeLeft;
          return (
            <View
              key={`attempt-dot-${index}`}
              className="rounded-full border"
              style={{
                width: attemptDotSize,
                height: attemptDotSize,
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

type StationQuizTaskWrapperProps = {
  prompt: string;
  hidePrompt?: boolean;
  isTabletOverlay: boolean;
  children: ReactNode;
  error?: string | null;
  errorPlacement?: "inside" | "outside";
  showBorder?: boolean;
  className?: string;
  footer?: ReactNode;
};

export function StationQuizTaskWrapper({
  prompt,
  hidePrompt = false,
  isTabletOverlay,
  children,
  error = null,
  errorPlacement = "inside",
  showBorder = true,
  className,
  footer,
}: StationQuizTaskWrapperProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const errorMessage = error ? (
    <Text
      className="mt-2 text-center"
      style={{ color: EXPEDITION_THEME.danger, fontSize: adaptiveLayout.fs(isTabletOverlay ? 14 : 12, 11, 17) }}
    >
      {error}
    </Text>
  ) : null;

  return (
    <View className={className}>
      <View
        className={`rounded-2xl${showBorder ? " border" : ""}`}
        style={{
          ...(showBorder ? { borderColor: EXPEDITION_THEME.border } : {}),
          backgroundColor: EXPEDITION_THEME.panelMuted,
        }}
      >
        {!hidePrompt ? (
          <Text
            className="font-semibold"
            style={{
              color: EXPEDITION_THEME.textPrimary,
              fontSize: adaptiveLayout.fs(isTabletOverlay ? 21 : 16, 15, 25),
              paddingHorizontal: adaptiveLayout.s(12, 10, 16),
              paddingTop: adaptiveLayout.s(12, 10, 16),
            }}
          >
            {prompt}
          </Text>
        ) : null}
        <View
          style={{
            paddingHorizontal: adaptiveLayout.s(12, 10, 16),
            paddingBottom: adaptiveLayout.s(12, 10, 16),
          }}
        >
          {children}
        </View>

        {errorPlacement === "inside" ? errorMessage : null}
      </View>
      {footer}
      {errorPlacement === "outside" ? errorMessage : null}
    </View>
  );
}

function clampAlpha(alpha: number) {
  return Math.max(0, Math.min(1, alpha));
}

export function withAlpha(color: string, alpha: number) {
  const normalizedAlpha = clampAlpha(alpha);
  const normalizedColor = color.trim();

  if (normalizedColor.startsWith("#")) {
    const hex = normalizedColor.slice(1);
    const expandedHex =
      hex.length === 3
        ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
        : hex.length === 6
          ? hex
          : null;

    if (expandedHex) {
      const red = Number.parseInt(expandedHex.slice(0, 2), 16);
      const green = Number.parseInt(expandedHex.slice(2, 4), 16);
      const blue = Number.parseInt(expandedHex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${normalizedAlpha})`;
    }
  }

  const rgbMatch = normalizedColor.match(RGB_COLOR_PATTERN);
  if (rgbMatch) {
    const [, red, green, blue] = rgbMatch;
    return `rgba(${red}, ${green}, ${blue}, ${normalizedAlpha})`;
  }

  return color;
}

