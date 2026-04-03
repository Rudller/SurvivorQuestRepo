import { Pressable, Text, TextInput, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

type RebusStationPanelProps = {
  rebusQuestion: string;
  rebusAttemptsLeft: number;
  rebusInput: string;
  rebusResult: string | null;
  isActionDisabled: boolean;
  isSubmittingRebus: boolean;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
};

export function RebusStationPanel({
  rebusQuestion,
  rebusAttemptsLeft,
  rebusInput,
  rebusResult,
  isActionDisabled,
  isSubmittingRebus,
  onChangeInput,
  onSubmit,
}: RebusStationPanelProps) {
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Rebus: <Text className="font-bold">{rebusQuestion}</Text>
      </Text>
      <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
        Pozostało prób: {rebusAttemptsLeft}
      </Text>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
          }}
          placeholder="Wpisz rozwiązanie"
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          autoCapitalize="characters"
          autoCorrect={false}
          value={rebusInput}
          onChangeText={onChangeInput}
          editable={!isActionDisabled}
          onSubmitEditing={onSubmit}
        />
        <Pressable
          className="items-center justify-center rounded-xl px-4 active:opacity-90"
          style={{
            backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          }}
          onPress={onSubmit}
          disabled={isActionDisabled}
        >
          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingRebus ? "..." : "Sprawdź"}</Text>
        </Pressable>
      </View>
      {rebusResult ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {rebusResult}
        </Text>
      ) : null}
    </View>
  );
}
