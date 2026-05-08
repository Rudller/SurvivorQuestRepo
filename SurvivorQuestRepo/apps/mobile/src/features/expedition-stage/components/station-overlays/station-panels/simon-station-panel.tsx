import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
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
  simonResult: string | null;
  isInteractiveLocked: boolean;
  isSubmittingSimon: boolean;
  onPressButton: (buttonId: string) => void;
};

type SimonStationText = {
  progress: string;
};

const SIMON_STATION_TEXT_ENGLISH: SimonStationText = {
  progress: "Progress",
};

const SIMON_STATION_TEXT: Record<UiLanguage, SimonStationText> = {
  polish: {
    progress: "Postęp",
  },
  english: SIMON_STATION_TEXT_ENGLISH,
  ukrainian: {
    progress: "Прогрес",
  },
  russian: {
    progress: "Прогресс",
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
  simonResult,
  isInteractiveLocked,
  isSubmittingSimon,
  onPressButton,
}: SimonStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = SIMON_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const [gridWidth, setGridWidth] = useState(0);
  const simonButtonGap = layout.isTablet ? 12 : 8;
  const defaultGridWidth = layout.isTablet ? 420 : 312;
  const simonButtonSize =
    Math.floor(
      ((gridWidth > 0 ? gridWidth : defaultGridWidth) - simonButtonGap * 2) / 3,
    );
  const safeSequenceLength = Math.max(1, Math.min(simonTargetLength, simonSequence.length));

  return (
    <View className="mt-3">
      <View className="flex-row items-center justify-center" style={{ columnGap: layout.attemptDotGap }}>
        {Array.from({ length: safeSequenceLength }).map((_, index) => (
          <View
            key={`${stationId}-simon-progress-${index}`}
            className="rounded-full"
            style={{
              width: layout.isTablet ? 14 : 11,
              height: layout.isTablet ? 14 : 11,
              backgroundColor:
                index < simonProgress ? EXPEDITION_THEME.accentStrong : "rgba(148, 163, 184, 0.3)",
            }}
          />
        ))}
      </View>
      <Text className="mt-1 text-center" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.infoFontSize }}>
        {text.progress}: {simonProgress}/{safeSequenceLength}
      </Text>
      <View
        className="mt-2 flex-row flex-wrap self-center"
        style={{
          width: "100%",
          columnGap: simonButtonGap,
          rowGap: simonButtonGap,
        }}
        onLayout={(event) => {
          const measuredWidth = Math.round(event.nativeEvent.layout.width);
          if (measuredWidth !== gridWidth) {
            setGridWidth(measuredWidth);
          }
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
            className="items-center justify-center rounded-full border active:opacity-90"
            style={{
              width: simonButtonSize,
              height: simonButtonSize,
              borderRadius: simonButtonSize / 2,
               borderWidth: isPlaybackTarget ? 3 : 1,
               borderColor: isPlaybackTarget ? "rgba(255, 255, 255, 0.95)" : EXPEDITION_THEME.border,
               backgroundColor: button.color,
               opacity: isPlaybackTarget ? 0.86 : 0.55,
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
          />
            );
          })()
        ))}
      </View>
      {simonResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {simonResult}
        </Text>
      ) : null}
    </View>
  );
}
