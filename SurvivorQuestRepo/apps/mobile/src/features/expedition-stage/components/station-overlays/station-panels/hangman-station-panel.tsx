import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { HANGMAN_ALPHABET, HANGMAN_MAX_MISSES } from "../puzzle-helpers";
import { AttemptsIndicator, useStationPanelLayout } from "./shared-ui";

type HangmanStationPanelProps = {
  stationId: string;
  hangmanMisses: string[];
  hangmanAttemptsLeft: number;
  hangmanMaskedSecret: string;
  hangmanInput: string;
  hangmanResult: string | null;
  guessedHangmanSet: Set<string>;
  isInputEditable: boolean;
  isGuessDisabled: boolean;
  isSubmittingHangmanGuess: boolean;
  onChangeInput: (value: string) => void;
  onSubmitGuess: () => void;
  onSubmitLetter: (letter: string) => void;
};

type HangmanStationText = {
  misses: string;
  remaining: string;
  wrongLetters: string;
  placeholder: string;
  guess: string;
};

const HANGMAN_STATION_TEXT_ENGLISH: HangmanStationText = {
  misses: "Misses",
  remaining: "Remaining",
  wrongLetters: "Wrong letters",
  placeholder: "Enter a letter",
  guess: "Guess",
};

const HANGMAN_STATION_TEXT: Record<UiLanguage, HangmanStationText> = {
  polish: {
    misses: "Pudła",
    remaining: "Pozostało",
    wrongLetters: "Błędne litery",
    placeholder: "Wpisz literę",
    guess: "Zgadnij",
  },
  english: HANGMAN_STATION_TEXT_ENGLISH,
  ukrainian: {
    misses: "Промахи",
    remaining: "Залишилось",
    wrongLetters: "Неправильні літери",
    placeholder: "Введіть літеру",
    guess: "Вгадати",
  },
  russian: {
    misses: "Промахи",
    remaining: "Осталось",
    wrongLetters: "Неверные буквы",
    placeholder: "Введите букву",
    guess: "Угадать",
  },
};

export function HangmanStationPanel({
  stationId,
  hangmanMisses,
  hangmanAttemptsLeft,
  hangmanMaskedSecret,
  hangmanInput,
  hangmanResult,
  guessedHangmanSet,
  isInputEditable,
  isGuessDisabled,
  isSubmittingHangmanGuess,
  onChangeInput,
  onSubmitGuess,
  onSubmitLetter,
}: HangmanStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = HANGMAN_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();

  return (
    <View className="mt-3">
      <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.misses}: {hangmanMisses.length}/{HANGMAN_MAX_MISSES}
      </Text>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.remaining}
          attemptsLeft={hangmanAttemptsLeft}
          maxAttempts={HANGMAN_MAX_MISSES}
        />
      </View>
      <Text
        className="mt-2 font-bold"
        style={{ color: EXPEDITION_THEME.textPrimary, letterSpacing: 1.8, fontSize: layout.isTablet ? 28 : 18 }}
      >
        {hangmanMaskedSecret}
      </Text>
        {hangmanMisses.length > 0 ? (
          <Text className="mt-1" style={{ color: EXPEDITION_THEME.danger, fontSize: layout.infoFontSize }}>
            {text.wrongLetters}: {hangmanMisses.join(", ")}
          </Text>
        ) : null}

      <View className="mt-3 flex-row gap-2">
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
          value={hangmanInput}
          onChangeText={onChangeInput}
          editable={isInputEditable}
          onSubmitEditing={onSubmitGuess}
        />
        <Pressable
          className="items-center justify-center rounded-xl px-5 active:opacity-90"
          style={{
            backgroundColor: isGuessDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
            minHeight: layout.actionMinHeight,
          }}
            onPress={onSubmitGuess}
            disabled={isGuessDisabled}
          >
            <Text className="font-semibold text-zinc-950" style={{ fontSize: layout.actionFontSize }}>
              {isSubmittingHangmanGuess ? "..." : text.guess}
            </Text>
          </Pressable>
        </View>

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {HANGMAN_ALPHABET.map((letter) => {
          const used = guessedHangmanSet.has(letter) || hangmanMisses.includes(letter);
          return (
            <Pressable
              key={`${stationId}-hangman-letter-${letter}`}
              className="items-center justify-center rounded-md border active:opacity-90"
              style={{
                width: layout.isTablet ? 38 : 32,
                height: layout.isTablet ? 38 : 32,
                borderColor: used ? "rgba(161, 161, 170, 0.6)" : EXPEDITION_THEME.border,
                backgroundColor: used ? "rgba(113, 113, 122, 0.22)" : EXPEDITION_THEME.panelStrong,
              }}
              onPress={() => {
                onSubmitLetter(letter);
              }}
              disabled={used || isGuessDisabled}
              hitSlop={4}
            >
              <Text
                className="font-semibold"
                style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 14 : 11 }}
              >
                {letter}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hangmanResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {hangmanResult}
        </Text>
      ) : null}
    </View>
  );
}
