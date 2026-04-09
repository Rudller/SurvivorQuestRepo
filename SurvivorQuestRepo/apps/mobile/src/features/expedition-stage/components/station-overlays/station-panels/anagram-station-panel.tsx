import { Pressable, Text, TextInput, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

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

export function AnagramStationPanel({
  anagramAttemptsLeft,
  anagramInput,
  anagramResult,
  isActionDisabled,
  isSubmittingAnagram,
  onChangeInput,
  onSubmit,
}: AnagramStationPanelProps) {
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Pozostało prób: {anagramAttemptsLeft}
      </Text>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
          }}
          placeholder="Wpisz poprawne słowo"
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          autoCapitalize="characters"
          autoCorrect={false}
          value={anagramInput}
          onChangeText={onChangeInput}
          editable={!isActionDisabled}
          onSubmitEditing={onSubmit}
        />
        <Pressable
          className="items-center justify-center rounded-xl px-4 active:opacity-90"
          style={{
            backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          }}
          onPress={onSubmit}
          disabled={isActionDisabled}
        >
          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingAnagram ? "..." : "Sprawdź"}</Text>
        </Pressable>
      </View>
      {anagramResult ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {anagramResult}
        </Text>
      ) : null}
    </View>
  );
}

export function AnagramMediaPanel({ scrambledWords, hintWordCount, hintLettersLayout }: AnagramMediaPanelProps) {
  return (
    <View className="flex-1 items-center justify-center px-3">
      <View className="items-center justify-center" style={{ rowGap: 14 }}>
        {(scrambledWords.length > 0 ? scrambledWords : ["—"]).map((word, wordIndex) => (
          <View key={`anagram-top-word-${wordIndex}`} className="flex-row justify-center" style={{ columnGap: 10 }}>
            {Array.from(word).map((character, characterIndex) => (
              <View
                key={`anagram-top-${wordIndex}-${characterIndex}-${character}`}
                className="items-center justify-center rounded-lg border"
                style={{
                  minWidth: 52,
                  height: 52,
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelStrong,
                }}
              >
                <Text className="text-xl font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {character}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text className="mt-3 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
        Wyrazy: {hintWordCount} • Litery: {hintLettersLayout}
      </Text>
    </View>
  );
}
