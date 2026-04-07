import { Pressable, Text, TextInput, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

type AnagramStationPanelProps = {
  anagramAttemptsLeft: number;
  anagramInput: string;
  isActionDisabled: boolean;
  isSubmittingAnagram: boolean;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
};

export function AnagramStationPanel({
  anagramAttemptsLeft,
  anagramInput,
  isActionDisabled,
  isSubmittingAnagram,
  onChangeInput,
  onSubmit,
}: AnagramStationPanelProps) {
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Pozostało prób: {anagramAttemptsLeft}
      </Text>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
          }}
          placeholder="Wpisz poprawne słowo"
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          autoCapitalize="characters"
          autoCorrect={false}
          value={anagramInput}
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
          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingAnagram ? "..." : "Sprawdź"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
