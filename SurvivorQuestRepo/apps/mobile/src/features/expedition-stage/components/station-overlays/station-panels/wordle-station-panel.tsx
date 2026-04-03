import { Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { WORDLE_MAX_ATTEMPTS, type WordleCellState } from "../puzzle-helpers";

export type WordleAttempt = {
  guess: string;
  evaluation: WordleCellState[];
};

const WORDLE_KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
] as const;

function resolveWordleColors(state?: WordleCellState) {
  return {
    backgroundColor:
      state === "correct"
        ? "rgba(34, 197, 94, 0.35)"
        : state === "present"
          ? "rgba(245, 158, 11, 0.28)"
          : state === "absent"
            ? "rgba(120, 120, 120, 0.25)"
            : EXPEDITION_THEME.panelStrong,
    borderColor:
      state === "correct"
        ? "rgba(34, 197, 94, 0.72)"
        : state === "present"
          ? "rgba(245, 158, 11, 0.72)"
          : state === "absent"
            ? "rgba(161, 161, 170, 0.5)"
            : EXPEDITION_THEME.border,
  };
}

type WordleMediaBoardProps = {
  stationId: string;
  attemptsCount: number;
  displayLength: number;
  attempts: WordleAttempt[];
  cellSize: number;
  letterGap?: number;
  rowGap?: number;
};

export function WordleMediaBoard({
  stationId,
  attemptsCount,
  displayLength,
  attempts,
  cellSize,
  letterGap = 4,
  rowGap = 3,
}: WordleMediaBoardProps) {
  return (
    <View className="flex-1 px-3 py-3">
      <View className="mb-2 items-end">
        <Text className="text-[11px] font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
          Próby {attemptsCount}/{WORDLE_MAX_ATTEMPTS}
        </Text>
      </View>
      <View className="flex-1 justify-center" style={{ rowGap }}>
        {Array.from({ length: WORDLE_MAX_ATTEMPTS }).map((_, rowIndex) => {
          const attempt = attempts[rowIndex];
          const guessCharacters = Array.from(attempt?.guess ?? "");
          const evaluation = attempt?.evaluation ?? [];

          return (
            <View
              key={`${stationId}-wordle-media-row-${rowIndex}`}
              className="flex-row justify-center"
              style={{ columnGap: letterGap }}
            >
              {Array.from({ length: displayLength }).map((__, columnIndex) => {
                const letter = guessCharacters[columnIndex] ?? "";
                const colors = resolveWordleColors(evaluation[columnIndex]);
                return (
                  <View
                    key={`${stationId}-wordle-media-cell-${rowIndex}-${columnIndex}`}
                    className="items-center justify-center rounded-lg border"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderColor: colors.borderColor,
                      backgroundColor: colors.backgroundColor,
                    }}
                  >
                    <Text className="text-sm font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                      {letter || " "}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

type WordleInteractionPanelProps = {
  stationId: string;
  displayLength: number;
  inputCharacters: string[];
  boardCellSize: number;
  keyboardKeySize: number;
  keyboardKeyGap: number;
  keyStateByLetter: Map<string, WordleCellState>;
  isInteractiveDisabled: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  canBackspace: boolean;
  result: string | null;
  onLayoutKeyboard: (width: number) => void;
  onPressKey: (key: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
};

export function WordleInteractionPanel({
  stationId,
  displayLength,
  inputCharacters,
  boardCellSize,
  keyboardKeySize,
  keyboardKeyGap,
  keyStateByLetter,
  isInteractiveDisabled,
  isSubmitting,
  canSubmit,
  canBackspace,
  result,
  onLayoutKeyboard,
  onPressKey,
  onBackspace,
  onSubmit,
}: WordleInteractionPanelProps) {
  return (
    <View className="mt-3">
      <View className="mt-3 flex-row justify-center" style={{ columnGap: 2 }}>
        {Array.from({ length: displayLength }).map((_, index) => {
          const letter = inputCharacters[index] ?? "";
          return (
            <View
              key={`${stationId}-wordle-input-cell-${index}`}
              className="items-center justify-center rounded-lg border"
              style={{
                width: boardCellSize,
                height: boardCellSize,
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panelStrong,
              }}
            >
              <Text className="text-sm font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {letter || " "}
              </Text>
            </View>
          );
        })}
      </View>

      <View
        className="mt-3 gap-2"
        onLayout={(event) => {
          onLayoutKeyboard(event.nativeEvent.layout.width);
        }}
      >
        {WORDLE_KEYBOARD_ROWS.map((row, rowIndex) => (
          <View
            key={`${stationId}-wordle-kb-row-${rowIndex}`}
            className="flex-row justify-center"
            style={{ columnGap: keyboardKeyGap }}
          >
            {row.map((key) => {
              const colors = resolveWordleColors(keyStateByLetter.get(key));
              return (
                <Pressable
                  key={`${stationId}-wordle-kb-${key}`}
                  className="items-center justify-center rounded-2xl border active:opacity-85"
                  style={{
                    width: keyboardKeySize,
                    height: keyboardKeySize,
                    borderColor: colors.borderColor,
                    backgroundColor: colors.backgroundColor,
                    opacity: isInteractiveDisabled ? 0.45 : 1,
                  }}
                  disabled={isInteractiveDisabled}
                  onPress={() => {
                    onPressKey(key);
                  }}
                >
                  <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View className="mt-2 flex-row gap-2">
        <Pressable
          className="flex-1 items-center justify-center rounded-xl border py-2.5 active:opacity-90"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            opacity: !canBackspace ? 0.45 : 1,
          }}
          disabled={!canBackspace}
          onPress={onBackspace}
        >
          <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            ⌫
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center justify-center rounded-xl py-2.5 active:opacity-90"
          style={{
            backgroundColor: canSubmit ? EXPEDITION_THEME.accent : EXPEDITION_THEME.panelStrong,
            opacity: canSubmit ? 1 : 0.6,
          }}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          <Text className="text-sm font-semibold text-zinc-950">
            {isSubmitting ? "Sprawdzanie..." : "Sprawdź słowo"}
          </Text>
        </Pressable>
      </View>
      {result ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {result}
        </Text>
      ) : null}
    </View>
  );
}
