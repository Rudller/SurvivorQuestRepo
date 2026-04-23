import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import { AttemptsIndicator, useStationPanelLayout } from "./shared-ui";

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

type BoggleStationText = {
  instruction: string;
  attemptsLeft: string;
  placeholder: string;
  check: string;
};

const BOGGLE_STATION_TEXT_ENGLISH: BoggleStationText = {
  instruction: "Build a word by tapping letters on the board",
  attemptsLeft: "Attempts left",
  placeholder: "Enter a word",
  check: "Check",
};

const BOGGLE_STATION_TEXT: Record<UiLanguage, BoggleStationText> = {
  polish: {
    instruction: "Ułóż słowo dotykając litery na planszy",
    attemptsLeft: "Pozostało prób",
    placeholder: "Wpisz słowo",
    check: "Sprawdź",
  },
  english: BOGGLE_STATION_TEXT_ENGLISH,
  ukrainian: {
    instruction: "Складіть слово, торкаючись літер на полі",
    attemptsLeft: "Залишилось спроб",
    placeholder: "Введіть слово",
    check: "Перевірити",
  },
  russian: {
    instruction: "Составьте слово, нажимая буквы на поле",
    attemptsLeft: "Осталось попыток",
    placeholder: "Введите слово",
    check: "Проверить",
  },
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
  const uiLanguage = useUiLanguage();
  const text = BOGGLE_STATION_TEXT[uiLanguage];
  const selectedCellSet = new Set(selectedCellPath);
  const layout = useStationPanelLayout();

  return (
    <View className="h-full pt-1">
      <Text className="text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.instruction}
      </Text>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={boggleAttemptsLeft}
          maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
          align="center"
        />
      </View>
      <View className="flex-1 items-center justify-center">
        <View className="mt-2 w-[82%] flex-row flex-wrap justify-between" style={{ rowGap: layout.isTablet ? 10 : 6 }}>
          {boggleBoardLetters.map((letter, index) => (
            <Pressable
              key={`${stationId}-boggle-${index}`}
              className="relative w-[32%] rounded-xl border"
              style={{
                height: layout.isTablet ? 112 : 96,
                borderColor: selectedCellSet.has(index) ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                backgroundColor: selectedCellSet.has(index) ? "rgba(245, 158, 11, 0.22)" : EXPEDITION_THEME.panelStrong,
                opacity: isActionDisabled ? 0.55 : 1,
              }}
              disabled={isActionDisabled}
              onPress={() => {
                onPressBoardCell(index);
              }}
            >
              <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
                <Text
                  className="text-center font-extrabold"
                  style={{
                    color: EXPEDITION_THEME.textPrimary,
                    fontSize: layout.isTablet ? 32 : 26,
                    lineHeight: layout.isTablet ? 32 : 26,
                    includeFontPadding: false,
                    textAlignVertical: "center",
                  }}
                >
                  {letter}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        {boggleResult ? (
          <Text className="mt-2 text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
            {boggleResult}
          </Text>
        ) : null}
      </View>
      <View className="pb-1 pt-2 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border px-4"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
            fontSize: layout.inputFontSize,
            paddingVertical: layout.isTablet ? 12 : 8,
          }}
          placeholder={text.placeholder}
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
          className="min-w-12 items-center justify-center rounded-xl px-3 active:opacity-90"
          style={{
            borderColor: EXPEDITION_THEME.accent,
            borderWidth: 1,
            backgroundColor: EXPEDITION_THEME.accent,
            opacity: isActionDisabled || boggleInput.length === 0 ? 0.45 : 1,
            minHeight: layout.actionMinHeight,
          }}
          onPress={onBackspaceInput}
          disabled={isActionDisabled || boggleInput.length === 0}
        >
          <Text className="font-semibold text-zinc-950" style={{ fontSize: layout.isTablet ? 22 : 16 }}>
            ⌫
          </Text>
        </Pressable>
        <Pressable
          className="items-center justify-center rounded-xl px-6 active:opacity-90"
          style={{
            backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
            minHeight: layout.actionMinHeight,
          }}
          onPress={onSubmit}
          disabled={isActionDisabled}
        >
          <Text className="font-semibold text-zinc-950" style={{ fontSize: layout.actionFontSize }}>
            {isSubmittingBoggle ? "..." : text.check}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
