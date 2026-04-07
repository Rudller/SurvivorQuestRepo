import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

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

const WORDLE_TILE_COLORS = {
  correct: "#6aaa64",
  present: "#c9b458",
  absent: "#787c7e",
} as const;
const WORDLE_FLIP_HALF_DURATION_MS = 120;
const WORDLE_INPUT_POP_UP_DURATION_MS = 90;
const WORDLE_INPUT_POP_DOWN_DURATION_MS = 70;

function resolveWordleColors(state?: WordleCellState) {
  return {
    backgroundColor:
      state === "correct"
        ? WORDLE_TILE_COLORS.correct
        : state === "present"
          ? WORDLE_TILE_COLORS.present
          : state === "absent"
            ? WORDLE_TILE_COLORS.absent
            : EXPEDITION_THEME.panelStrong,
    borderColor:
      state === "correct"
        ? WORDLE_TILE_COLORS.correct
        : state === "present"
          ? WORDLE_TILE_COLORS.present
          : state === "absent"
            ? WORDLE_TILE_COLORS.absent
            : EXPEDITION_THEME.border,
  };
}

type WordleRevealCellProps = {
  id: string;
  cellSize: number;
  letter: string;
  state?: WordleCellState;
  isRevealed: boolean;
};

function WordleRevealCell({
  id,
  cellSize,
  letter,
  state,
  isRevealed,
}: WordleRevealCellProps) {
  const flipScaleAnimation = useRef(new Animated.Value(1)).current;
  const wasRevealedRef = useRef(isRevealed);
  const [displayedState, setDisplayedState] = useState<WordleCellState | undefined>(
    isRevealed ? state : undefined,
  );

  useEffect(() => {
    let colorSwapTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!isRevealed) {
      wasRevealedRef.current = false;
      setDisplayedState(undefined);
      flipScaleAnimation.stopAnimation();
      flipScaleAnimation.setValue(1);
      return () => {};
    }

    if (!wasRevealedRef.current) {
      wasRevealedRef.current = true;
      setDisplayedState(undefined);
      flipScaleAnimation.stopAnimation();
      flipScaleAnimation.setValue(1);
      colorSwapTimeout = setTimeout(() => {
        setDisplayedState(state);
      }, WORDLE_FLIP_HALF_DURATION_MS);
      Animated.sequence([
        Animated.timing(flipScaleAnimation, {
          toValue: 0,
          duration: WORDLE_FLIP_HALF_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(flipScaleAnimation, {
          toValue: 1,
          duration: WORDLE_FLIP_HALF_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setDisplayedState(state);
    }

    return () => {
      if (colorSwapTimeout) {
        clearTimeout(colorSwapTimeout);
      }
    };
  }, [flipScaleAnimation, isRevealed, state]);

  const colors = resolveWordleColors(displayedState);
  return (
    <Animated.View
      key={id}
      className="items-center justify-center rounded-lg border"
      style={{
        width: cellSize,
        height: cellSize,
        borderColor: colors.borderColor,
        backgroundColor: colors.backgroundColor,
        transform: [{ scaleY: flipScaleAnimation }],
      }}
    >
      <Text className="text-base font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
        {letter || " "}
      </Text>
    </Animated.View>
  );
}

type WordleMediaBoardProps = {
  stationId: string;
  displayLength: number;
  attempts: WordleAttempt[];
  revealedCellCounts: number[];
  cellSize: number;
  letterGap?: number;
  rowGap?: number;
};

export function WordleMediaBoard({
  stationId,
  displayLength,
  attempts,
  revealedCellCounts,
  cellSize,
  letterGap = 6,
  rowGap = 6,
}: WordleMediaBoardProps) {
  return (
    <View className="flex-1 px-3 py-3">
      <View className="flex-1 justify-center" style={{ rowGap }}>
        {Array.from({ length: WORDLE_MAX_ATTEMPTS }).map((_, rowIndex) => {
          const attempt = attempts[rowIndex];
          const guessCharacters = Array.from(attempt?.guess ?? "");
          const evaluation = attempt?.evaluation ?? [];
          const revealedCellCount = Math.max(
            0,
            Math.min(displayLength, attempt ? (revealedCellCounts[rowIndex] ?? displayLength) : 0),
          );

          return (
            <View
              key={`${stationId}-wordle-media-row-${rowIndex}`}
              className="flex-row justify-center"
              style={{ columnGap: letterGap }}
            >
              {Array.from({ length: displayLength }).map((__, columnIndex) => {
                const letter = guessCharacters[columnIndex] ?? "";
                return (
                  <WordleRevealCell
                    key={`${stationId}-wordle-media-cell-${rowIndex}-${columnIndex}`}
                    id={`${stationId}-wordle-media-cell-${rowIndex}-${columnIndex}`}
                    cellSize={cellSize}
                    letter={letter}
                    state={evaluation[columnIndex]}
                    isRevealed={columnIndex < revealedCellCount}
                  />
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
  isRevealing: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  canBackspace: boolean;
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
  isRevealing,
  isSubmitting,
  canSubmit,
  canBackspace,
  onLayoutKeyboard,
  onPressKey,
  onBackspace,
  onSubmit,
}: WordleInteractionPanelProps) {
  const inputPopAnimationsRef = useRef<Animated.Value[]>([]);
  const previousInputRef = useRef<string[]>(inputCharacters);
  const inputShakeAnimation = useRef(new Animated.Value(0)).current;

  if (inputPopAnimationsRef.current.length !== displayLength) {
    inputPopAnimationsRef.current = Array.from(
      { length: displayLength },
      (_, index) => inputPopAnimationsRef.current[index] ?? new Animated.Value(1),
    );
  }

  useEffect(() => {
    const previousInput = previousInputRef.current;
    const nextLetterIndex = inputCharacters.findIndex((letter, index) => letter && letter !== previousInput[index]);
    if (nextLetterIndex >= 0) {
      const inputPopAnimation = inputPopAnimationsRef.current[nextLetterIndex];
      inputPopAnimation.stopAnimation();
      inputPopAnimation.setValue(1);
      Animated.sequence([
        Animated.timing(inputPopAnimation, {
          toValue: 1.12,
          duration: WORDLE_INPUT_POP_UP_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(inputPopAnimation, {
          toValue: 1,
          duration: WORDLE_INPUT_POP_DOWN_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start();
    }
    previousInputRef.current = inputCharacters;
  }, [displayLength, inputCharacters]);

  const inputRowShakeStyle = {
    transform: [{ translateX: inputShakeAnimation }],
  } as const;
  const triggerInputShake = () => {
    inputShakeAnimation.stopAnimation();
    inputShakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(inputShakeAnimation, { toValue: -9, duration: 45, useNativeDriver: true }),
      Animated.timing(inputShakeAnimation, { toValue: 9, duration: 45, useNativeDriver: true }),
      Animated.timing(inputShakeAnimation, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(inputShakeAnimation, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(inputShakeAnimation, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmitPress = () => {
    if (isInteractiveDisabled) {
      return;
    }
    if (!canSubmit) {
      triggerInputShake();
    }
    onSubmit();
  };

  return (
    <View className="mt-3">
      <Animated.View className="mt-3 w-full justify-center" style={inputRowShakeStyle}>
        <View className="flex-row justify-center" style={{ columnGap: 6 }}>
          {Array.from({ length: displayLength }).map((_, index) => {
            const letter = inputCharacters[index] ?? "";
            return (
              <Animated.View
                key={`${stationId}-wordle-input-cell-${index}`}
                style={{
                  transform: [{ scale: inputPopAnimationsRef.current[index] }],
                }}
              >
                <View
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
              </Animated.View>
            );
          })}
        </View>
        <View className="absolute right-0 top-0 bottom-0 justify-center">
          <Pressable
            className="items-center justify-center rounded-lg border active:opacity-90"
            style={{
              width: boardCellSize,
              height: boardCellSize,
              borderColor: EXPEDITION_THEME.accent,
              backgroundColor: EXPEDITION_THEME.accent,
              opacity: isInteractiveDisabled || !canBackspace ? 0.45 : 1,
            }}
            disabled={isInteractiveDisabled || !canBackspace}
            onPress={onBackspace}
          >
            <Text className="text-sm font-semibold text-zinc-950">⌫</Text>
          </Pressable>
        </View>
      </Animated.View>

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

      <View className="mt-4 items-center">
        <Pressable
          className="items-center justify-center rounded-xl py-4 active:opacity-90"
          style={{
            width: "50%",
            backgroundColor: !isInteractiveDisabled && canSubmit ? EXPEDITION_THEME.accent : EXPEDITION_THEME.panelStrong,
            opacity: isInteractiveDisabled ? 0.45 : 1,
          }}
          onPress={handleSubmitPress}
          disabled={isInteractiveDisabled}
        >
          <Text className="text-sm font-semibold text-zinc-950">
            {isSubmitting ? "Sprawdzanie..." : isRevealing ? "Odkrywanie..." : "Sprawdź słowo"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
