import { Pressable, Text, TextInput, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";

type CaesarStationPanelProps = {
  caesarEncoded: string;
  caesarAttemptsLeft: number;
  caesarInput: string;
  caesarResult: string | null;
  isActionDisabled: boolean;
  isSubmittingCaesar: boolean;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
};

export function CaesarStationPanel({
  caesarEncoded,
  caesarAttemptsLeft,
  caesarInput,
  caesarResult,
  isActionDisabled,
  isSubmittingCaesar,
  onChangeInput,
  onSubmit,
}: CaesarStationPanelProps) {
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Odszyfruj: <Text className="font-bold">{caesarEncoded}</Text>
      </Text>
      <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
        Wskazówka: przesunięcie +3 • Pozostało prób: {caesarAttemptsLeft}
      </Text>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
          }}
          placeholder="Wpisz odszyfrowaną frazę"
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          autoCapitalize="characters"
          autoCorrect={false}
          value={caesarInput}
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
          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingCaesar ? "..." : "Sprawdź"}</Text>
        </Pressable>
      </View>
      {caesarResult ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {caesarResult}
        </Text>
      ) : null}
    </View>
  );
}
