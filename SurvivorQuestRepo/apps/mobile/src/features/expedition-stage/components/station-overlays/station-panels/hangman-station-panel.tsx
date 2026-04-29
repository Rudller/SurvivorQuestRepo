import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { HANGMAN_ALPHABET, HANGMAN_MAX_MISSES } from "../puzzle-helpers";
import { useStationPanelLayout, withAlpha } from "./shared-ui";

type HangmanStationPanelProps = {
  stationId: string;
  hangmanMisses: string[];
  hangmanAttemptsLeft: number;
  hangmanResult: string | null;
  guessedHangmanSet: Set<string>;
  isGuessDisabled: boolean;
  isSubmittingHangmanGuess: boolean;
  onSubmitLetter: (letter: string) => void;
};

type HangmanStationText = {
  attempts: string;
  wrongLetters: string;
};

const HANGMAN_STATION_TEXT_ENGLISH: HangmanStationText = {
  attempts: "Attempts",
  wrongLetters: "Wrong letters",
};

const HANGMAN_STATION_TEXT: Record<UiLanguage, HangmanStationText> = {
  polish: {
    attempts: "Próby",
    wrongLetters: "Błędne litery",
  },
  english: HANGMAN_STATION_TEXT_ENGLISH,
  ukrainian: {
    attempts: "Спроби",
    wrongLetters: "Неправильні літери",
  },
  russian: {
    attempts: "Попытки",
    wrongLetters: "Неверные буквы",
  },
};

const HANGMAN_KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
  ["Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ź", "Ż"],
] as const;

export function HangmanStationPanel({
  stationId,
  hangmanMisses,
  hangmanAttemptsLeft,
  hangmanResult,
  guessedHangmanSet,
  isGuessDisabled,
  isSubmittingHangmanGuess,
  onSubmitLetter,
}: HangmanStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = HANGMAN_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const keyboardGap = layout.isTablet ? 10 : 6;
  const keySize = layout.isTablet ? 54 : 28;
  const keyboardVerticalMargin = layout.isTablet ? 12 : 8;
  const polishLettersRowGap = layout.isTablet ? 14 : 10;
  const polishLettersRowIndex = HANGMAN_KEYBOARD_ROWS.length - 1;
  const safeMaxAttempts = Math.max(1, HANGMAN_MAX_MISSES);
  const safeAttemptsLeft = Math.max(0, Math.min(safeMaxAttempts, hangmanAttemptsLeft));
  const attemptsDotSize = layout.isTablet ? 16 : 11;
  const attemptsDotGap = layout.isTablet ? 12 : 8;

  return (
    <View className="mt-3">
      <Text className="text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.attempts}
      </Text>
      <View className="mt-1 flex-row justify-center" style={{ columnGap: attemptsDotGap }}>
        {Array.from({ length: safeMaxAttempts }).map((_, index) => {
          const isActive = index < safeAttemptsLeft;
          const activeColor = EXPEDITION_THEME.accentStrong;
          return (
            <View
              key={`${stationId}-hangman-attempt-${index}`}
              className="rounded-full border"
              style={{
                width: attemptsDotSize,
                height: attemptsDotSize,
                borderColor: isActive ? activeColor : EXPEDITION_THEME.border,
                backgroundColor: isActive ? activeColor : "transparent",
              }}
            />
          );
        })}
      </View>
      {hangmanMisses.length > 0 ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.danger, fontSize: layout.infoFontSize }}>
          {text.wrongLetters}: {hangmanMisses.join(", ")}
        </Text>
      ) : null}

      <View style={{ rowGap: keyboardGap, marginVertical: keyboardVerticalMargin }}>
        {HANGMAN_KEYBOARD_ROWS.map((row, rowIndex) => (
          <View
            key={`${stationId}-hangman-row-${rowIndex}`}
            className="flex-row justify-center"
            style={{
              columnGap: keyboardGap,
              marginTop: rowIndex === polishLettersRowIndex ? polishLettersRowGap : 0,
            }}
          >
            {row.map((letter) => {
              const used = guessedHangmanSet.has(letter) || hangmanMisses.includes(letter);
              const isValidLetter = HANGMAN_ALPHABET.includes(letter);
              return (
                <Pressable
                  key={`${stationId}-hangman-letter-${letter}`}
                  className="items-center justify-center rounded-2xl border active:opacity-85"
                  style={{
                    width: keySize,
                    height: keySize,
                    borderColor: used ? withAlpha(EXPEDITION_THEME.textSubtle, 0.58) : EXPEDITION_THEME.border,
                    backgroundColor: used ? withAlpha(EXPEDITION_THEME.textSubtle, 0.2) : EXPEDITION_THEME.panelStrong,
                    opacity: isGuessDisabled || used || !isValidLetter ? 0.45 : 1,
                  }}
                  onPress={() => {
                    onSubmitLetter(letter);
                  }}
                  disabled={isGuessDisabled || used || !isValidLetter || isSubmittingHangmanGuess}
                  hitSlop={layout.isTablet ? 8 : 4}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 21 : 13 }}
                  >
                    {letter}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {hangmanResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {hangmanResult}
        </Text>
      ) : null}
    </View>
  );
}
