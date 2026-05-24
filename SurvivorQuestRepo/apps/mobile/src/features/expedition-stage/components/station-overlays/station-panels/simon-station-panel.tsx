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
  simonMistakes: number;
  simonMaxMistakes: number;
  simonActivePlaybackButtonId: string | null;
  simonActiveInputButtonId: string | null;
  isSimonPlaybackActive: boolean;
  simonResult: string | null;
  isInteractiveLocked: boolean;
  isSubmittingSimon: boolean;
  onPressButton: (buttonId: string) => void;
};

type SimonStationText = {
  mistakes: string;
  status: string;
  statusPlayback: string;
  statusReady: string;
  statusChecking: string;
  statusLocked: string;
  button: string;
};

const SIMON_STATION_TEXT_ENGLISH: SimonStationText = {
  mistakes: "Mistakes",
  status: "Status",
  statusPlayback: "Playback",
  statusReady: "Ready",
  statusChecking: "Checking",
  statusLocked: "Locked",
  button: "Button",
};

const SIMON_STATION_TEXT: Record<UiLanguage, SimonStationText> = {
  polish: {
    mistakes: "Błędy",
    status: "Status",
    statusPlayback: "Odtwarzanie",
    statusReady: "Gotowe",
    statusChecking: "Sprawdzanie",
    statusLocked: "Zablokowane",
    button: "Przycisk",
  },
  english: SIMON_STATION_TEXT_ENGLISH,
  ukrainian: {
    mistakes: "Помилки",
    status: "Статус",
    statusPlayback: "Відтворення",
    statusReady: "Готово",
    statusChecking: "Перевірка",
    statusLocked: "Заблоковано",
    button: "Кнопка",
  },
  russian: {
    mistakes: "Ошибки",
    status: "Статус",
    statusPlayback: "Воспроизведение",
    statusReady: "Готово",
    statusChecking: "Проверка",
    statusLocked: "Заблокировано",
    button: "Кнопка",
  },
};

export function SimonStationPanel({
  stationId,
  simonSequence,
  simonTargetLength,
  simonProgress,
  simonMistakes,
  simonMaxMistakes,
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
  const safeMaxMistakes = Math.max(1, simonMaxMistakes);
  const visibleMistakes = Math.max(0, Math.min(simonMistakes, safeMaxMistakes));
  const visibleProgress = Math.max(0, Math.min(simonProgress, safeSequenceLength));
  const isSimonLocked = isInteractiveLocked;
  const isSimonChecking = isSubmittingSimon;
  const simonStatusLabel = isSimonChecking
    ? text.statusChecking
    : isSimonPlaybackActive
      ? text.statusPlayback
      : isSimonLocked
        ? text.statusLocked
        : text.statusReady;
  const simonStatusTone = isSimonChecking || isSimonPlaybackActive
    ? {
        borderColor: "rgba(245, 158, 11, 0.7)",
        backgroundColor: "rgba(245, 158, 11, 0.18)",
        textColor: EXPEDITION_THEME.textPrimary,
      }
    : isSimonLocked
      ? {
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panelStrong,
          textColor: EXPEDITION_THEME.textMuted,
        }
      : {
          borderColor: "rgba(16, 185, 129, 0.65)",
          backgroundColor: "rgba(16, 185, 129, 0.16)",
          textColor: EXPEDITION_THEME.textPrimary,
        };

  return (
    <View className="mt-3">
      <View className="flex-row items-center justify-center" style={{ columnGap: layout.attemptDotGap }}>
        {Array.from({ length: safeMaxMistakes }).map((_, index) => (
          <View
            key={`${stationId}-simon-mistake-${index}`}
            className="rounded-full"
            style={{
              width: layout.isTablet ? 14 : 11,
              height: layout.isTablet ? 14 : 11,
              backgroundColor:
                index < visibleMistakes ? EXPEDITION_THEME.danger : "rgba(148, 163, 184, 0.3)",
            }}
          />
        ))}
      </View>
      <Text className="mt-1 text-center" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.infoFontSize }}>
        {text.mistakes}: {visibleMistakes}/{safeMaxMistakes}
      </Text>
      <View
        className="mt-2 self-center rounded-full border px-3 py-1"
        style={{
          borderColor: simonStatusTone.borderColor,
          backgroundColor: simonStatusTone.backgroundColor,
        }}
      >
        <Text className="text-xs font-semibold" style={{ color: simonStatusTone.textColor }}>
          {text.status}: {simonStatusLabel}
        </Text>
      </View>
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
            className={`items-center justify-center rounded-full border ${MOBILE_UX_TOKENS.activePressClass}`}
            style={{
              width: simonButtonSize,
              height: simonButtonSize,
              minWidth: MOBILE_UX_TOKENS.minTouchTarget,
              minHeight: MOBILE_UX_TOKENS.minTouchTarget,
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
      <View
        className="flex-row items-center justify-center"
        style={{ columnGap: layout.attemptDotGap + 3, marginTop: layout.isTablet ? 24 : 18 }}
      >
        {Array.from({ length: safeSequenceLength }).map((_, index) => (
          <View
            key={`${stationId}-simon-progress-feedback-${index}`}
            className="rounded-full"
            style={{
              width: layout.isTablet ? 24 : 18,
              height: layout.isTablet ? 24 : 18,
              backgroundColor:
                index < visibleProgress ? EXPEDITION_THEME.accentStrong : "rgba(148, 163, 184, 0.3)",
            }}
          />
        ))}
      </View>
      {simonResult ? (
        <Text className="mt-2 text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {simonResult}
        </Text>
      ) : null}
    </View>
  );
}
