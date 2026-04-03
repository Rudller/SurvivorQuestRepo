import { Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { SIMON_BUTTONS } from "../puzzle-helpers";

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
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Zapamiętaj sekwencję:{" "}
        <Text className="font-bold">
          {simonHintVisible
            ? simonSequence
                .map((id) => SIMON_BUTTONS.find((button) => button.id === id)?.label ?? "")
                .join(" ")
            : simonHiddenHint}
        </Text>
      </Text>
      <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
        Postęp: {simonProgress}/{simonSequence.length}
      </Text>
      <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
        {SIMON_BUTTONS.map((button) => (
          <Pressable
            key={`${stationId}-simon-${button.id}`}
            className="h-16 w-[31.5%] items-center justify-center rounded-xl border active:opacity-90"
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: button.color,
              opacity: isInteractiveLocked || isSubmittingSimon || simonProgress >= simonSequence.length ? 0.55 : 1,
            }}
            onPress={() => {
              onPressButton(button.id);
            }}
            disabled={isInteractiveLocked || isSubmittingSimon || simonProgress >= simonSequence.length}
          >
            <Text className="text-2xl">{button.label}</Text>
          </Pressable>
        ))}
      </View>
      {simonResult ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {simonResult}
        </Text>
      ) : null}
    </View>
  );
}
