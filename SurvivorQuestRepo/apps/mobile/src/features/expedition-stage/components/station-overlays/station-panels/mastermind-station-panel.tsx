import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { MASTERMIND_MAX_ATTEMPTS, MASTERMIND_SYMBOLS } from "../puzzle-helpers";
import { AttemptsIndicator, resolveActionLabelColor, StationQuizTaskWrapper, useStationPanelLayout } from "./shared-ui";

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
  const actionLabelColor = resolveActionLabelColor(isActionDisabled);
  const normalizedMastermindInput = mastermindInput
    .toUpperCase()
    .replace(/[^A-F]/g, "")
    .slice(0, 4);
  const guessSlots = Array.from({ length: 4 }, (_, index) => normalizedMastermindInput[index] ?? "");

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
      <View className="mt-2 flex-row justify-center gap-2">
        {guessSlots.map((symbol, index) => (
          <View
            key={`${stationId}-mastermind-current-symbol-${index}`}
            className="items-center justify-center rounded-xl border"
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panelStrong,
              width: layout.isTablet ? 52 : 44,
              height: layout.isTablet ? 52 : 44,
            }}
          >
            <Text
              className="font-semibold"
              style={{
                color: symbol ? EXPEDITION_THEME.textPrimary : EXPEDITION_THEME.textSubtle,
                fontSize: layout.isTablet ? 22 : 18,
              }}
            >
              {symbol || "•"}
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
          value={normalizedMastermindInput}
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
          <Text className="font-semibold" style={{ color: actionLabelColor, fontSize: layout.actionFontSize }}>
            {isSubmittingMastermindGuess ? "..." : text.check}
          </Text>
        </Pressable>
      </View>
      <View className="mt-2 flex-row flex-wrap gap-1.5">
        {MASTERMIND_SYMBOLS.map((symbol) => (
          <Pressable
            key={`${stationId}-mastermind-symbol-${symbol}`}
            className="items-center justify-center rounded-lg border active:opacity-90"
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panelStrong,
              width: layout.isTablet ? 56 : 44,
              height: layout.isTablet ? 56 : 44,
            }}
            onPress={() => {
              onAddSymbol(symbol);
            }}
            disabled={isSymbolDisabled}
            hitSlop={8}
          >
            <Text
              className="font-semibold"
              style={{
                color: EXPEDITION_THEME.textPrimary,
                fontSize: layout.isTablet ? 22 : 17,
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
    </View>
  );
}

type MastermindAttemptsListProps = {
  stationId: string;
  mastermindAttempts: MastermindAttempt[];
};

export function MastermindAttemptsList({ stationId, mastermindAttempts }: MastermindAttemptsListProps) {
  const uiLanguage = useUiLanguage();
  const text = MASTERMIND_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const attemptsNewestFirst = [...mastermindAttempts].reverse();

  if (!attemptsNewestFirst.length) {
    return null;
  }

  return (
    <View className="mt-2 gap-1.5">
      {attemptsNewestFirst.map((attempt, index) => (
        <View
          key={`${stationId}-mastermind-history-${index}-${attempt.guess}`}
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
  );
}

type MastermindMediaSectionProps = {
  stationId: string;
  prompt: string;
  mastermindAttempts: MastermindAttempt[];
  mastermindAttemptsLeft: number;
  mastermindInput: string;
  isInteractiveLocked: boolean;
  isSubmittingMastermindGuess: boolean;
  mastermindSolved: boolean;
  isTabletOverlay: boolean;
  quizSubmitError: string | null;
  onChangeInput: (value: string) => void;
  onSubmitGuess: () => void;
  onAddSymbol: (symbol: string) => void;
};

export function MastermindMediaSection({
  stationId,
  prompt,
  mastermindAttempts,
  mastermindAttemptsLeft,
  mastermindInput,
  isInteractiveLocked,
  isSubmittingMastermindGuess,
  mastermindSolved,
  isTabletOverlay,
  quizSubmitError,
  onChangeInput,
  onSubmitGuess,
  onAddSymbol,
}: MastermindMediaSectionProps) {
  return (
    <View className="flex-1 px-2 py-2">
      <StationQuizTaskWrapper
        prompt={prompt}
        isTabletOverlay={isTabletOverlay}
        error={quizSubmitError}
        errorPlacement="outside"
        footer={(
          <MastermindAttemptsList
            stationId={stationId}
            mastermindAttempts={mastermindAttempts}
          />
        )}
      >
        <MastermindStationPanel
          stationId={stationId}
          mastermindAttempts={mastermindAttempts}
          mastermindAttemptsLeft={mastermindAttemptsLeft}
          mastermindInput={mastermindInput}
          isInputEditable={!isInteractiveLocked && !isSubmittingMastermindGuess && !mastermindSolved}
          isActionDisabled={
            isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0
          }
          isSymbolDisabled={
            isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0
          }
          isSubmittingMastermindGuess={isSubmittingMastermindGuess}
          onChangeInput={onChangeInput}
          onSubmitGuess={onSubmitGuess}
          onAddSymbol={onAddSymbol}
        />
      </StationQuizTaskWrapper>
    </View>
  );
}
