import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import {
  NUMERIC_PINPAD_SUBLABELS,
  TEXT_PUZZLE_MAX_ATTEMPTS,
} from "../puzzle-helpers";
import {
  AttemptsIndicator,
  resolveActionLabelColor,
  useStationPanelLayout,
} from "./shared-ui";

type MiniSudokuStationPanelProps = {
  stationId: string;
  miniSudokuPuzzle: {
    given: (string | null)[];
    solution: string[];
  } | null;
  normalizedMiniSudokuValues: string[];
  miniSudokuAttemptsLeft: number;
  miniSudokuResult: string | null;
  conflictCellIndexes: number[];
  isActionDisabled: boolean;
  isSubmittingMiniSudoku: boolean;
  onChangeCell: (index: number, nextValue: string) => void;
  onSubmit: () => void;
};

type MiniSudokuStationText = {
  attemptsLeft: string;
  checkLayout: string;
};

const MINI_SUDOKU_STATION_TEXT_ENGLISH: MiniSudokuStationText = {
  attemptsLeft: "Attempts left",
  checkLayout: "Check layout",
};

const MINI_SUDOKU_STATION_TEXT: Record<UiLanguage, MiniSudokuStationText> = {
  polish: {
    attemptsLeft: "Pozostało prób",
    checkLayout: "Sprawdź układ",
  },
  english: MINI_SUDOKU_STATION_TEXT_ENGLISH,
  ukrainian: {
    attemptsLeft: "Залишилось спроб",
    checkLayout: "Перевірити розкладку",
  },
  russian: {
    attemptsLeft: "Осталось попыток",
    checkLayout: "Проверить расклад",
  },
};

const SUDOKU_PINPAD_LAYOUT = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "spacer-left",
  "backspace",
  "spacer-right",
] as const;

type MiniSudokuGridCellProps = {
  stationId: string;
  index: number;
  givenValue: string | null;
  value: string;
  isActive: boolean;
  isConflict: boolean;
  isActionDisabled: boolean;
  cellPercent: `${number}%`;
  boardLineStrong: number;
  boardLineThin: number;
  isTopBlockEdge: boolean;
  isLeftBlockEdge: boolean;
  isBottomEdge: boolean;
  isRightEdge: boolean;
  isTablet: boolean;
  valueFontSize: number;
  onSelectCell: (index: number) => void;
};

const MiniSudokuGridCell = memo(function MiniSudokuGridCellComponent({
  stationId,
  index,
  givenValue,
  value,
  isActive,
  isConflict,
  isActionDisabled,
  cellPercent,
  boardLineStrong,
  boardLineThin,
  isTopBlockEdge,
  isLeftBlockEdge,
  isBottomEdge,
  isRightEdge,
  isTablet,
  valueFontSize,
  onSelectCell,
}: MiniSudokuGridCellProps) {
  const cellBorderColor = "rgba(148, 163, 184, 0.55)";

  return (
    <View
      key={`${stationId}-sudoku-${index}`}
      className="items-center justify-center border"
      style={{
        width: cellPercent,
        height: cellPercent,
        borderTopWidth: isTopBlockEdge ? boardLineStrong : boardLineThin,
        borderLeftWidth: isLeftBlockEdge ? boardLineStrong : boardLineThin,
        borderRightWidth: isRightEdge ? boardLineStrong : 0,
        borderBottomWidth: isBottomEdge ? boardLineStrong : 0,
        borderColor: cellBorderColor,
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      {isConflict ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            bottom: 2,
            left: 2,
            borderWidth: isTablet ? 2 : 1.5,
            borderColor: "rgba(248, 113, 113, 0.95)",
            backgroundColor: "rgba(248, 113, 113, 0.18)",
          }}
        />
      ) : null}
      {isActive && !isConflict ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            bottom: 2,
            left: 2,
            borderWidth: isTablet ? 2 : 1.5,
            borderColor: "rgba(96, 165, 250, 0.95)",
            backgroundColor: "rgba(96, 165, 250, 0.16)",
          }}
        />
      ) : null}
      {givenValue ? (
        <Text
          className="text-center font-black"
          style={{ color: EXPEDITION_THEME.textPrimary, fontSize: valueFontSize }}
        >
          {givenValue}
        </Text>
      ) : (
        <Pressable
          className="h-full w-full items-center justify-center"
          onPressIn={() => {
            onSelectCell(index);
          }}
          disabled={isActionDisabled}
        >
          <Text
            className="text-center font-black"
            style={{
              color: isConflict ? "rgba(248, 113, 113, 0.95)" : value ? "#60a5fa" : EXPEDITION_THEME.textSubtle,
              fontSize: valueFontSize,
              width: "100%",
              textAlign: "center",
            }}
          >
            {value || "·"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}, (previousProps, nextProps) => {
  return (
    previousProps.givenValue === nextProps.givenValue &&
    previousProps.value === nextProps.value &&
    previousProps.isActive === nextProps.isActive &&
    previousProps.isConflict === nextProps.isConflict &&
    previousProps.isActionDisabled === nextProps.isActionDisabled &&
    previousProps.valueFontSize === nextProps.valueFontSize &&
    previousProps.isTablet === nextProps.isTablet &&
    previousProps.cellPercent === nextProps.cellPercent &&
    previousProps.boardLineStrong === nextProps.boardLineStrong &&
    previousProps.boardLineThin === nextProps.boardLineThin &&
    previousProps.isTopBlockEdge === nextProps.isTopBlockEdge &&
    previousProps.isLeftBlockEdge === nextProps.isLeftBlockEdge &&
    previousProps.isBottomEdge === nextProps.isBottomEdge &&
    previousProps.isRightEdge === nextProps.isRightEdge
  );
});

function MiniSudokuStationPanelComponent({
  stationId,
  miniSudokuPuzzle,
  normalizedMiniSudokuValues,
  miniSudokuAttemptsLeft,
  miniSudokuResult,
  conflictCellIndexes,
  isActionDisabled,
  isSubmittingMiniSudoku,
  onChangeCell,
  onSubmit,
}: MiniSudokuStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = MINI_SUDOKU_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const actionLabelColor = resolveActionLabelColor(isActionDisabled);
  const side = Math.max(2, Math.round(Math.sqrt(miniSudokuPuzzle?.given.length ?? 81)));
  const blockSide = Math.max(1, Math.round(Math.sqrt(side)));
  const cellPercent = `${100 / side}%` as `${number}%`;
  const boardLineStrong = layout.isTablet ? 3 : 2;
  const boardLineThin = 1;
  const valueFontSize = side >= 9 ? (layout.isTablet ? 20 : 15) : layout.isTablet ? 34 : 28;
  const boardWidthPercent = `${side >= 9 ? (layout.isTablet ? 72 : 66) : 100}%` as `${number}%`;

  const editableIndexes = useMemo(
    () =>
      (miniSudokuPuzzle?.given ?? [])
        .map((value, index) => (value === null ? index : -1))
        .filter((index) => index >= 0),
    [miniSudokuPuzzle?.given],
  );
  const editableSet = useMemo(() => new Set(editableIndexes), [editableIndexes]);
  const conflictCellIndexSet = useMemo(() => new Set(conflictCellIndexes), [conflictCellIndexes]);
  const firstEditableIndex = editableIndexes[0] ?? null;
  const [activeCellIndex, setActiveCellIndex] = useState<number | null>(firstEditableIndex);
  const canUsePinpad = !isActionDisabled && firstEditableIndex !== null;
  const handleSelectCell = useCallback((index: number) => {
    setActiveCellIndex(index);
  }, []);

  useEffect(() => {
    if (activeCellIndex === null || !editableSet.has(activeCellIndex)) {
      setActiveCellIndex(firstEditableIndex);
    }
  }, [activeCellIndex, editableSet, firstEditableIndex]);

  return (
    <View className="mt-2">
      <View className="mt-1">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={miniSudokuAttemptsLeft}
          maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
          align="center"
        />
      </View>

      <View className="mt-3 self-center" style={{ width: boardWidthPercent }}>
        <View
          style={{
            width: "100%",
            aspectRatio: 1,
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          {Array.from({ length: side * side }).map((_, index) => {
            const givenValue = miniSudokuPuzzle?.given[index] ?? null;
            const value = givenValue ?? normalizedMiniSudokuValues[index] ?? "";
            const row = Math.floor(index / side);
            const col = index % side;
            const isTopBlockEdge = row === 0 || row % blockSide === 0;
            const isLeftBlockEdge = col === 0 || col % blockSide === 0;
            const isBottomEdge = row === side - 1;
            const isRightEdge = col === side - 1;
            const isActive = activeCellIndex === index;
            const isConflict = givenValue === null && conflictCellIndexSet.has(index);
            return (
              <MiniSudokuGridCell
                key={`${stationId}-sudoku-${index}`}
                stationId={stationId}
                index={index}
                givenValue={givenValue}
                value={value}
                isActive={isActive}
                isConflict={isConflict}
                isActionDisabled={isActionDisabled}
                cellPercent={cellPercent}
                boardLineStrong={boardLineStrong}
                boardLineThin={boardLineThin}
                isTopBlockEdge={isTopBlockEdge}
                isLeftBlockEdge={isLeftBlockEdge}
                isBottomEdge={isBottomEdge}
                isRightEdge={isRightEdge}
                isTablet={layout.isTablet}
                valueFontSize={valueFontSize}
                onSelectCell={handleSelectCell}
              />
            );
          })}
        </View>
      </View>

      <View className="mx-auto mt-3 w-full max-w-[320px] flex-row flex-wrap justify-between gap-y-2">
          {SUDOKU_PINPAD_LAYOUT.map((key) => {
            const isSpacer =
              key === "spacer-left" || key === "spacer-right";

            if (isSpacer) {
              return (
                <View
                  key={`${stationId}-sudoku-pin-${key}`}
                  style={{ width: "31%", aspectRatio: 1 }}
                />
              );
            }

            const isBackspaceKey = key === "backspace";
            const targetIndex = activeCellIndex ?? firstEditableIndex;
            const hasValue =
              targetIndex !== null && Boolean(normalizedMiniSudokuValues[targetIndex]);
            const isDisabled =
              !canUsePinpad ||
              targetIndex === null ||
              (isBackspaceKey && !hasValue);
            const label = isBackspaceKey ? "⌫" : key;
            const isDigitKey = /^\d$/.test(label);
            const sublabel = isDigitKey ? NUMERIC_PINPAD_SUBLABELS[label] : "";

            return (
              <Pressable
                key={`${stationId}-sudoku-pin-${key}`}
                className="items-center justify-center rounded-full active:opacity-85"
                style={{
                  width: "31%",
                  aspectRatio: 1,
                  borderWidth: 1,
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelStrong,
                  opacity: isDisabled ? 0.45 : 1,
                }}
                disabled={isDisabled}
                onPressIn={() => {
                  if (targetIndex === null) {
                    return;
                  }

                  if (isBackspaceKey) {
                    onChangeCell(targetIndex, "");
                    return;
                  }

                  onChangeCell(targetIndex, key);
                  const nextIndex =
                    editableIndexes.find((index) => index > targetIndex) ??
                    editableIndexes[0] ??
                    targetIndex;
                  setActiveCellIndex(nextIndex);
                }}
              >
                {isDigitKey ? (
                  <View className="h-full w-full items-center justify-center">
                    <Text
                      className="text-[30px] font-medium text-center"
                      style={{
                        color: EXPEDITION_THEME.textPrimary,
                        textAlign: "center",
                        fontVariant: ["tabular-nums"],
                        fontSize: layout.isTablet ? 36 : 30,
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      className="mt-[-2px] text-[9px] font-semibold tracking-[1.6px] text-center"
                      style={{
                        color: EXPEDITION_THEME.textSubtle,
                        fontSize: layout.isTablet ? 9 : 8,
                      }}
                    >
                      {sublabel}
                    </Text>
                  </View>
                ) : (
                  <Text
                    className="text-base font-semibold text-center"
                    style={{
                      color: EXPEDITION_THEME.textPrimary,
                      width: "100%",
                      textAlign: "center",
                      textAlignVertical: "center",
                      fontSize: layout.isTablet ? 18 : 16,
                    }}
                  >
                    {label}
                  </Text>
                )}
              </Pressable>
            );
          })}
      </View>

      <Pressable
        className="mt-3 items-center rounded-xl active:opacity-90"
        style={{
          backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          minHeight: layout.actionMinHeight,
          justifyContent: "center",
        }}
        onPress={onSubmit}
        disabled={isActionDisabled}
      >
        <Text className="font-semibold" style={{ color: actionLabelColor, fontSize: layout.actionFontSize }}>
          {isSubmittingMiniSudoku ? "..." : text.checkLayout}
        </Text>
      </Pressable>
      {miniSudokuResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {miniSudokuResult}
        </Text>
      ) : null}
    </View>
  );
}

function areEqualNumberArrays(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function areEqualStringArrays(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

export const MiniSudokuStationPanel = memo(
  MiniSudokuStationPanelComponent,
  (previousProps, nextProps) => {
    return (
      previousProps.stationId === nextProps.stationId &&
      previousProps.miniSudokuPuzzle === nextProps.miniSudokuPuzzle &&
      previousProps.miniSudokuAttemptsLeft === nextProps.miniSudokuAttemptsLeft &&
      previousProps.miniSudokuResult === nextProps.miniSudokuResult &&
      previousProps.isActionDisabled === nextProps.isActionDisabled &&
      previousProps.isSubmittingMiniSudoku === nextProps.isSubmittingMiniSudoku &&
      areEqualStringArrays(previousProps.normalizedMiniSudokuValues, nextProps.normalizedMiniSudokuValues) &&
      areEqualNumberArrays(previousProps.conflictCellIndexes, nextProps.conflictCellIndexes)
    );
  },
);

type MiniSudokuMediaSectionProps = MiniSudokuStationPanelProps & {
  isTabletOverlay: boolean;
  quizSubmitError: string | null;
};

export function MiniSudokuMediaSection({
  isTabletOverlay,
  quizSubmitError,
  ...panelProps
}: MiniSudokuMediaSectionProps) {
  const adaptiveLayout = useAdaptiveLayout();

  return (
    <View className="flex-1 px-2 py-2">
      <View className="rounded-2xl">
        <View
          style={{
            paddingHorizontal: adaptiveLayout.s(12, 10, 16),
            paddingBottom: adaptiveLayout.s(12, 10, 16),
          }}
        >
          <MiniSudokuStationPanel {...panelProps} />
        </View>
      </View>
      {quizSubmitError ? (
        <Text
          className="mt-2 text-center"
          style={{ color: EXPEDITION_THEME.danger, fontSize: adaptiveLayout.fs(isTabletOverlay ? 14 : 12, 11, 17) }}
        >
          {quizSubmitError}
        </Text>
      ) : null}
    </View>
  );
}
