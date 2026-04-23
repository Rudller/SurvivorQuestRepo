import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import { AttemptsIndicator, useStationPanelLayout } from "./shared-ui";

type AnagramStationPanelProps = {
  anagramAttemptsLeft: number;
  anagramInput: string;
  anagramResult: string | null;
  isActionDisabled: boolean;
  isSubmittingAnagram: boolean;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
};

export type AnagramMediaPanelProps = {
  scrambledWords: string[];
  hintWordCount: number;
  hintLettersLayout: string;
};

type AnagramStationText = {
  attemptsLeft: string;
  inputPlaceholder: string;
  check: string;
  words: string;
  letters: string;
};

const ANAGRAM_STATION_TEXT_ENGLISH: AnagramStationText = {
  attemptsLeft: "Attempts left",
  inputPlaceholder: "Enter the correct word",
  check: "Check",
  words: "Words",
  letters: "Letters",
};

const ANAGRAM_STATION_TEXT: Record<UiLanguage, AnagramStationText> = {
  polish: {
    attemptsLeft: "Pozostało prób",
    inputPlaceholder: "Wpisz poprawne słowo",
    check: "Sprawdź",
    words: "Wyrazy",
    letters: "Litery",
  },
  english: ANAGRAM_STATION_TEXT_ENGLISH,
  ukrainian: {
    attemptsLeft: "Залишилось спроб",
    inputPlaceholder: "Введіть правильне слово",
    check: "Перевірити",
    words: "Слова",
    letters: "Літери",
  },
  russian: {
    attemptsLeft: "Осталось попыток",
    inputPlaceholder: "Введите правильное слово",
    check: "Проверить",
    words: "Слова",
    letters: "Буквы",
  },
};

export function AnagramStationPanel({
  anagramAttemptsLeft,
  anagramInput,
  anagramResult,
  isActionDisabled,
  isSubmittingAnagram,
  onChangeInput,
  onSubmit,
}: AnagramStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = ANAGRAM_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();

  return (
    <View className="mt-3">
      <AttemptsIndicator
        label={text.attemptsLeft}
        attemptsLeft={anagramAttemptsLeft}
        maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
      />
      <View className="mt-2 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border px-4"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
            fontSize: layout.inputFontSize,
            paddingVertical: layout.isTablet ? 12 : 8,
          }}
          placeholder={text.inputPlaceholder}
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          autoCapitalize="characters"
          autoCorrect={false}
          value={anagramInput}
          onChangeText={onChangeInput}
          editable={!isActionDisabled}
          onSubmitEditing={onSubmit}
        />
        <Pressable
          className="items-center justify-center rounded-xl px-5 active:opacity-90"
          style={{
            backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
            minHeight: layout.actionMinHeight,
          }}
          onPress={onSubmit}
          disabled={isActionDisabled}
        >
          <Text className="font-semibold text-zinc-950" style={{ fontSize: layout.actionFontSize }}>
            {isSubmittingAnagram ? "..." : text.check}
          </Text>
        </Pressable>
      </View>
      {anagramResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {anagramResult}
        </Text>
      ) : null}
    </View>
  );
}

export function AnagramMediaPanel({ scrambledWords, hintWordCount, hintLettersLayout }: AnagramMediaPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = ANAGRAM_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();

  return (
    <View className="flex-1 items-center justify-center px-3">
      <View className="items-center justify-center" style={{ rowGap: layout.isTablet ? 18 : 14 }}>
        {(scrambledWords.length > 0 ? scrambledWords : ["—"]).map((word, wordIndex) => (
          <View
            key={`anagram-top-word-${wordIndex}`}
            className="flex-row justify-center"
            style={{ columnGap: layout.isTablet ? 12 : 10 }}
          >
            {Array.from(word).map((character, characterIndex) => (
              <View
                key={`anagram-top-${wordIndex}-${characterIndex}-${character}`}
                className="items-center justify-center rounded-lg border"
                style={{
                  minWidth: layout.isTablet ? 62 : 52,
                  height: layout.isTablet ? 62 : 52,
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelStrong,
                }}
              >
                <Text
                  className="font-bold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 28 : 20 }}
                >
                  {character}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text className="mt-3" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.infoFontSize }}>
        {text.words}: {hintWordCount} • {text.letters}: {hintLettersLayout}
      </Text>
    </View>
  );
}
