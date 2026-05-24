import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import type { ChallengeDifficulty } from "../puzzle-helpers";
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
  mastermindDifficulty: ChallengeDifficulty;
  mastermindDifficultyMode: "admin" | "player";
  selectedMastermindDifficulty: ChallengeDifficulty | null;
  mastermindCodeLength: number;
  mastermindMaxAttempts: number;
  mastermindSymbols: readonly string[];
  isInputEditable: boolean;
  isActionDisabled: boolean;
  isSymbolDisabled: boolean;
  isSubmittingMastermindGuess: boolean;
  onChangeInput: (value: string) => void;
  onSubmitGuess: () => void;
  onAddSymbol: (symbol: string) => void;
  onBackspace: () => void;
  onSelectDifficulty: (difficulty: ChallengeDifficulty) => void;
};

type MastermindStationText = {
  codeInfo: string;
  rulesExact: string;
  rulesMisplaced: string;
  chooseDifficulty: string;
  easy: string;
  medium: string;
  hard: string;
  attempts: string;
  remaining: string;
  exact: string;
  misplaced: string;
  placeholder: string;
  check: string;
};

const MASTERMIND_STATION_TEXT_ENGLISH: MastermindStationText = {
  codeInfo: "Guess the code using the symbols below.",
  rulesExact: "correct symbol and position",
  rulesMisplaced: "correct symbol, wrong position",
  chooseDifficulty: "Choose difficulty",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  attempts: "Attempts",
  remaining: "Remaining",
  exact: "in place",
  misplaced: "wrong place",
  placeholder: "e.g. ABCD",
  check: "Check",
};

const MASTERMIND_STATION_TEXT: Record<UiLanguage, MastermindStationText> = {
  polish: {
    codeInfo: "Odgadnij kod używając poniższych symboli.",
    rulesExact: "symbol na dobrym miejscu",
    rulesMisplaced: "symbol jest w kodzie, ale w innym miejscu",
    chooseDifficulty: "Wybierz poziom trudności",
    easy: "Łatwy",
    medium: "Średni",
    hard: "Trudny",
    attempts: "Próby",
    remaining: "Pozostało",
    exact: "na miejscu",
    misplaced: "nie na miejscu",
    placeholder: "np. ABCD",
    check: "Sprawdź",
  },
  english: MASTERMIND_STATION_TEXT_ENGLISH,
  ukrainian: {
    codeInfo: "Вгадайте код, використовуючи символи нижче.",
    rulesExact: "правильний символ на правильному місці",
    rulesMisplaced: "символ є в коді, але в іншому місці",
    chooseDifficulty: "Оберіть складність",
    easy: "Легко",
    medium: "Середньо",
    hard: "Складно",
    attempts: "Спроби",
    remaining: "Залишилось",
    exact: "точно",
    misplaced: "не на місці",
    placeholder: "напр. ABCD",
    check: "Перевірити",
  },
  russian: {
    codeInfo: "Угадайте код, используя символы ниже.",
    rulesExact: "правильный символ на правильном месте",
    rulesMisplaced: "символ есть в коде, но в другом месте",
    chooseDifficulty: "Выберите сложность",
    easy: "Легко",
    medium: "Средне",
    hard: "Сложно",
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
  mastermindDifficulty,
  mastermindDifficultyMode,
  selectedMastermindDifficulty,
  mastermindCodeLength,
  mastermindMaxAttempts,
  mastermindSymbols,
  isInputEditable,
  isActionDisabled,
  isSymbolDisabled,
  isSubmittingMastermindGuess,
  onChangeInput,
  onSubmitGuess,
  onAddSymbol,
  onBackspace,
  onSelectDifficulty,
}: MastermindStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = MASTERMIND_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const actionLabelColor = resolveActionLabelColor(isActionDisabled);
  const normalizedMastermindInput = mastermindInput
    .toUpperCase()
    .replace(new RegExp(`[^${mastermindSymbols.join("")}]`, "g"), "")
    .slice(0, mastermindCodeLength);
  const guessSlots = Array.from({ length: mastermindCodeLength }, (_, index) => normalizedMastermindInput[index] ?? "");
  const canBackspace = !isSymbolDisabled && normalizedMastermindInput.length > 0;

  if (mastermindDifficultyMode === "player" && !selectedMastermindDifficulty) {
    const difficultyOptions: ChallengeDifficulty[] = ["easy", "medium", "hard"];
    return (
      <View className="mt-3 gap-2">
        <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.actionFontSize }}>
          {text.chooseDifficulty}
        </Text>
        {difficultyOptions.map((difficulty) => (
          <Pressable
            key={`${stationId}-mastermind-difficulty-${difficulty}`}
            className="rounded-2xl border px-4 py-3 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
            onPress={() => onSelectDifficulty(difficulty)}
          >
            <Text className="font-bold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.actionFontSize }}>
              {difficulty === "easy" ? text.easy : difficulty === "hard" ? text.hard : text.medium}
            </Text>
            <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
              {difficulty === "easy" ? "A-D • 4 • 10" : difficulty === "hard" ? "A-F • 5 • 6" : "A-F • 4 • 8"}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View className="mt-3">
      <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.codeInfo} {text.attempts}: {mastermindAttempts.length}/{mastermindMaxAttempts}
      </Text>
      <View className="mt-2 rounded-xl border px-3 py-2" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}>
        <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
          ● = {text.rulesExact}
        </Text>
        <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
          ◐ = {text.rulesMisplaced}
        </Text>
        <Text style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.infoFontSize }}>
          {mastermindDifficulty === "easy" ? text.easy : mastermindDifficulty === "hard" ? text.hard : text.medium}: {mastermindSymbols.join("")} • {mastermindCodeLength}
        </Text>
      </View>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.remaining}
          attemptsLeft={mastermindAttemptsLeft}
          maxAttempts={mastermindMaxAttempts}
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
          showSoftInputOnFocus={false}
          maxLength={mastermindCodeLength}
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
        {mastermindSymbols.map((symbol) => (
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
        <Pressable
          className="items-center justify-center rounded-lg border active:opacity-90"
          style={{
            borderColor: EXPEDITION_THEME.accent,
            backgroundColor: EXPEDITION_THEME.accent,
            width: layout.isTablet ? 56 : 44,
            height: layout.isTablet ? 56 : 44,
            opacity: canBackspace ? 1 : 0.45,
          }}
          onPress={onBackspace}
          disabled={!canBackspace}
          hitSlop={8}
        >
          <Text
            className="font-semibold"
            style={{
              color: resolveActionLabelColor(!canBackspace),
              fontSize: layout.isTablet ? 22 : 17,
              textAlign: "center",
              textAlignVertical: "center",
              includeFontPadding: false,
            }}
          >
            ⌫
          </Text>
        </Pressable>
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
          <View className="flex-row" style={{ columnGap: layout.isTablet ? 8 : 5 }}>
            {Array.from(attempt.guess).map((symbol, symbolIndex) => (
              <View
                key={`${stationId}-mastermind-history-${index}-${symbolIndex}`}
                className="items-center justify-center rounded-lg border"
                style={{
                  width: layout.isTablet ? 38 : 30,
                  height: layout.isTablet ? 38 : 30,
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
              >
                <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 17 : 13 }}>
                  {symbol}
                </Text>
              </View>
            ))}
          </View>
          <View className="flex-row" style={{ columnGap: layout.isTablet ? 8 : 5 }}>
            <View className="rounded-full border px-2 py-1" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}>
              <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>● {attempt.exact}</Text>
            </View>
            <View className="rounded-full border px-2 py-1" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}>
              <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>◐ {attempt.misplaced}</Text>
            </View>
          </View>
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
  mastermindDifficulty: ChallengeDifficulty;
  mastermindDifficultyMode: "admin" | "player";
  selectedMastermindDifficulty: ChallengeDifficulty | null;
  mastermindCodeLength: number;
  mastermindMaxAttempts: number;
  mastermindSymbols: readonly string[];
  isInteractiveLocked: boolean;
  isSubmittingMastermindGuess: boolean;
  mastermindSolved: boolean;
  isTabletOverlay: boolean;
  quizSubmitError: string | null;
  onChangeInput: (value: string) => void;
  onSubmitGuess: () => void;
  onAddSymbol: (symbol: string) => void;
  onBackspace: () => void;
  onSelectDifficulty: (difficulty: ChallengeDifficulty) => void;
};

export function MastermindMediaSection({
  stationId,
  prompt,
  mastermindAttempts,
  mastermindAttemptsLeft,
  mastermindInput,
  mastermindDifficulty,
  mastermindDifficultyMode,
  selectedMastermindDifficulty,
  mastermindCodeLength,
  mastermindMaxAttempts,
  mastermindSymbols,
  isInteractiveLocked,
  isSubmittingMastermindGuess,
  mastermindSolved,
  isTabletOverlay,
  quizSubmitError,
  onChangeInput,
  onSubmitGuess,
  onAddSymbol,
  onBackspace,
  onSelectDifficulty,
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
          mastermindDifficulty={mastermindDifficulty}
          mastermindDifficultyMode={mastermindDifficultyMode}
          selectedMastermindDifficulty={selectedMastermindDifficulty}
          mastermindCodeLength={mastermindCodeLength}
          mastermindMaxAttempts={mastermindMaxAttempts}
          mastermindSymbols={mastermindSymbols}
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
          onBackspace={onBackspace}
          onSelectDifficulty={onSelectDifficulty}
        />
      </StationQuizTaskWrapper>
    </View>
  );
}
