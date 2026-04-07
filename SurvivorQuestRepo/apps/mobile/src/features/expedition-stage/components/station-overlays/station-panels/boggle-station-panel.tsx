import { Pressable, Text, TextInput, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

type BoggleStationPanelProps = {
  stationId: string;
  boggleBoardLetters: string[];
  boggleAttemptsLeft: number;
  boggleMaxInputLength: number;
  boggleInput: string;
  boggleResult: string | null;
  selectedCellPath: number[];
  isActionDisabled: boolean;
  isSubmittingBoggle: boolean;
  onChangeInput: (value: string) => void;
  onPressBoardCell: (index: number) => void;
  onBackspaceInput: () => void;
  onSubmit: () => void;
};

export function BoggleStationPanel({
  stationId,
  boggleBoardLetters,
  boggleAttemptsLeft,
  boggleMaxInputLength,
  boggleInput,
  boggleResult,
  selectedCellPath,
  isActionDisabled,
  isSubmittingBoggle,
  onChangeInput,
  onPressBoardCell,
  onBackspaceInput,
  onSubmit,
}: BoggleStationPanelProps) {
  const selectedCellSet = new Set(selectedCellPath);

  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Ułóż słowo dotykając litery na planszy • Pozostało prób: {boggleAttemptsLeft}
      </Text>
      <View className="mt-2 flex-row flex-wrap justify-between gap-y-1.5">
        {boggleBoardLetters.map((letter, index) => (
          <Pressable
            key={`${stationId}-boggle-${index}`}
            className="h-12 w-[31.5%] items-center justify-center rounded-lg border"
            style={{
              borderColor: selectedCellSet.has(index) ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
              backgroundColor: selectedCellSet.has(index) ? "rgba(245, 158, 11, 0.22)" : EXPEDITION_THEME.panelStrong,
              opacity: isActionDisabled ? 0.55 : 1,
            }}
            disabled={isActionDisabled}
            onPress={() => {
              onPressBoardCell(index);
            }}
          >
            <Text className="text-sm font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {letter}
            </Text>
          </Pressable>
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
          maxLength={boggleMaxInputLength}
          value={boggleInput}
          onChangeText={onChangeInput}
          editable={!isActionDisabled}
          onSubmitEditing={onSubmit}
        />
        <Pressable
          className="h-12 min-w-12 items-center justify-center rounded-xl px-3 active:opacity-90"
          style={{
            borderColor: EXPEDITION_THEME.accent,
            borderWidth: 1,
            backgroundColor: EXPEDITION_THEME.accent,
            opacity: isActionDisabled || boggleInput.length === 0 ? 0.45 : 1,
          }}
          onPress={onBackspaceInput}
          disabled={isActionDisabled || boggleInput.length === 0}
        >
          <Text className="text-base font-semibold text-zinc-950">⌫</Text>
        </Pressable>
        <Pressable
          className="h-12 items-center justify-center rounded-xl px-6 active:opacity-90"
          style={{
            backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          }}
          onPress={onSubmit}
          disabled={isActionDisabled}
        >
          <Text className="text-sm font-semibold text-zinc-950">{isSubmittingBoggle ? "..." : "Sprawdź"}</Text>
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
