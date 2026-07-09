import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import { AttemptsIndicator, resolveActionLabelColor, useStationPanelLayout, withAlpha } from "./shared-ui";

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
  wordLength: string;
  placeholder: string;
  check: string;
};

const BOGGLE_STATION_TEXT_ENGLISH: BoggleStationText = {
  instruction: "Build a word by tapping letters on the board",
  attemptsLeft: "Attempts left",
  wordLength: "Word length",
  placeholder: "Enter a word",
  check: "Check",
};

const BOGGLE_STATION_TEXT: Record<UiLanguage, BoggleStationText> = {
  polish: {
    instruction: "Ułóż słowo dotykając litery na planszy",
    attemptsLeft: "Pozostało prób",
    wordLength: "Długość hasła",
    placeholder: "Wpisz słowo",
    check: "Sprawdź",
  },
  english: BOGGLE_STATION_TEXT_ENGLISH,
  ukrainian: {
    instruction: "Складіть слово, торкаючись літер на полі",
    attemptsLeft: "Залишилось спроб",
    wordLength: "Довжина слова",
    placeholder: "Введіть слово",
    check: "Перевірити",
  },
  russian: {
    instruction: "Составьте слово, нажимая буквы на поле",
    attemptsLeft: "Осталось попыток",
    wordLength: "Длина слова",
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
  const boardWidth = layout.isTablet ? "82%" : "92%";
  const boardRowGap = layout.isTablet ? 10 : 3;
  const boardCellHeight = layout.isTablet ? 112 : 62;
  const boardLetterFontSize = layout.isTablet ? 32 : 22;
  const boardLetterLineHeight = layout.isTablet ? 32 : 24;
  const visibleInputLength = Math.max(0, Math.min(boggleInput.length, boggleMaxInputLength));

  return (
    <View style={{ paddingTop: layout.isTablet ? 4 : 0 }}>
      <Text className="text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.instruction}
      </Text>
      <View style={{ marginTop: layout.isTablet ? 4 : 2 }}>
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={boggleAttemptsLeft}
          maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
          align="center"
        />
      </View>
      <View className="items-center" style={{ marginTop: layout.isTablet ? 10 : 4 }}>
        <Text className="uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.isTablet ? 12 : 9 }}>
          {text.wordLength}
        </Text>
        <View className="mt-1 flex-row items-center justify-center" style={{ columnGap: layout.attemptDotGap + 2 }}>
          {Array.from({ length: boggleMaxInputLength }).map((_, index) => (
            <View
              key={`${stationId}-boggle-length-${index}`}
              className="rounded-full"
              style={{
                width: layout.isTablet ? 16 : 10,
                height: layout.isTablet ? 16 : 10,
                backgroundColor:
                  index < visibleInputLength ? EXPEDITION_THEME.accentStrong : "rgba(148, 163, 184, 0.3)",
              }}
            />
          ))}
        </View>
      </View>
      <View className="items-center" style={{ marginTop: layout.isTablet ? 8 : 4 }}>
        <View
          className="flex-row flex-wrap justify-between"
          style={{ width: boardWidth, rowGap: boardRowGap }}
        >
          {boggleBoardLetters.map((letter, index) => (
            <Pressable
              key={`${stationId}-boggle-${index}`}
              className="relative w-[32%] rounded-xl border"
                style={{
                  height: boardCellHeight,
                  borderColor: selectedCellSet.has(index) ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                  backgroundColor: selectedCellSet.has(index) ? withAlpha(EXPEDITION_THEME.accent, 0.22) : EXPEDITION_THEME.panelStrong,
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
                    fontSize: boardLetterFontSize,
                    lineHeight: boardLetterLineHeight,
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
          <Text
            className="text-center"
            style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize, marginTop: layout.isTablet ? 8 : 4 }}
          >
            {boggleResult}
          </Text>
        ) : null}
      </View>
      <View className="flex-row" style={{ gap: layout.isTablet ? 8 : 5, paddingTop: layout.isTablet ? 8 : 4, paddingBottom: layout.isTablet ? 4 : 2 }}>
        <TextInput
          className="flex-1 rounded-xl border"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
            fontSize: layout.inputFontSize,
            paddingHorizontal: layout.isTablet ? 16 : 10,
            paddingVertical: layout.isTablet ? 12 : 5,
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
          className="items-center justify-center rounded-xl active:opacity-90"
          style={{
            borderColor: EXPEDITION_THEME.accent,
            borderWidth: 1,
            backgroundColor: EXPEDITION_THEME.accent,
            opacity: isActionDisabled || boggleInput.length === 0 ? 0.45 : 1,
            minHeight: layout.actionMinHeight,
            minWidth: layout.isTablet ? 48 : 36,
            paddingHorizontal: layout.isTablet ? 12 : 8,
          }}
          onPress={onBackspaceInput}
          disabled={isActionDisabled || boggleInput.length === 0}
        >
          <Text
            className="font-semibold"
            style={{ color: resolveActionLabelColor(isActionDisabled || boggleInput.length === 0), fontSize: layout.isTablet ? 22 : 13 }}
          >
            ⌫
          </Text>
        </Pressable>
        <Pressable
          className="items-center justify-center rounded-xl active:opacity-90"
          style={{
            backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
            minHeight: layout.actionMinHeight,
            paddingHorizontal: layout.isTablet ? 24 : 12,
          }}
          onPress={onSubmit}
          disabled={isActionDisabled}
        >
          <Text
            className="font-semibold"
            style={{ color: resolveActionLabelColor(isActionDisabled), fontSize: layout.actionFontSize }}
          >
            {isSubmittingBoggle ? "..." : text.check}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type BoggleMediaSectionProps = BoggleStationPanelProps;

export function BoggleMediaSection(props: BoggleMediaSectionProps) {
  const layout = useStationPanelLayout();

  return (
    <View
      style={{
        paddingHorizontal: layout.isTablet ? 8 : 4,
        paddingVertical: layout.isTablet ? 8 : 4,
      }}
    >
      <BoggleStationPanel {...props} />
    </View>
  );
}
