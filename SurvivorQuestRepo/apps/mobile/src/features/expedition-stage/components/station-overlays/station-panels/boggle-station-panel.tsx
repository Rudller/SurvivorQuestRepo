import { Pressable, Text, TextInput, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

type BoggleStationPanelProps = {
  stationId: string;
  boggleBoardLetters: string[];
  boggleAttemptsLeft: number;
  boggleInput: string;
  boggleResult: string | null;
  isActionDisabled: boolean;
  isSubmittingBoggle: boolean;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
};

export function BoggleStationPanel({
  stationId,
  boggleBoardLetters,
  boggleAttemptsLeft,
  boggleInput,
  boggleResult,
  isActionDisabled,
  isSubmittingBoggle,
  onChangeInput,
  onSubmit,
}: BoggleStationPanelProps) {
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Wpisz docelowe słowo z planszy • Pozostało prób: {boggleAttemptsLeft}
      </Text>
      <View className="mt-2 flex-row flex-wrap justify-between gap-y-1.5">
        {boggleBoardLetters.map((letter, index) => (
          <View
            key={`${stationId}-boggle-${index}`}
            className="h-10 w-[31.5%] items-center justify-center rounded-lg border"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
          >
            <Text className="text-sm font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {letter}
            </Text>
          </View>
        ))}
      </View>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
          }}
          placeholder="Wpisz słowo"
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          autoCapitalize="characters"
          autoCorrect={false}
          value={boggleInput}
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
          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingBoggle ? "..." : "Sprawdź"}</Text>
        </Pressable>
      </View>
      {boggleResult ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {boggleResult}
        </Text>
      ) : null}
    </View>
  );
}
