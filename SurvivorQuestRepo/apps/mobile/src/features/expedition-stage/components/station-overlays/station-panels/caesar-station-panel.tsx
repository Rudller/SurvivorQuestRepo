import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { resolveActionLabelColor, useStationPanelLayout } from "./shared-ui";

type CaesarStationPanelProps = {
  caesarInput: string;
  caesarMaxLength: number;
  caesarResult: string | null;
  isActionDisabled: boolean;
  isSubmittingCaesar: boolean;
  onChangeInput: (value: string) => void;
  onAppendCharacter: (value: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
};

type CaesarStationText = {
  placeholder: string;
  check: string;
  space: string;
};

const CAESAR_STATION_TEXT_ENGLISH: CaesarStationText = {
  placeholder: "Enter decrypted phrase",
  check: "Check",
  space: "Space",
};

const CAESAR_STATION_TEXT: Record<UiLanguage, CaesarStationText> = {
  polish: {
    placeholder: "Wpisz odszyfrowaną frazę",
    check: "Sprawdź",
    space: "Spacja",
  },
  english: CAESAR_STATION_TEXT_ENGLISH,
  ukrainian: {
    placeholder: "Введіть розшифровану фразу",
    check: "Перевірити",
    space: "Пробіл",
  },
  russian: {
    placeholder: "Введите расшифрованную фразу",
    check: "Проверить",
    space: "Пробел",
  },
};

const CAESAR_KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
] as const;

export function CaesarStationPanel({
  caesarInput,
  caesarMaxLength,
  caesarResult,
  isActionDisabled,
  isSubmittingCaesar,
  onChangeInput,
  onAppendCharacter,
  onBackspace,
  onSubmit,
}: CaesarStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = CAESAR_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const [keyboardWidth, setKeyboardWidth] = useState(0);
  const canAppendCharacter = !isActionDisabled && caesarInput.length < caesarMaxLength;
  const canBackspace = !isActionDisabled && caesarInput.length > 0;
  const keyboardGap = layout.isTablet ? 8 : 2;

  const keySize = useMemo(() => {
    if (layout.isTablet) {
      const desiredTablet = 58;
      const minTablet = 40;
      if (keyboardWidth <= 0) return desiredTablet;
      const computed = Math.floor((keyboardWidth - keyboardGap * 9) / 10);
      return Math.max(minTablet, Math.min(desiredTablet, computed));
    }
    const available = keyboardWidth > 0 ? keyboardWidth : 260;
    return Math.max(24, Math.floor((available - 9 * keyboardGap) / 10));
  }, [keyboardGap, keyboardWidth, layout.isTablet]);

  const keyHeight = layout.isTablet ? keySize : Math.round(keySize * 1.25);
  const backspaceWidth = Math.max(layout.isTablet ? 84 : 66, keySize + (layout.isTablet ? 24 : 18));
  const measuredKeyboardWidth = keyboardWidth > 0 ? keyboardWidth : Math.max(260, keySize * 10 + keyboardGap * 9);
  const actionRowGap = keyboardGap;
  const spaceWidth = Math.min(
    Math.max(120, measuredKeyboardWidth - backspaceWidth - actionRowGap),
    Math.max(keySize * (layout.isTablet ? 6.5 : 5.8), layout.isTablet ? 320 : 220),
  );

  return (
    <View className="mt-3">
      <View className="flex-row gap-2">
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
          showSoftInputOnFocus={false}
          maxLength={caesarMaxLength}
          value={caesarInput}
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
          <Text
            className="font-semibold"
            style={{ color: resolveActionLabelColor(isActionDisabled), fontSize: layout.actionFontSize }}
          >
            {isSubmittingCaesar ? "..." : text.check}
          </Text>
        </Pressable>
      </View>

      <View
        className="gap-2"
        style={{ marginTop: layout.isTablet ? 20 : 16, marginBottom: layout.isTablet ? 12 : 8 }}
        onLayout={(event) => {
          setKeyboardWidth(event.nativeEvent.layout.width);
        }}
      >
        {CAESAR_KEYBOARD_ROWS.map((row, rowIndex) => (
          <View key={`caesar-keyboard-row-${rowIndex}`} className="flex-row justify-center" style={{ columnGap: keyboardGap }}>
            {row.map((key) => (
              <Pressable
                key={`caesar-key-${key}`}
                className="items-center justify-center rounded-xl border active:opacity-85"
                style={{
                  width: keySize,
                  height: keyHeight,
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelStrong,
                  opacity: canAppendCharacter ? 1 : 0.45,
                }}
                disabled={!canAppendCharacter}
                onPress={() => onAppendCharacter(key)}
                hitSlop={3}
              >
                <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 18 : 15 }}>
                  {key}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}

        <View className="flex-row justify-center" style={{ columnGap: actionRowGap }}>
          <Pressable
            className="items-center justify-center rounded-xl border px-4 active:opacity-85"
            style={{
              width: spaceWidth,
              height: keyHeight,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panelStrong,
              opacity: canAppendCharacter ? 1 : 0.45,
            }}
            disabled={!canAppendCharacter}
            onPress={() => onAppendCharacter(" ")}
            hitSlop={3}
          >
            <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 16 : 13 }}>
              {text.space}
            </Text>
          </Pressable>
          <Pressable
            className="items-center justify-center rounded-xl border px-4 active:opacity-85"
            style={{
              width: backspaceWidth,
              height: keyHeight,
              borderColor: EXPEDITION_THEME.accent,
              backgroundColor: EXPEDITION_THEME.accent,
              opacity: canBackspace ? 1 : 0.45,
            }}
            disabled={!canBackspace}
            onPress={onBackspace}
            hitSlop={3}
          >
            <Text
              className="font-semibold"
              style={{ color: resolveActionLabelColor(!canBackspace), fontSize: layout.isTablet ? 18 : 14 }}
            >
              ⌫
            </Text>
          </Pressable>
        </View>
      </View>

      {caesarResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {caesarResult}
        </Text>
      ) : null}
    </View>
  );
}
