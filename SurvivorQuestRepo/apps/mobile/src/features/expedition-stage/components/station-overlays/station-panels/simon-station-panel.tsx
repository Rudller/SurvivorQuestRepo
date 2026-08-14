import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { MOBILE_UX_TOKENS } from "../../../../../shared/ui/ux-tokens";
import { SIMON_BUTTONS } from "../puzzle-helpers";
import { useStationPanelLayout } from "./shared-ui";

type SimonStationPanelProps = {
  stationId: string;
  simonSequence: string[];
  simonTargetLength: number;
  simonProgress: number;
  simonActivePlaybackButtonId: string | null;
  simonActiveInputButtonId: string | null;
  isSimonPlaybackActive: boolean;
  isInteractiveLocked: boolean;
  isSubmittingSimon: boolean;
  isSequenceStarted: boolean;
  onStartSequence: () => void;
  onPressButton: (buttonId: string) => void;
};

type SimonStationText = {
  mistakes: string;
  button: string;
  start: string;
};

const SIMON_STATION_TEXT_ENGLISH: SimonStationText = {
  mistakes: "Mistakes",
  button: "Button",
  start: "Start",
};

const SIMON_STATION_TEXT: Record<UiLanguage, SimonStationText> = {
  polish: {
    mistakes: "Błędy",
    button: "Przycisk",
    start: "Rozpocznij",
  },
  english: SIMON_STATION_TEXT_ENGLISH,
  ukrainian: {
    mistakes: "Помилки",
    button: "Кнопка",
    start: "Почати",
  },
  russian: {
    mistakes: "Ошибки",
    button: "Кнопка",
    start: "Начать",
  },
};

export function SimonStationPanel({
  stationId,
  simonSequence,
  simonTargetLength,
  simonProgress,
  simonActivePlaybackButtonId,
  simonActiveInputButtonId,
  isSimonPlaybackActive,
  isInteractiveLocked,
  isSubmittingSimon,
  isSequenceStarted,
  onStartSequence,
  onPressButton,
}: SimonStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = SIMON_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const [gridAreaSize, setGridAreaSize] = useState(0);
  const simonButtonGap = layout.isTablet ? 12 : 8;
  const defaultGridAreaSize = layout.isTablet ? 420 : 280;
  // The grid-area wrapper below is flex-1 inside a flex-1 root that itself
  // fills the height-bounded media box (see station-renderers.tsx), so its
  // measured size is exactly the space left over after the mistake dots and
  // progress row below it — sizing off both dimensions (not just width) is
  // what keeps the 3x3 grid fitted to the container instead of being
  // clipped by the box's overflow:hidden.
  const resolvedGridAreaSize = gridAreaSize > 0 ? gridAreaSize : defaultGridAreaSize;
  const simonButtonSize = Math.max(
    MOBILE_UX_TOKENS.minTouchTarget,
    Math.floor((resolvedGridAreaSize - simonButtonGap * 2) / 3),
  );
  const safeSequenceLength = Math.max(1, Math.min(simonTargetLength, simonSequence.length));

  return (
    <View className="flex-1">
      <View
        className="flex-1 items-center justify-center"
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          const measuredSize = Math.floor(Math.min(width, height));
          if (measuredSize > 0 && measuredSize !== gridAreaSize) {
            setGridAreaSize(measuredSize);
          }
        }}
      >
        {!isSequenceStarted ? (
          <Pressable
            className={`items-center justify-center rounded-full border ${MOBILE_UX_TOKENS.activePressClass}`}
            style={{
              width: simonButtonSize * 3 + simonButtonGap * 2,
              height: simonButtonSize * 3 + simonButtonGap * 2,
              borderRadius: (simonButtonSize * 3 + simonButtonGap * 2) / 2,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.accent,
            }}
            onPress={onStartSequence}
            accessibilityRole="button"
            accessibilityLabel={text.start}
          >
            <Text
              className="font-semibold text-center"
              style={{ color: EXPEDITION_THEME.background, fontSize: layout.actionFontSize }}
            >
              {text.start}
            </Text>
          </Pressable>
        ) : (
        <View
          className="flex-row flex-wrap items-center justify-center"
          style={{
            width: simonButtonSize * 3 + simonButtonGap * 2,
            columnGap: simonButtonGap,
            rowGap: simonButtonGap,
          }}
        >
          {SIMON_BUTTONS.map((button) => (
            (() => {
              const isPlaybackTarget =
                simonActivePlaybackButtonId === button.id ||
                simonActiveInputButtonId === button.id;
              const isButtonDisabled =
                isInteractiveLocked ||
                isSubmittingSimon ||
                isSimonPlaybackActive ||
                simonProgress >= safeSequenceLength;
              return (
            <Pressable
              key={`${stationId}-simon-${button.id}`}
              className={`items-center justify-center rounded-full border ${MOBILE_UX_TOKENS.activePressClass}`}
              style={{
                width: simonButtonSize,
                height: simonButtonSize,
                borderRadius: simonButtonSize / 2,
                  borderWidth: isPlaybackTarget ? 3 : 1,
                  borderColor: isPlaybackTarget ? "rgba(255, 255, 255, 0.95)" : EXPEDITION_THEME.border,
                  backgroundColor: button.color,
                  opacity: isButtonDisabled
                    ? MOBILE_UX_TOKENS.disabledOpacity
                    : isPlaybackTarget
                      ? 0.92
                      : 0.72,
                  transform: [{ scale: isPlaybackTarget ? 1.08 : 1 }],
                  shadowColor: "#ffffff",
                  shadowOpacity: isPlaybackTarget ? 0.5 : 0,
                  shadowRadius: isPlaybackTarget ? 10 : 0,
                 shadowOffset: { width: 0, height: 0 },
              }}
              onPress={() => {
                onPressButton(button.id);
              }}
              disabled={isButtonDisabled}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`${text.button} ${button.id}`}
              accessibilityState={{
                disabled: isButtonDisabled,
                selected: isPlaybackTarget,
                busy: isSubmittingSimon || isSimonPlaybackActive,
              }}
            />
              );
            })()
          ))}
        </View>
        )}
      </View>
    </View>
  );
}

type SimonMistakesRowProps = {
  simonMistakes: number;
  simonMaxMistakes: number;
};

// Rendered outside the media-panel box (preview.tsx), next to SimonProgressRow.
export function SimonMistakesRow({ simonMistakes, simonMaxMistakes }: SimonMistakesRowProps) {
  const uiLanguage = useUiLanguage();
  const text = SIMON_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const safeMaxMistakes = Math.max(1, simonMaxMistakes);
  const visibleMistakes = Math.max(0, Math.min(simonMistakes, safeMaxMistakes));

  return (
    <View>
      <View className="flex-row items-center justify-center" style={{ columnGap: layout.attemptDotGap }}>
        {Array.from({ length: safeMaxMistakes }).map((_, index) => (
          <View
            key={`simon-mistake-${index}`}
            className="rounded-full"
            style={{
              width: layout.isTablet ? 24 : 18,
              height: layout.isTablet ? 24 : 18,
              backgroundColor:
                index < visibleMistakes ? EXPEDITION_THEME.danger : "rgba(148, 163, 184, 0.3)",
            }}
          />
        ))}
      </View>
      <Text className="mt-1 text-center" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.infoFontSize }}>
        {text.mistakes}: {visibleMistakes}/{safeMaxMistakes}
      </Text>
    </View>
  );
}
