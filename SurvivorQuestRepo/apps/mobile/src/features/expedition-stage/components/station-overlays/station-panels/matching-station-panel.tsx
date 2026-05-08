import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Text, View, type GestureResponderEvent } from "react-native";
import Svg, { Line } from "react-native-svg";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { MEMORY_MAX_MISTAKES } from "../puzzle-helpers";
import { AttemptsIndicator, useStationPanelLayout, withAlpha } from "./shared-ui";

type MatchingStationPanelProps = {
  matchingAttemptsLeft: number;
  matchingLeftOptions: string[];
  matchingRightOptions: string[];
  matchingConnections: Record<string, string>;
  matchingResult: string | null;
  isInteractiveLocked: boolean;
  onConnect: (left: string, right: string) => void;
};

type MatchingStationText = {
  instruction: string;
  connectHint: string;
  attemptsLeft: string;
};

type DotPointLeft = {
  left: string;
  index: number;
  x: number;
  y: number;
};

type DotPointRight = {
  right: string;
  index: number;
  x: number;
  y: number;
};

type ActiveDragState = {
  left: string;
  leftIndex: number;
  x: number;
  y: number;
};

type ActiveDragMeta = {
  left: string;
  leftIndex: number;
};

const MATCHING_STATION_TEXT_ENGLISH: MatchingStationText = {
  instruction: "Drag a line from each item on the left to the matching item on the right.",
  connectHint: "Each item can be connected only once.",
  attemptsLeft: "Attempts left",
};

const MATCHING_STATION_TEXT: Record<UiLanguage, MatchingStationText> = {
  polish: {
    instruction: "Przeciągnij linię od każdego wyrazu po lewej do pasującego wyrazu po prawej.",
    connectHint: "Każdy wyraz można połączyć tylko raz.",
    attemptsLeft: "Pozostało prób",
  },
  english: MATCHING_STATION_TEXT_ENGLISH,
  ukrainian: {
    instruction: "Проведіть лінію від кожного слова зліва до відповідного слова справа.",
    connectHint: "Кожне слово можна зʼєднати лише один раз.",
    attemptsLeft: "Залишилось спроб",
  },
  russian: {
    instruction: "Проведите линию от каждого слова слева к подходящему слову справа.",
    connectHint: "Каждое слово можно соединить только один раз.",
    attemptsLeft: "Осталось попыток",
  },
};

const CONNECT_HIT_RADIUS_FACTOR = 3.2;
const DROP_HIT_RADIUS_FACTOR = 2.6;
const SNAP_RADIUS_BOOST_FACTOR = 1.35;
const SNAP_PULL_STRENGTH = 0.78;
const DRAG_SMOOTHING_FREE = 0.9;
const DRAG_SMOOTHING_SNAP = 0.68;
const MIN_DRAG_DELTA = 0.08;

const AnimatedLine = Animated.createAnimatedComponent(Line);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(x1: number, y1: number, x2: number, y2: number) {
  const deltaX = x1 - x2;
  const deltaY = y1 - y2;
  return deltaX * deltaX + deltaY * deltaY;
}

export function MatchingStationPanel({
  matchingAttemptsLeft,
  matchingLeftOptions,
  matchingRightOptions,
  matchingConnections,
  matchingResult,
  isInteractiveLocked,
  onConnect,
}: MatchingStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = MATCHING_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const adaptiveLayout = useAdaptiveLayout();
  const boardContainerRef = useRef<View | null>(null);
  const boardFrameRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const activeSnapRightRef = useRef<DotPointRight | null>(null);
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const [activeDragMeta, setActiveDragMeta] = useState<ActiveDragMeta | null>(null);
  const activeDragRef = useRef<ActiveDragState | null>(null);
  const canInteract = !isInteractiveLocked && matchingAttemptsLeft > 0;
  const rowCount = Math.max(matchingLeftOptions.length, matchingRightOptions.length, 1);
  const verticalPadding = adaptiveLayout.s(layout.isTablet ? 14 : 10, 8, 18);
  const rowHeight = adaptiveLayout.s(layout.isTablet ? 82 : 68, 56, 96);
  const rowGap = adaptiveLayout.s(layout.isTablet ? 14 : 10, 8, 18);
  const leftDotRadius = adaptiveLayout.s(layout.isTablet ? 15 : 13, 10, 20);
  const rightDotRadius = adaptiveLayout.s(layout.isTablet ? 12 : 10, 8, 16);
  const hardSnapRadius = Math.max(rightDotRadius * 1.5, adaptiveLayout.s(18, 14, 28));
  const dotBorderWidth = adaptiveLayout.s(2, 1.5, 3);
  const panelHeight =
    verticalPadding * 2 + rowCount * rowHeight + Math.max(0, rowCount - 1) * rowGap;
  const maxPanelWidth = adaptiveLayout.s(layout.isTablet ? 760 : 520, 360, 860);
  const estimatedHorizontalInset = adaptiveLayout.s(layout.isTablet ? 120 : 84, 52, 160);
  const panelWidth = clamp(
    adaptiveLayout.width - estimatedHorizontalInset,
    adaptiveLayout.s(320, 280, 420),
    maxPanelWidth,
  );
  const horizontalPadding = adaptiveLayout.s(layout.isTablet ? 12 : 6, 4, 18);
  const minimumCenterLane = adaptiveLayout.s(layout.isTablet ? 132 : 94, 84, 180);
  const maxCardWidth = Math.max(
    adaptiveLayout.s(90, 82, 112),
    (panelWidth - horizontalPadding * 2 - minimumCenterLane) / 2,
  );
  const preferredCardWidth = panelWidth * (layout.isTablet ? 0.33 : 0.36);
  const cardWidth = clamp(
    preferredCardWidth,
    adaptiveLayout.s(90, 82, 112),
    maxCardWidth,
  );
  const leftDotInset = adaptiveLayout.s(layout.isTablet ? 24 : 18, 12, 32);
  const rightDotInset = adaptiveLayout.s(layout.isTablet ? 19 : 14, 10, 28);
  const rightCardLeft = panelWidth - horizontalPadding - cardWidth;
  let leftDotX = horizontalPadding + cardWidth + leftDotInset;
  let rightDotX = rightCardLeft - rightDotInset;
  const minimumLineLane = adaptiveLayout.s(layout.isTablet ? 92 : 68, 58, 130);
  if (rightDotX - leftDotX < minimumLineLane) {
    const centerX = panelWidth / 2;
    leftDotX = centerX - minimumLineLane / 2;
    rightDotX = centerX + minimumLineLane / 2;
  }

  const rowCenterY = (index: number) =>
    verticalPadding + index * (rowHeight + rowGap) + rowHeight / 2;

  const rightConnectedSet = useMemo(
    () => new Set(Object.values(matchingConnections)),
    [matchingConnections],
  );

  const leftDots = useMemo<DotPointLeft[]>(
    () =>
      matchingLeftOptions.map((left, index) => ({
        left,
        index,
        x: leftDotX,
        y: rowCenterY(index),
      })),
    [leftDotX, matchingLeftOptions, rowHeight, rowGap, verticalPadding],
  );

  const rightDots = useMemo<DotPointRight[]>(
    () =>
      matchingRightOptions.map((right, index) => ({
        right,
        index,
        x: rightDotX,
        y: rowCenterY(index),
      })),
    [matchingRightOptions, rightDotX, rowHeight, rowGap, verticalPadding],
  );

  const findLeftDotHit = (x: number, y: number): DotPointLeft | null => {
    const hitRadius = Math.max(
      leftDotRadius * CONNECT_HIT_RADIUS_FACTOR,
      adaptiveLayout.s(40, 32, 54),
    );
    const hitRadiusSquared = hitRadius * hitRadius;
    let bestMatch: DotPointLeft | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    leftDots.forEach((dot) => {
      if (matchingConnections[dot.left]) {
        return;
      }

      const currentDistance = distanceSquared(x, y, dot.x, dot.y);
      if (currentDistance <= hitRadiusSquared && currentDistance < bestDistance) {
        bestMatch = dot;
        bestDistance = currentDistance;
      }
    });

    return bestMatch;
  };

  const findRightDropTarget = (x: number, y: number): DotPointRight | null => {
    const dropRadius = Math.max(
      rightDotRadius * DROP_HIT_RADIUS_FACTOR,
      adaptiveLayout.s(30, 24, 42),
    );
    const dropRadiusSquared = dropRadius * dropRadius;
    let bestMatch: DotPointRight | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    rightDots.forEach((dot) => {
      if (rightConnectedSet.has(dot.right)) {
        return;
      }

      const currentDistance = distanceSquared(x, y, dot.x, dot.y);
      if (currentDistance <= dropRadiusSquared && currentDistance < bestDistance) {
        bestMatch = dot;
        bestDistance = currentDistance;
      }
    });

    return bestMatch;
  };

  const findRightSnapTarget = (x: number, y: number): DotPointRight | null => {
    const snapRadius = Math.max(
      rightDotRadius * DROP_HIT_RADIUS_FACTOR * SNAP_RADIUS_BOOST_FACTOR,
      adaptiveLayout.s(44, 36, 64),
    );
    const snapRadiusSquared = snapRadius * snapRadius;
    let bestMatch: DotPointRight | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const dot of rightDots) {
      if (rightConnectedSet.has(dot.right)) {
        continue;
      }

      const currentDistance = distanceSquared(x, y, dot.x, dot.y);
      if (currentDistance <= snapRadiusSquared && currentDistance < bestDistance) {
        bestMatch = dot;
        bestDistance = currentDistance;
      }
    }

    return bestMatch;
  };

  const updateBoardFrame = useCallback(() => {
    if (!boardContainerRef.current) {
      return;
    }

    boardContainerRef.current.measureInWindow((x, y, width, height) => {
      boardFrameRef.current = { x, y, width, height };
    });
  }, []);

  const toBoardLocalPoint = useCallback(
    (event: GestureResponderEvent) => {
      const frame = boardFrameRef.current;
      if (!frame) {
        return {
          x: clamp(event.nativeEvent.locationX, 0, panelWidth),
          y: clamp(event.nativeEvent.locationY, 0, panelHeight),
        };
      }

      return {
        x: clamp(event.nativeEvent.pageX - frame.x, 0, panelWidth),
        y: clamp(event.nativeEvent.pageY - frame.y, 0, panelHeight),
      };
    },
    [panelHeight, panelWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canInteract,
        onPanResponderGrant: (event) => {
          if (!canInteract) {
            activeDragRef.current = null;
            activeSnapRightRef.current = null;
            setActiveDragMeta(null);
            return;
          }

          updateBoardFrame();
          const startPoint = toBoardLocalPoint(event);
          const matchedDot = findLeftDotHit(startPoint.x, startPoint.y);
          if (!matchedDot) {
            activeDragRef.current = null;
            activeSnapRightRef.current = null;
            setActiveDragMeta(null);
            return;
          }

          const nextActiveDrag: ActiveDragState = {
            left: matchedDot.left,
            leftIndex: matchedDot.index,
            x: matchedDot.x,
            y: matchedDot.y,
          };
          activeDragRef.current = nextActiveDrag;
          dragX.setValue(nextActiveDrag.x);
          dragY.setValue(nextActiveDrag.y);
          setActiveDragMeta({ left: nextActiveDrag.left, leftIndex: nextActiveDrag.leftIndex });
        },
        onMoveShouldSetPanResponder: () => activeDragRef.current !== null,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (event) => {
          if (!activeDragRef.current) {
            return;
          }

          const movePoint = toBoardLocalPoint(event);
          const snapTarget = findRightSnapTarget(movePoint.x, movePoint.y);
          activeSnapRightRef.current = snapTarget;

          let targetX = movePoint.x;
          let targetY = movePoint.y;
          if (snapTarget) {
            const hardSnapDistanceSquared = hardSnapRadius * hardSnapRadius;
            const distanceToSnapSquared = distanceSquared(
              movePoint.x,
              movePoint.y,
              snapTarget.x,
              snapTarget.y,
            );
            if (distanceToSnapSquared <= hardSnapDistanceSquared) {
              targetX = snapTarget.x;
              targetY = snapTarget.y;
            } else {
              targetX = movePoint.x + (snapTarget.x - movePoint.x) * SNAP_PULL_STRENGTH;
              targetY = movePoint.y + (snapTarget.y - movePoint.y) * SNAP_PULL_STRENGTH;
            }
          }

          const previousDrag = activeDragRef.current;
          const smoothingFactor = snapTarget
            ? DRAG_SMOOTHING_SNAP
            : DRAG_SMOOTHING_FREE;
          const smoothedX = previousDrag.x + (targetX - previousDrag.x) * smoothingFactor;
          const smoothedY = previousDrag.y + (targetY - previousDrag.y) * smoothingFactor;
          if (
            Math.abs(smoothedX - previousDrag.x) < MIN_DRAG_DELTA &&
            Math.abs(smoothedY - previousDrag.y) < MIN_DRAG_DELTA
          ) {
            return;
          }

          const nextActiveDrag: ActiveDragState = {
            ...previousDrag,
            x: smoothedX,
            y: smoothedY,
          };
          activeDragRef.current = nextActiveDrag;
          dragX.setValue(nextActiveDrag.x);
          dragY.setValue(nextActiveDrag.y);
        },
        onPanResponderRelease: (event) => {
          const currentDrag = activeDragRef.current;
          const snapRight = activeSnapRightRef.current;
          activeDragRef.current = null;
          activeSnapRightRef.current = null;
          setActiveDragMeta(null);

          if (!currentDrag || !canInteract) {
            return;
          }

          const releasePoint = toBoardLocalPoint(event);
          const rightDrop =
            (snapRight && !rightConnectedSet.has(snapRight.right)
              ? snapRight
              : null) ??
            findRightDropTarget(currentDrag.x, currentDrag.y) ??
            findRightDropTarget(releasePoint.x, releasePoint.y);
          if (!rightDrop) {
            return;
          }

          onConnect(currentDrag.left, rightDrop.right);
        },
        onPanResponderTerminate: () => {
          activeDragRef.current = null;
          activeSnapRightRef.current = null;
          setActiveDragMeta(null);
        },
      }),
    [
      canInteract,
      rightConnectedSet,
      dragX,
      dragY,
      findLeftDotHit,
      findRightDropTarget,
      findRightSnapTarget,
      hardSnapRadius,
      onConnect,
      toBoardLocalPoint,
      updateBoardFrame,
    ],
  );

  const dragLineColor = withAlpha(EXPEDITION_THEME.accentStrong, 0.95);
  const solvedLineColor = withAlpha("#22c55e", 0.95);
  const dotNeutralBackground = withAlpha(EXPEDITION_THEME.panelStrong, 0.95);

  return (
    <View className="h-full w-full">
      <Text
        className="text-center"
        style={{
          color: EXPEDITION_THEME.textMuted,
          fontSize: adaptiveLayout.fs(layout.isTablet ? 16 : 14, 13, 20),
          lineHeight: adaptiveLayout.s(layout.isTablet ? 23 : 20, 18, 28),
        }}
      >
        {text.instruction}
      </Text>
      <Text
        className="mt-1 text-center"
        style={{
          color: EXPEDITION_THEME.textSubtle,
          fontSize: adaptiveLayout.fs(layout.isTablet ? 13 : 11, 10, 16),
        }}
      >
        {text.connectHint}
      </Text>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={matchingAttemptsLeft}
          maxAttempts={MEMORY_MAX_MISTAKES}
          align="center"
        />
      </View>

      <View
        className="mt-4 w-full self-center"
        style={{ minHeight: panelHeight }}
      >
        <View
          ref={boardContainerRef}
          style={{ width: panelWidth, height: panelHeight, position: "relative", alignSelf: "center" }}
          onLayout={() => {
            updateBoardFrame();
          }}
          {...panResponder.panHandlers}
        >
          <Svg
            width={panelWidth}
            height={panelHeight}
            style={{ position: "absolute", left: 0, top: 0 }}
            pointerEvents="none"
          >
            {leftDots.map((leftDot) => {
              const connectedRight = matchingConnections[leftDot.left];
              if (!connectedRight) {
                return null;
              }

              const rightDot = rightDots.find((dot) => dot.right === connectedRight);
              if (!rightDot) {
                return null;
              }

              return (
                <Line
                  key={`matching-line-${leftDot.left}`}
                  x1={leftDot.x}
                  y1={leftDot.y}
                  x2={rightDot.x}
                  y2={rightDot.y}
                  stroke={solvedLineColor}
                  strokeWidth={adaptiveLayout.s(layout.isTablet ? 5 : 4, 3, 7)}
                  strokeLinecap="round"
                />
              );
            })}
            {activeDragMeta ? (
              <AnimatedLine
                x1={leftDots[activeDragMeta.leftIndex]?.x ?? leftDotX}
                y1={leftDots[activeDragMeta.leftIndex]?.y ?? rowCenterY(activeDragMeta.leftIndex)}
                x2={dragX}
                y2={dragY}
                stroke={dragLineColor}
                strokeWidth={adaptiveLayout.s(layout.isTablet ? 4 : 3, 2.5, 6)}
                strokeLinecap="round"
              />
            ) : null}
          </Svg>

          {Array.from({ length: rowCount }).map((_, index) => {
            const leftLabel = matchingLeftOptions[index] ?? "—";
            const rightLabel = matchingRightOptions[index] ?? "—";
            const leftConnected = Boolean(leftLabel !== "—" && matchingConnections[leftLabel]);
            const rightConnected = rightLabel !== "—" && rightConnectedSet.has(rightLabel);
            const rowTop = verticalPadding + index * (rowHeight + rowGap);

            return (
              <View
                key={`matching-row-${index}`}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: rowTop,
                  height: rowHeight,
                }}
              >
                <View
                  className="absolute items-center justify-center rounded-2xl border px-3"
                  style={{
                    left: horizontalPadding,
                    width: cardWidth,
                    height: rowHeight,
                    borderColor: leftConnected
                      ? withAlpha("#22c55e", 0.85)
                      : withAlpha(EXPEDITION_THEME.border, 0.8),
                    backgroundColor: leftConnected
                      ? withAlpha("#14532d", 0.52)
                      : withAlpha(EXPEDITION_THEME.panelMuted, 0.82),
                  }}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{
                      color: EXPEDITION_THEME.textPrimary,
                      fontSize: adaptiveLayout.fs(layout.isTablet ? 19 : 15, 13, 24),
                    }}
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {leftLabel}
                  </Text>
                </View>

                <View
                  className="absolute items-center justify-center rounded-2xl border px-3"
                  style={{
                    left: rightCardLeft,
                    width: cardWidth,
                    height: rowHeight,
                    borderColor: rightConnected
                      ? withAlpha("#22c55e", 0.85)
                      : withAlpha(EXPEDITION_THEME.border, 0.8),
                    backgroundColor: rightConnected
                      ? withAlpha("#14532d", 0.52)
                      : withAlpha(EXPEDITION_THEME.panelMuted, 0.82),
                  }}
                >
                  <Text
                    className="text-center font-semibold"
                    style={{
                      color: EXPEDITION_THEME.textPrimary,
                      fontSize: adaptiveLayout.fs(layout.isTablet ? 19 : 15, 13, 24),
                    }}
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {rightLabel}
                  </Text>
                </View>
              </View>
            );
          })}

          {leftDots.map((dot) => {
            const leftConnected = Boolean(matchingConnections[dot.left]);
            const dotStrokeColor = leftConnected
              ? solvedLineColor
              : withAlpha(EXPEDITION_THEME.accentStrong, 0.88);

            return (
              <View
                key={`matching-left-dot-${dot.left}`}
                className="absolute items-center justify-center"
                style={{
                  left: dot.x - leftDotRadius * 1.45,
                  top: dot.y - leftDotRadius * 1.45,
                  width: leftDotRadius * 2.9,
                  height: leftDotRadius * 2.9,
                }}
              >
                <View
                  className="absolute rounded-full"
                  style={{
                    width: leftDotRadius * 2.9,
                    height: leftDotRadius * 2.9,
                    backgroundColor: withAlpha(dotStrokeColor, leftConnected ? 0.14 : 0.2),
                  }}
                />
                <View
                  className="items-center justify-center rounded-full border"
                  style={{
                    width: leftDotRadius * 2,
                    height: leftDotRadius * 2,
                    borderWidth: dotBorderWidth,
                    borderColor: dotStrokeColor,
                    backgroundColor: leftConnected
                      ? withAlpha("#22c55e", 0.2)
                      : dotNeutralBackground,
                  }}
                >
                  <View
                    className="rounded-full"
                    style={{
                      width: leftDotRadius * 0.72,
                      height: leftDotRadius * 0.72,
                      backgroundColor: dotStrokeColor,
                    }}
                  />
                </View>
              </View>
            );
          })}

          {rightDots.map((dot) => {
            const rightConnected = rightConnectedSet.has(dot.right);
            const dotStrokeColor = rightConnected
              ? solvedLineColor
              : withAlpha(EXPEDITION_THEME.accentStrong, 0.78);

            return (
              <View
                key={`matching-right-dot-${dot.right}-${dot.index}`}
                className="absolute items-center justify-center rounded-full border"
                style={{
                  left: dot.x - rightDotRadius,
                  top: dot.y - rightDotRadius,
                  width: rightDotRadius * 2,
                  height: rightDotRadius * 2,
                  borderWidth: dotBorderWidth,
                  borderColor: dotStrokeColor,
                  backgroundColor: rightConnected
                    ? withAlpha("#22c55e", 0.2)
                    : withAlpha(EXPEDITION_THEME.panelStrong, 0.95),
                }}
              >
                <View
                  className="rounded-full"
                  style={{
                    width: rightDotRadius * 0.7,
                    height: rightDotRadius * 0.7,
                    backgroundColor: dotStrokeColor,
                  }}
                />
              </View>
            );
          })}

        </View>
      </View>

      {matchingResult ? (
        <Text
          className="mt-2"
          style={{
            color: EXPEDITION_THEME.textMuted,
            fontSize: layout.resultFontSize,
          }}
        >
          {matchingResult}
        </Text>
      ) : null}
    </View>
  );
}

type MatchingMediaSectionProps = MatchingStationPanelProps & {
  matchingAttemptsLabel: string;
  matchingMatchedLabel: string;
  matchingMatchedCount: number;
  totalPairs: number;
};

export function MatchingMediaSection({
  matchingAttemptsLabel,
  matchingMatchedLabel,
  matchingMatchedCount,
  totalPairs,
  ...panelProps
}: MatchingMediaSectionProps) {
  return (
    <View className="flex-1 px-2 py-2">
      <View className="flex-1 justify-center">
        <MatchingStationPanel {...panelProps} />
      </View>

      <View className="w-full px-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {matchingAttemptsLabel}: {panelProps.matchingAttemptsLeft}
          </Text>
          <Text className="text-base font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {matchingMatchedLabel}: {matchingMatchedCount}/{totalPairs}
          </Text>
        </View>
      </View>
    </View>
  );
}
