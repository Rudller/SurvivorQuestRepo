import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import { AttemptsIndicator, resolveActionLabelColor, useStationPanelLayout } from "./shared-ui";

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

type MiniSudokuStationText = {
  instruction: string;
  attemptsLeft: string;
  checkLayout: string;
};

const MINI_SUDOKU_STATION_TEXT_ENGLISH: MiniSudokuStationText = {
  instruction: "Fill the 2x2 grid with 1 and 2 (without repeats in rows and columns).",
  attemptsLeft: "Attempts left",
  checkLayout: "Check layout",
};

const MINI_SUDOKU_STATION_TEXT: Record<UiLanguage, MiniSudokuStationText> = {
  polish: {
    instruction: "Uzupełnij siatkę 2x2 cyframi 1 i 2 (bez powtórzeń w wierszach i kolumnach).",
    attemptsLeft: "Pozostało prób",
    checkLayout: "Sprawdź układ",
  },
  english: MINI_SUDOKU_STATION_TEXT_ENGLISH,
  ukrainian: {
    instruction: "Заповніть сітку 2x2 цифрами 1 і 2 (без повторів у рядках і стовпцях).",
    attemptsLeft: "Залишилось спроб",
    checkLayout: "Перевірити розкладку",
  },
  russian: {
    instruction: "Заполните сетку 2x2 цифрами 1 и 2 (без повторов в строках и столбцах).",
    attemptsLeft: "Осталось попыток",
    checkLayout: "Проверить расклад",
  },
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
  const uiLanguage = useUiLanguage();
  const text = MINI_SUDOKU_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const actionLabelColor = resolveActionLabelColor(isActionDisabled);

  return (
    <View className="mt-3">
      <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.instruction}
      </Text>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={miniSudokuAttemptsLeft}
          maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
        />
      </View>
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
                <Text
                  className="text-center font-bold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 26 : 18 }}
                >
                  {givenValue}
                </Text>
              ) : (
                <TextInput
                  className="text-center font-bold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 26 : 18 }}
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
        className="mt-2 items-center rounded-xl active:opacity-90"
        style={{
          backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          minHeight: layout.actionMinHeight,
          justifyContent: "center",
        }}
        onPress={onSubmit}
        disabled={isActionDisabled}
      >
        <Text className="font-semibold" style={{ color: actionLabelColor, fontSize: layout.actionFontSize }}>
          {isSubmittingMiniSudoku ? "..." : text.checkLayout}
        </Text>
      </Pressable>
      {miniSudokuResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {miniSudokuResult}
        </Text>
      ) : null}
    </View>
  );
}
