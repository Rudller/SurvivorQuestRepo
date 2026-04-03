import { Pressable, Text, TextInput, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

type MiniSudokuStationPanelProps = {
  stationId: string;
  miniSudokuPuzzle: {
    given: Array<string | null>;
    solution: string[];
  } | null;
  normalizedMiniSudokuValues: string[];
  miniSudokuAttemptsLeft: number;
  miniSudokuResult: string | null;
  isActionDisabled: boolean;
  isSubmittingMiniSudoku: boolean;
  onChangeCell: (index: number, nextValue: string) => void;
  onSubmit: () => void;
};

export function MiniSudokuStationPanel({
  stationId,
  miniSudokuPuzzle,
  normalizedMiniSudokuValues,
  miniSudokuAttemptsLeft,
  miniSudokuResult,
  isActionDisabled,
  isSubmittingMiniSudoku,
  onChangeCell,
  onSubmit,
}: MiniSudokuStationPanelProps) {
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Uzupełnij siatkę 2x2 cyframi 1 i 2 (bez powtórzeń w wierszach i kolumnach).
      </Text>
      <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
        Pozostało prób: {miniSudokuAttemptsLeft}
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => {
          const givenValue = miniSudokuPuzzle?.given[index] ?? null;
          const value = givenValue ?? normalizedMiniSudokuValues[index] ?? "";
          return (
            <View
              key={`${stationId}-sudoku-${index}`}
              className="w-[48%] rounded-xl border px-3 py-2"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
            >
              {givenValue ? (
                <Text className="text-center text-lg font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {givenValue}
                </Text>
              ) : (
                <TextInput
                  className="text-center text-lg font-bold"
                  style={{ color: EXPEDITION_THEME.textPrimary }}
                  keyboardType="number-pad"
                  value={value}
                  onChangeText={(nextValue) => {
                    onChangeCell(index, nextValue);
                  }}
                  editable={!isActionDisabled}
                />
              )}
            </View>
          );
        })}
      </View>
      <Pressable
        className="mt-2 items-center rounded-xl py-2.5 active:opacity-90"
        style={{
          backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
        }}
        onPress={onSubmit}
        disabled={isActionDisabled}
      >
        <Text className="text-sm font-semibold text-zinc-950">{isSubmittingMiniSudoku ? "..." : "Sprawdź układ"}</Text>
      </Pressable>
      {miniSudokuResult ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {miniSudokuResult}
        </Text>
      ) : null}
    </View>
  );
}
