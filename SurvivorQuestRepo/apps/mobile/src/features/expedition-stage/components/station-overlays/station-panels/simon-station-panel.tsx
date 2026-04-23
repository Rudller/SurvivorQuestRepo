import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { SIMON_BUTTONS } from "../puzzle-helpers";
import { useStationPanelLayout } from "./shared-ui";

type SimonStationPanelProps = {
  stationId: string;
  simonSequence: string[];
  simonHiddenHint: string;
  simonHintVisible: boolean;
  simonProgress: number;
  simonResult: string | null;
  isInteractiveLocked: boolean;
  isSubmittingSimon: boolean;
  onPressButton: (buttonId: string) => void;
};

type SimonStationText = {
  rememberSequence: string;
  progress: string;
};

const SIMON_STATION_TEXT_ENGLISH: SimonStationText = {
  rememberSequence: "Remember sequence",
  progress: "Progress",
};

const SIMON_STATION_TEXT: Record<UiLanguage, SimonStationText> = {
  polish: {
    rememberSequence: "Zapamiętaj sekwencję",
    progress: "Postęp",
  },
  english: SIMON_STATION_TEXT_ENGLISH,
  ukrainian: {
    rememberSequence: "Запам'ятайте послідовність",
    progress: "Прогрес",
  },
  russian: {
    rememberSequence: "Запомните последовательность",
    progress: "Прогресс",
  },
};

export function SimonStationPanel({
  stationId,
  simonSequence,
  simonHiddenHint,
  simonHintVisible,
  simonProgress,
  simonResult,
  isInteractiveLocked,
  isSubmittingSimon,
  onPressButton,
}: SimonStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = SIMON_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();

  return (
    <View className="mt-3">
      <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.rememberSequence}:{" "}
        <Text className="font-bold">
          {simonHintVisible
            ? simonSequence
                .map((id) => SIMON_BUTTONS.find((button) => button.id === id)?.label ?? "")
                .join(" ")
            : simonHiddenHint}
        </Text>
      </Text>
      <Text className="mt-1" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.infoFontSize }}>
        {text.progress}: {simonProgress}/{simonSequence.length}
      </Text>
      <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
        {SIMON_BUTTONS.map((button) => (
          <Pressable
            key={`${stationId}-simon-${button.id}`}
            className="w-[31.5%] items-center justify-center rounded-xl border active:opacity-90"
            style={{
              height: layout.isTablet ? 84 : 64,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: button.color,
              opacity: isInteractiveLocked || isSubmittingSimon || simonProgress >= simonSequence.length ? 0.55 : 1,
            }}
            onPress={() => {
              onPressButton(button.id);
            }}
            disabled={isInteractiveLocked || isSubmittingSimon || simonProgress >= simonSequence.length}
            hitSlop={4}
          >
            <Text style={{ fontSize: layout.isTablet ? 34 : 24 }}>{button.label}</Text>
          </Pressable>
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
