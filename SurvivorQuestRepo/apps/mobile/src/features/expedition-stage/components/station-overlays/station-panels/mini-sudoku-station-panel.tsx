import { memo, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import type { ChallengeDifficulty } from "../puzzle-helpers";
import {
  resolveActionLabelColor,
  useStationPanelLayout,
} from "./shared-ui";

type MiniSudokuPuzzle = {
  given: (string | null)[];
  solution: string[];
};

type MiniSudokuStationText = {
  checkLayout: string;
  chooseDifficulty: string;
  easy: string;
  medium: string;
  hard: string;
};

const MINI_SUDOKU_STATION_TEXT_ENGLISH: MiniSudokuStationText = {
  checkLayout: "Check layout",
  chooseDifficulty: "Choose difficulty",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const MINI_SUDOKU_STATION_TEXT: Record<UiLanguage, MiniSudokuStationText> = {
  polish: {
    checkLayout: "Sprawdź układ",
    chooseDifficulty: "Wybierz poziom trudności",
    easy: "Łatwy",
    medium: "Średni",
    hard: "Trudny",
  },
  english: MINI_SUDOKU_STATION_TEXT_ENGLISH,
  ukrainian: {
    checkLayout: "Перевірити розкладку",
    chooseDifficulty: "Оберіть складність",
    easy: "Легко",
    medium: "Середньо",
    hard: "Складно",
  },
  russian: {
    checkLayout: "Проверить расклад",
    chooseDifficulty: "Выберите сложность",
    easy: "Легко",
    medium: "Средне",
    hard: "Сложно",
  },
};

const SUDOKU_KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
] as const;

function resolveEditableIndexes(miniSudokuPuzzle: MiniSudokuPuzzle | null) {
  return (miniSudokuPuzzle?.given ?? [])
    .map((value, index) => (value === null ? index : -1))
    .filter((index) => index >= 0);
}

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

type MiniSudokuGridProps = {
  stationId: string;
  miniSudokuPuzzle: MiniSudokuPuzzle | null;
  normalizedMiniSudokuValues: string[];
  conflictCellIndexes: number[];
  isActionDisabled: boolean;
  activeCellIndex: number | null;
  onSelectCell: (index: number) => void;
};

type MiniSudokuGridInnerProps = MiniSudokuGridProps & {
  // Pixels, measured by the flexible wrapper (MiniSudokuMediaSection) from
  // whatever space is actually available — lets the board shrink to leave
  // room for the station description instead of claiming a fixed height.
  boardSize: number;
};

function MiniSudokuGridComponent({
  stationId,
  miniSudokuPuzzle,
  normalizedMiniSudokuValues,
  conflictCellIndexes,
  isActionDisabled,
  activeCellIndex,
  onSelectCell,
  boardSize,
}: MiniSudokuGridInnerProps) {
  const layout = useStationPanelLayout();
  const side = Math.max(2, Math.round(Math.sqrt(miniSudokuPuzzle?.given.length ?? 81)));
  const blockSide = Math.max(1, Math.round(Math.sqrt(side)));
  const cellPercent = `${100 / side}%` as `${number}%`;
  const boardLineStrong = layout.isTablet ? 3 : 2;
  const boardLineThin = 1;
  const cellSize = boardSize / side;
  const valueFontSize = Math.round(cellSize * (layout.isTablet ? 0.42 : 0.46));
  const conflictCellIndexSet = useMemo(() => new Set(conflictCellIndexes), [conflictCellIndexes]);

  if (boardSize <= 0) {
    return null;
  }

  return (
    <View style={{ width: boardSize, height: boardSize }}>
      <View
        style={{
          width: "100%",
          height: "100%",
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
              onSelectCell={onSelectCell}
            />
          );
        })}
      </View>
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

const MiniSudokuGrid = memo(MiniSudokuGridComponent, (previousProps, nextProps) => {
  return (
    previousProps.stationId === nextProps.stationId &&
    previousProps.miniSudokuPuzzle === nextProps.miniSudokuPuzzle &&
    previousProps.isActionDisabled === nextProps.isActionDisabled &&
    previousProps.activeCellIndex === nextProps.activeCellIndex &&
    previousProps.boardSize === nextProps.boardSize &&
    areEqualStringArrays(previousProps.normalizedMiniSudokuValues, nextProps.normalizedMiniSudokuValues) &&
    areEqualNumberArrays(previousProps.conflictCellIndexes, nextProps.conflictCellIndexes)
  );
});

// Fraction of the measured container kept for the board itself, leaving a
// small margin so the board's border never touches the container's edges.
const BOARD_SIZE_FRACTION = 0.96;

export function MiniSudokuMediaSection({
  stationId,
  miniSudokuPuzzle,
  normalizedMiniSudokuValues,
  conflictCellIndexes,
  isActionDisabled,
  activeCellIndex,
  onSelectCell,
}: MiniSudokuGridProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const boardSize = Math.floor(Math.min(containerSize.width, containerSize.height) * BOARD_SIZE_FRACTION);

  return (
    <View
      className="flex-1 items-center justify-center px-2 py-2"
      style={{ paddingHorizontal: adaptiveLayout.s(12, 10, 16) }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerSize((current) =>
          Math.abs(current.width - width) > 1 || Math.abs(current.height - height) > 1
            ? { width, height }
            : current,
        );
      }}
    >
      <MiniSudokuGrid
        stationId={stationId}
        miniSudokuPuzzle={miniSudokuPuzzle}
        normalizedMiniSudokuValues={normalizedMiniSudokuValues}
        conflictCellIndexes={conflictCellIndexes}
        isActionDisabled={isActionDisabled}
        activeCellIndex={activeCellIndex}
        onSelectCell={onSelectCell}
        boardSize={boardSize}
      />
    </View>
  );
}

type MiniSudokuKeypadSectionProps = {
  stationId: string;
  miniSudokuPuzzle: MiniSudokuPuzzle | null;
  activeCellIndex: number | null;
  onSelectCell: (index: number) => void;
  isActionDisabled: boolean;
  isSubmittingMiniSudoku: boolean;
  onChangeCell: (index: number, nextValue: string) => void;
  onSubmit: () => void;
  quizSubmitError: string | null;
  miniSudokuDifficultyMode: "admin" | "player";
  selectedMiniSudokuDifficulty: ChallengeDifficulty | null;
  onSelectDifficulty: (difficulty: ChallengeDifficulty) => void;
};

export function MiniSudokuKeypadSection({
  stationId,
  miniSudokuPuzzle,
  activeCellIndex,
  onSelectCell,
  isActionDisabled,
  isSubmittingMiniSudoku,
  onChangeCell,
  onSubmit,
  quizSubmitError,
  miniSudokuDifficultyMode,
  selectedMiniSudokuDifficulty,
  onSelectDifficulty,
}: MiniSudokuKeypadSectionProps) {
  const uiLanguage = useUiLanguage();
  const text = MINI_SUDOKU_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const adaptiveLayout = useAdaptiveLayout();
  const actionLabelColor = resolveActionLabelColor(isActionDisabled);
  // Reserve empty space below the keyboard so it never renders under the
  // absolutely-positioned timer/points footer (preview.tsx) — mirrors
  // code-station-panel.tsx's numeric pinpad, which this keypad matches.
  const footerClearance = adaptiveLayout.s(layout.isTablet ? 100 : 72, 60, 132);
  const keyboardGap = layout.isTablet ? 6 : 2;

  const editableIndexes = useMemo(() => resolveEditableIndexes(miniSudokuPuzzle), [miniSudokuPuzzle]);
  const firstEditableIndex = editableIndexes[0] ?? null;
  const canUsePinpad = !isActionDisabled && firstEditableIndex !== null;
  const targetIndex = activeCellIndex ?? firstEditableIndex;

  if (miniSudokuDifficultyMode === "player" && !selectedMiniSudokuDifficulty) {
    const difficultyOptions: ChallengeDifficulty[] = ["easy", "medium", "hard"];
    return (
      <View
        className="mt-2 gap-2 rounded-2xl border px-3 py-2"
        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted, marginBottom: footerClearance }}
      >
        <Text
          className="text-center font-semibold"
          style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.actionFontSize }}
        >
          {text.chooseDifficulty}
        </Text>
        {difficultyOptions.map((difficulty) => (
          <Pressable
            key={`${stationId}-sudoku-difficulty-${difficulty}`}
            className="rounded-2xl border px-4 py-3 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
            onPress={() => onSelectDifficulty(difficulty)}
          >
            <Text className="font-bold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.actionFontSize }}>
              {difficulty === "easy" ? text.easy : difficulty === "hard" ? text.hard : text.medium}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View
      className="mt-2 rounded-2xl border px-3 py-2"
      style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted, marginBottom: footerClearance }}
    >
      <View className="mx-auto mt-1 w-full max-w-[320px]" style={{ rowGap: layout.isTablet ? 8 : 6 }}>
        {SUDOKU_KEYPAD_ROWS.map((row, rowIndex) => (
          <View
            key={`${stationId}-sudoku-keypad-row-${rowIndex}`}
            className="flex-row justify-between"
            style={{ columnGap: keyboardGap }}
          >
            {row.map((key) => {
              const isDisabled = !canUsePinpad || targetIndex === null;

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
                    if (targetIndex === null) return;

                    onChangeCell(targetIndex, key);
                    const nextIndex =
                      editableIndexes.find((index) => index > targetIndex) ??
                      editableIndexes[0] ??
                      targetIndex;
                    onSelectCell(nextIndex);
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{
                      color: EXPEDITION_THEME.textPrimary,
                      textAlign: "center",
                      fontVariant: ["tabular-nums"],
                      fontSize: layout.pinpadDigitFontSize,
                    }}
                  >
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
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
      {/*
        Fixed minHeight regardless of whether the error is shown, so a
        submit failure doesn't change this box's height and reflow the
        board above it (see the flex-1 chain in preview.tsx).
      */}
      <View className="mt-2" style={{ minHeight: Math.round(layout.resultFontSize * 1.5) }}>
        {quizSubmitError ? (
          <Text
            className="text-center"
            style={{
              color: EXPEDITION_THEME.danger,
              fontSize: adaptiveLayout.fs(layout.isTablet ? 14 : 12, 11, 17),
            }}
          >
            {quizSubmitError}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
