import { Pressable, Text, TextInput, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { HANGMAN_ALPHABET, HANGMAN_MAX_MISSES } from "../puzzle-helpers";

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
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Pudła: {hangmanMisses.length}/{HANGMAN_MAX_MISSES} • Pozostało: {hangmanAttemptsLeft}
      </Text>
      <Text
        className="mt-2 text-lg font-bold"
        style={{ color: EXPEDITION_THEME.textPrimary, letterSpacing: 1.8 }}
      >
        {hangmanMaskedSecret}
      </Text>
      {hangmanMisses.length > 0 ? (
        <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.danger }}>
          Błędne litery: {hangmanMisses.join(", ")}
        </Text>
      ) : null}

      <View className="mt-3 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
          }}
          placeholder="Wpisz literę"
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          autoCapitalize="characters"
          autoCorrect={false}
          value={hangmanInput}
          onChangeText={onChangeInput}
          editable={isInputEditable}
          onSubmitEditing={onSubmitGuess}
        />
        <Pressable
          className="items-center justify-center rounded-xl px-4 active:opacity-90"
          style={{
            backgroundColor: isGuessDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          }}
          onPress={onSubmitGuess}
          disabled={isGuessDisabled}
        >
          <Text className="text-xs font-semibold text-zinc-950">
            {isSubmittingHangmanGuess ? "..." : "Zgadnij"}
          </Text>
        </Pressable>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {HANGMAN_ALPHABET.map((letter) => {
          const used = guessedHangmanSet.has(letter) || hangmanMisses.includes(letter);
          return (
            <Pressable
              key={`${stationId}-hangman-letter-${letter}`}
              className="h-8 w-8 items-center justify-center rounded-md border active:opacity-90"
              style={{
                borderColor: used ? "rgba(161, 161, 170, 0.6)" : EXPEDITION_THEME.border,
                backgroundColor: used ? "rgba(113, 113, 122, 0.22)" : EXPEDITION_THEME.panelStrong,
              }}
              onPress={() => {
                onSubmitLetter(letter);
              }}
              disabled={used || isGuessDisabled}
            >
              <Text className="text-[11px] font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {letter}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hangmanResult ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {hangmanResult}
        </Text>
      ) : null}
    </View>
  );
}
