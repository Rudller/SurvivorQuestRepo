import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import { AttemptsIndicator, resolveActionLabelColor, useStationPanelLayout } from "./shared-ui";

type RebusStationPanelProps = {
  rebusQuestion: string;
  rebusAttemptsLeft: number;
  rebusInput: string;
  rebusResult: string | null;
  isActionDisabled: boolean;
  isSubmittingRebus: boolean;
  onChangeInput: (value: string) => void;
  onAppendCharacter: (value: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
};

type RebusStationText = {
  rebus: string;
  attemptsLeft: string;
  placeholder: string;
  check: string;
  space: string;
};

const REBUS_STATION_TEXT_ENGLISH: RebusStationText = {
  rebus: "Rebus",
  attemptsLeft: "Attempts left",
  placeholder: "Enter solution",
  check: "Check",
  space: "Space",
};

const REBUS_STATION_TEXT: Record<UiLanguage, RebusStationText> = {
  polish: {
    rebus: "Rebus",
    attemptsLeft: "Pozostało prób",
    placeholder: "Wpisz rozwiązanie",
    check: "Sprawdź",
    space: "Spacja",
  },
  english: REBUS_STATION_TEXT_ENGLISH,
  ukrainian: {
    rebus: "Ребус",
    attemptsLeft: "Залишилось спроб",
    placeholder: "Введіть відповідь",
    check: "Перевірити",
    space: "Пробіл",
  },
  russian: {
    rebus: "Ребус",
    attemptsLeft: "Осталось попыток",
    placeholder: "Введите решение",
    check: "Проверить",
    space: "Пробел",
  },
};

const REBUS_KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
] as const;

export function RebusStationPanel({
  rebusQuestion,
  rebusAttemptsLeft,
  rebusInput,
  rebusResult,
  isActionDisabled,
  isSubmittingRebus,
  onChangeInput,
  onAppendCharacter,
  onBackspace,
  onSubmit,
}: RebusStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = REBUS_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const actionLabelColor = resolveActionLabelColor(isActionDisabled);
  const [keyboardWidth, setKeyboardWidth] = useState(0);
  const keyboardGap = layout.isTablet ? 8 : 6;
  const desiredKeySize = layout.isTablet ? 58 : 42;
  const minKeySize = layout.isTablet ? 40 : 30;
  const canAppendCharacter = !isActionDisabled;
  const canBackspace = !isActionDisabled && rebusInput.length > 0;
  const keySize = useMemo(() => {
    if (keyboardWidth <= 0) {
      return desiredKeySize;
    }

    const availableForTopRow = keyboardWidth - keyboardGap * 9;
    if (availableForTopRow <= 0) {
      return minKeySize;
    }

    const computed = Math.floor(availableForTopRow / 10);
    return Math.max(minKeySize, Math.min(desiredKeySize, computed));
  }, [desiredKeySize, keyboardGap, keyboardWidth, minKeySize]);
  const backspaceWidth = Math.max(layout.isTablet ? 84 : 66, keySize + (layout.isTablet ? 24 : 18));
  const topRowWidth = keySize * 10 + keyboardGap * 9;
  const measuredKeyboardWidth = keyboardWidth > 0 ? keyboardWidth : topRowWidth;
  const actionRowGap = keyboardGap;
  const spaceWidth = Math.min(
    Math.max(120, measuredKeyboardWidth - backspaceWidth - actionRowGap),
    Math.max(keySize * (layout.isTablet ? 6.5 : 5.8), layout.isTablet ? 320 : 220),
  );
  const [topRow, ...bottomRows] = REBUS_KEYBOARD_ROWS;

  return (
    <View className="mt-3">
      <View className="mt-1">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={rebusAttemptsLeft}
          maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
        />
      </View>
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
          placeholder={text.placeholder}
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          autoCapitalize="characters"
          autoCorrect={false}
          showSoftInputOnFocus={false}
          value={rebusInput}
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
          <Text className="font-semibold" style={{ color: actionLabelColor, fontSize: layout.actionFontSize }}>
            {isSubmittingRebus ? "..." : text.check}
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
        <View className="items-center">
          <View style={{ width: topRowWidth, maxWidth: "100%" }}>
            <View className="flex-row" style={{ columnGap: keyboardGap }}>
              {topRow.map((key) => (
                <Pressable
                  key={`rebus-key-${key}`}
                  className="items-center justify-center rounded-2xl border active:opacity-85"
                  style={{
                    width: keySize,
                    height: keySize,
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
          </View>
        </View>

        {bottomRows.map((row, rowIndex) => (
          <View key={`rebus-keyboard-row-${rowIndex + 1}`} className="flex-row justify-center" style={{ columnGap: keyboardGap }}>
            {row.map((key) => (
              <Pressable
                key={`rebus-key-${key}`}
                className="items-center justify-center rounded-2xl border active:opacity-85"
                style={{
                  width: keySize,
                  height: keySize,
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
            className="items-center justify-center rounded-2xl border px-4 active:opacity-85"
            style={{
              width: spaceWidth,
              height: keySize,
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
            className="items-center justify-center rounded-2xl border px-4 active:opacity-85"
            style={{
              width: backspaceWidth,
              height: keySize,
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
      {rebusResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {rebusResult}
        </Text>
      ) : null}
    </View>
  );
}
