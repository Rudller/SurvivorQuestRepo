import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { MASTERMIND_MAX_ATTEMPTS, MASTERMIND_SYMBOLS } from "../puzzle-helpers";
import { AttemptsIndicator, useStationPanelLayout } from "./shared-ui";

export type MastermindAttempt = {
  guess: string;
  exact: number;
  misplaced: number;
};

type MastermindStationPanelProps = {
  stationId: string;
  mastermindAttempts: MastermindAttempt[];
  mastermindAttemptsLeft: number;
  mastermindInput: string;
  mastermindResult: string | null;
  isInputEditable: boolean;
  isActionDisabled: boolean;
  isSymbolDisabled: boolean;
  isSubmittingMastermindGuess: boolean;
  onChangeInput: (value: string) => void;
  onSubmitGuess: () => void;
  onAddSymbol: (symbol: string) => void;
};

type MastermindStationText = {
  codeInfo: string;
  attempts: string;
  remaining: string;
  exact: string;
  misplaced: string;
  placeholder: string;
  check: string;
};

const MASTERMIND_STATION_TEXT_ENGLISH: MastermindStationText = {
  codeInfo: "Code consists of 4 symbols (A-F).",
  attempts: "Attempts",
  remaining: "Remaining",
  exact: "exact",
  misplaced: "misplaced",
  placeholder: "e.g. ABCD",
  check: "Check",
};

const MASTERMIND_STATION_TEXT: Record<UiLanguage, MastermindStationText> = {
  polish: {
    codeInfo: "Kod składa się z 4 znaków (A-F).",
    attempts: "Próby",
    remaining: "Pozostało",
    exact: "trafione",
    misplaced: "miejsce",
    placeholder: "np. ABCD",
    check: "Sprawdź",
  },
  english: MASTERMIND_STATION_TEXT_ENGLISH,
  ukrainian: {
    codeInfo: "Код складається з 4 символів (A-F).",
    attempts: "Спроби",
    remaining: "Залишилось",
    exact: "точно",
    misplaced: "не на місці",
    placeholder: "напр. ABCD",
    check: "Перевірити",
  },
  russian: {
    codeInfo: "Код состоит из 4 символов (A-F).",
    attempts: "Попытки",
    remaining: "Осталось",
    exact: "точно",
    misplaced: "не на месте",
    placeholder: "напр. ABCD",
    check: "Проверить",
  },
};

export function MastermindStationPanel({
  stationId,
  mastermindAttempts,
  mastermindAttemptsLeft,
  mastermindInput,
  mastermindResult,
  isInputEditable,
  isActionDisabled,
  isSymbolDisabled,
  isSubmittingMastermindGuess,
  onChangeInput,
  onSubmitGuess,
  onAddSymbol,
}: MastermindStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = MASTERMIND_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();

  return (
    <View className="mt-3">
      <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.codeInfo} {text.attempts}: {mastermindAttempts.length}/{MASTERMIND_MAX_ATTEMPTS}
      </Text>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.remaining}
          attemptsLeft={mastermindAttemptsLeft}
          maxAttempts={MASTERMIND_MAX_ATTEMPTS}
        />
      </View>
      <View className="mt-2 gap-1.5">
        {mastermindAttempts.map((attempt, index) => (
          <View
            key={`${stationId}-mastermind-${index}`}
            className="flex-row items-center justify-between rounded-xl border px-3 py-2"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
          >
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {attempt.guess}
            </Text>
            <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
              ● {text.exact}: {attempt.exact} • ◐ {text.misplaced}: {attempt.misplaced}
            </Text>
          </View>
        ))}
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
          value={mastermindInput}
          onChangeText={onChangeInput}
          editable={isInputEditable}
          onSubmitEditing={onSubmitGuess}
        />
        <Pressable
          className="items-center justify-center rounded-xl px-5 active:opacity-90"
          style={{
            backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
            minHeight: layout.actionMinHeight,
          }}
          onPress={onSubmitGuess}
          disabled={isActionDisabled}
        >
          <Text className="font-semibold text-zinc-950" style={{ fontSize: layout.actionFontSize }}>
            {isSubmittingMastermindGuess ? "..." : text.check}
          </Text>
        </Pressable>
      </View>
      <View className="mt-2 flex-row flex-wrap gap-1.5">
        {MASTERMIND_SYMBOLS.map((symbol) => (
          <Pressable
            key={`${stationId}-mastermind-symbol-${symbol}`}
            className="items-center justify-center rounded-md border active:opacity-90"
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panelStrong,
              width: layout.isTablet ? 38 : 32,
              height: layout.isTablet ? 38 : 32,
            }}
            onPress={() => {
              onAddSymbol(symbol);
            }}
            disabled={isSymbolDisabled}
            hitSlop={4}
          >
            <Text
              className="font-semibold"
              style={{
                color: EXPEDITION_THEME.textPrimary,
                fontSize: layout.isTablet ? 16 : 12,
                textAlign: "center",
                textAlignVertical: "center",
                includeFontPadding: false,
              }}
            >
              {symbol}
            </Text>
          </Pressable>
        ))}
      </View>
      {mastermindResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {mastermindResult}
        </Text>
      ) : null}
    </View>
  );
}
