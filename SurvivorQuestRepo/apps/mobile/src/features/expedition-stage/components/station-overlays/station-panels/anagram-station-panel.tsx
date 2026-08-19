import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { AttemptsIndicator, resolveActionLabelColor, useStationPanelLayout } from "./shared-ui";

type AnagramStationPanelProps = {
  scrambledWords: string[];
  hintWordCount: number;
  hintLettersLayout: string;
  anagramAttemptsLeft: number;
  anagramInput: string;
  anagramResult: string | null;
  isActionDisabled: boolean;
  isInputLocked: boolean;
  isSubmittingAnagram: boolean;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
};

type AnagramStationText = {
  instructions: string;
  attemptsLeft: string;
  check: string;
  words: string;
  letters: string;
};

const ANAGRAM_STATION_TEXT_ENGLISH: AnagramStationText = {
  instructions: "Tap the letters below in the right order to build the password.",
  attemptsLeft: "Attempts left",
  check: "Check",
  words: "Words",
  letters: "Letters",
};

const ANAGRAM_STATION_TEXT: Record<UiLanguage, AnagramStationText> = {
  polish: {
    instructions: "Dotykaj poniższych liter we właściwej kolejności, aby ułożyć hasło.",
    attemptsLeft: "Pozostało prób",
    check: "Sprawdź",
    words: "Wyrazy",
    letters: "Litery",
  },
  english: ANAGRAM_STATION_TEXT_ENGLISH,
  ukrainian: {
    instructions: "Торкайтеся літер нижче у правильному порядку, щоб скласти пароль.",
    attemptsLeft: "Залишилось спроб",
    check: "Перевірити",
    words: "Слова",
    letters: "Літери",
  },
  russian: {
    instructions: "Нажимайте на буквы ниже в правильном порядке, чтобы составить пароль.",
    attemptsLeft: "Осталось попыток",
    check: "Проверить",
    words: "Слова",
    letters: "Буквы",
  },
};

export function AnagramStationPanel({
  scrambledWords,
  hintWordCount,
  hintLettersLayout,
  anagramAttemptsLeft,
  anagramInput,
  anagramResult,
  isActionDisabled,
  isInputLocked,
  isSubmittingAnagram,
  onChangeInput,
  onSubmit,
}: AnagramStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = ANAGRAM_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const adaptiveLayout = useAdaptiveLayout();
  const tileSize = layout.isTablet ? 40 : 32;
  const tileFontSize = layout.isTablet ? 17 : 13;
  const isBackspaceDisabled = !anagramInput.length || isInputLocked;

  // Tracks which specific tile (by word/character position, not by letter
  // value) was tapped to build the current input — a letter-count-only check
  // can't tell two identical letters apart, so tapping one "A" of two would
  // grey out whichever "A" tile happened to come first on screen instead of
  // the one actually tapped. The parent can also reset anagramInput on its
  // own (new puzzle, cleared attempt) without going through our tap/backspace
  // handlers below, which is the only way this stack and the input length
  // could ever drift apart — resync during render (not in an effect) so
  // there's no stale-tile flash.
  const [usedTileKeys, setUsedTileKeys] = useState<string[]>([]);
  if (usedTileKeys.length !== anagramInput.length) {
    setUsedTileKeys([]);
  }

  const wordsToDisplay = scrambledWords.length > 0 ? scrambledWords : ["—"];
  const pickerTileGap = layout.isTablet ? 12 : 6;
  const longestWordLength = Math.max(...wordsToDisplay.map((w) => w.length), 1);
  const availableWidth = adaptiveLayout.width - (layout.isTablet ? 48 : 24);
  const maxTileFromWidth = Math.floor(
    (availableWidth - pickerTileGap * (longestWordLength - 1)) / longestWordLength,
  );
  const pickerTileSize = layout.isTablet ? 62 : Math.max(28, Math.min(48, maxTileFromWidth));
  const pickerTileFontSize = layout.isTablet ? 28 : Math.max(12, Math.round(pickerTileSize * 0.46));
  const wordRowGap = layout.isTablet ? 18 : 12;

  const wordTiles = wordsToDisplay.map((word, wordIndex) =>
    Array.from(word).map((character, characterIndex) => {
      const tileKey = `${wordIndex}-${characterIndex}`;
      const isAvailable = scrambledWords.length > 0 && !usedTileKeys.includes(tileKey);
      return { character, isAvailable, tileKey };
    }),
  );

  return (
    <View className="mt-3">
      <Text className="text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.instructions}
      </Text>
      <View className="mt-2 items-center" style={{ rowGap: wordRowGap }}>
        {wordTiles.map((tiles, wordIndex) => (
          <View
            key={`anagram-picker-word-${wordIndex}`}
            className="flex-row flex-wrap justify-center"
            style={{ columnGap: pickerTileGap, rowGap: pickerTileGap }}
          >
            {tiles.map(({ character, isAvailable, tileKey }) => {
              const tileDisabled = !isAvailable || isInputLocked;
              return (
                <Pressable
                  key={`anagram-picker-${tileKey}`}
                  className="active:opacity-60"
                  style={{ opacity: tileDisabled ? 0.3 : 1 }}
                  disabled={tileDisabled}
                  onPress={() => {
                    setUsedTileKeys((current) => [...current, tileKey]);
                    onChangeInput(`${anagramInput}${character}`);
                  }}
                >
                  <View
                    className="items-center justify-center rounded-lg border"
                    style={{
                      width: pickerTileSize,
                      height: pickerTileSize,
                      borderColor: EXPEDITION_THEME.border,
                      backgroundColor: EXPEDITION_THEME.panelStrong,
                    }}
                  >
                    <Text
                      className="font-bold"
                      style={{ color: EXPEDITION_THEME.textPrimary, fontSize: pickerTileFontSize }}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      numberOfLines={1}
                    >
                      {character}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Text className="mt-2 text-center" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.infoFontSize }}>
        {text.words}: {hintWordCount} • {text.letters}: {hintLettersLayout}
      </Text>

      <View className="mt-3">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={anagramAttemptsLeft}
          maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
        />
      </View>
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
          onPress={() => {
            setUsedTileKeys((current) => current.slice(0, -1));
            onChangeInput(anagramInput.slice(0, -1));
          }}
        >
          <View className="h-full w-full items-center justify-center">
            <Text
              className="font-semibold"
              style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.keyLabelFontSize }}
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
