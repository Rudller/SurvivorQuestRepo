import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import { AttemptsIndicator, resolveActionLabelColor, useStationPanelLayout } from "./shared-ui";

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
  anagramInput?: string;
  isActionDisabled?: boolean;
  onLetterPress?: (letter: string) => void;
};

type AnagramStationText = {
  attemptsLeft: string;
  check: string;
  words: string;
  letters: string;
};

const ANAGRAM_STATION_TEXT_ENGLISH: AnagramStationText = {
  attemptsLeft: "Attempts left",
  check: "Check",
  words: "Words",
  letters: "Letters",
};

const ANAGRAM_STATION_TEXT: Record<UiLanguage, AnagramStationText> = {
  polish: {
    attemptsLeft: "Pozostało prób",
    check: "Sprawdź",
    words: "Wyrazy",
    letters: "Litery",
  },
  english: ANAGRAM_STATION_TEXT_ENGLISH,
  ukrainian: {
    attemptsLeft: "Залишилось спроб",
    check: "Перевірити",
    words: "Слова",
    letters: "Літери",
  },
  russian: {
    attemptsLeft: "Осталось попыток",
    check: "Проверить",
    words: "Слова",
    letters: "Буквы",
  },
};

function computeLetterRemaining(scrambledWords: string[], anagramInput: string): Record<string, number> {
  const pool: Record<string, number> = {};
  for (const word of scrambledWords) {
    for (const ch of Array.from(word)) {
      pool[ch] = (pool[ch] ?? 0) + 1;
    }
  }
  const used: Record<string, number> = {};
  for (const ch of Array.from(anagramInput.toUpperCase())) {
    used[ch] = (used[ch] ?? 0) + 1;
  }
  const remaining: Record<string, number> = {};
  for (const [ch, count] of Object.entries(pool)) {
    remaining[ch] = Math.max(0, count - (used[ch] ?? 0));
  }
  return remaining;
}

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
  const tileSize = layout.isTablet ? 40 : 32;
  const tileFontSize = layout.isTablet ? 17 : 13;
  const isBackspaceDisabled = !anagramInput.length || isActionDisabled;

  return (
    <View className="mt-3">
      <AttemptsIndicator
        label={text.attemptsLeft}
        attemptsLeft={anagramAttemptsLeft}
        maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
      />
      <View className="mt-2 flex-row items-center gap-2">
        <View
          className="flex-1 flex-row flex-wrap gap-1 rounded-xl border p-2"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            minHeight: layout.isTablet ? 60 : 50,
          }}
        >
          {anagramInput.length === 0 ? (
            <View
              className="items-center justify-center"
              style={{ width: tileSize, height: tileSize }}
            >
              <Text style={{ color: EXPEDITION_THEME.textSubtle, fontSize: tileFontSize }}>
                _
              </Text>
            </View>
          ) : (
            Array.from(anagramInput).map((ch, index) => (
              <View
                key={`anagram-answer-${index}`}
                className="items-center justify-center rounded-lg border"
                style={{
                  width: tileSize,
                  height: tileSize,
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panel,
                }}
              >
                <Text
                  className="font-bold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: tileFontSize }}
                >
                  {ch}
                </Text>
              </View>
            ))
          )}
        </View>
        <Pressable
          className="items-center justify-center rounded-xl active:opacity-70"
          style={{
            width: layout.actionMinHeight,
            height: layout.actionMinHeight,
            borderWidth: 1,
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            opacity: isBackspaceDisabled ? 0.35 : 1,
          }}
          disabled={isBackspaceDisabled}
          onPress={() => onChangeInput(anagramInput.slice(0, -1))}
        >
          <View className="h-full w-full items-center justify-center">
            <Text
              className="font-semibold"
              style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 20 : 18 }}
            >
              ⌫
            </Text>
          </View>
        </Pressable>
      </View>
      <Pressable
        className="mt-2 items-center justify-center rounded-xl active:opacity-90"
        style={{
          backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          minHeight: layout.actionMinHeight,
        }}
        onPress={onSubmit}
        disabled={isActionDisabled}
      >
        <Text
          className="font-semibold"
          style={{ color: resolveActionLabelColor(isActionDisabled), fontSize: layout.actionFontSize }}
        >
          {isSubmittingAnagram ? "..." : text.check}
        </Text>
      </Pressable>
      {anagramResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {anagramResult}
        </Text>
      ) : null}
    </View>
  );
}

export function AnagramMediaPanel({
  scrambledWords,
  hintWordCount,
  hintLettersLayout,
  anagramInput,
  isActionDisabled,
  onLetterPress,
}: AnagramMediaPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = ANAGRAM_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();

  const isInteractive = Boolean(onLetterPress);
  const wordsToDisplay = scrambledWords.length > 0 ? scrambledWords : ["—"];

  const letterRemaining = isInteractive
    ? computeLetterRemaining(scrambledWords, anagramInput ?? "")
    : null;

  const remainingForTiles = letterRemaining ? { ...letterRemaining } : null;
  const wordTiles = wordsToDisplay.map((word) =>
    Array.from(word).map((character) => {
      if (!remainingForTiles) {
        return { character, isAvailable: false };
      }
      const isAvailable = (remainingForTiles[character] ?? 0) > 0;
      if (isAvailable) {
        remainingForTiles[character]--;
      }
      return { character, isAvailable };
    }),
  );

  return (
    <View className="flex-1 items-center justify-center px-3">
      <View className="items-center justify-center" style={{ rowGap: layout.isTablet ? 18 : 14 }}>
        {wordTiles.map((tiles, wordIndex) => (
          <View
            key={`anagram-top-word-${wordIndex}`}
            className="flex-row justify-center"
            style={{ columnGap: layout.isTablet ? 12 : 10 }}
          >
            {tiles.map(({ character, isAvailable }, characterIndex) => {
              const tileDisabled = !isAvailable || Boolean(isActionDisabled);
              const tileContent = (
                <View
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
              );

              if (!isInteractive) {
                return (
                  <View key={`anagram-top-${wordIndex}-${characterIndex}`}>
                    {tileContent}
                  </View>
                );
              }

              return (
                <Pressable
                  key={`anagram-top-${wordIndex}-${characterIndex}`}
                  className="active:opacity-60"
                  style={{ opacity: tileDisabled ? 0.3 : 1 }}
                  disabled={tileDisabled}
                  onPress={() => onLetterPress?.(character)}
                >
                  {tileContent}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Text className="mt-3" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.infoFontSize }}>
        {text.words}: {hintWordCount} • {text.letters}: {hintLettersLayout}
      </Text>
    </View>
  );
}
