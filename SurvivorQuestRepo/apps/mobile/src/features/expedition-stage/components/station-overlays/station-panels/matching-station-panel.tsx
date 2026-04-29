import { useCallback, useMemo, useRef } from "react";
import { Animated, Easing, PanResponder, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { MEMORY_MAX_MISTAKES } from "../puzzle-helpers";
import { AttemptsIndicator, useStationPanelLayout, withAlpha } from "./shared-ui";

type MatchingStationPanelProps = {
  matchingAttemptsLeft: number;
  matchingLeftOptions: string[];
  matchingLeftIndex: number;
  matchingRightOptions: string[];
  matchingRightIndex: number;
  matchingResult: string | null;
  isInteractiveLocked: boolean;
  onShiftLeft: (direction: 1 | -1) => void;
  onShiftRight: (direction: 1 | -1) => void;
};

const MATCHING_CARD_WIDTH = 158;
const MATCHING_CARD_HEIGHT = 136;
const MATCHING_CARD_GAP = 8;
const MATCHING_STACK_HEIGHT = MATCHING_CARD_HEIGHT * 3 + MATCHING_CARD_GAP * 2;
const SWIPE_THRESHOLD_PX = 16;
const SWIPE_DRAG_FACTOR = 0.36;
const SWIPE_MAX_DRAG = MATCHING_CARD_HEIGHT * 0.55;
const SWIPE_SHIFT_DISTANCE = MATCHING_CARD_HEIGHT + MATCHING_CARD_GAP;
const SWIPE_SHIFT_OUT_DURATION_MS = 130;
const SWIPE_SHIFT_IN_DURATION_MS = 180;
const SWIPE_SWAP_OFFSET_FACTOR = 0.42;

const MATCHING_SIDE_CARD_SCALE_X = 0.74;
const MATCHING_SIDE_CARD_PERSPECTIVE = 420;
const MATCHING_SIDE_CARD_ROTATION_DEG = 36;
const MATCHING_SIDE_CARD_OFFSET_Y = 8;
const MATCHING_SIDE_CARD_OPACITY = 0.52;

const SIDE_TOP_CARD_TRANSFORM = [
  { perspective: MATCHING_SIDE_CARD_PERSPECTIVE },
  { rotateX: `${MATCHING_SIDE_CARD_ROTATION_DEG}deg` },
  { scaleX: MATCHING_SIDE_CARD_SCALE_X },
  { translateY: -MATCHING_SIDE_CARD_OFFSET_Y },
] as const;

const SIDE_BOTTOM_CARD_TRANSFORM = [
  { perspective: MATCHING_SIDE_CARD_PERSPECTIVE },
  { rotateX: `-${MATCHING_SIDE_CARD_ROTATION_DEG}deg` },
  { scaleX: MATCHING_SIDE_CARD_SCALE_X },
  { translateY: MATCHING_SIDE_CARD_OFFSET_Y },
] as const;

type MatchingStationText = {
  instruction: string;
  attemptsLeft: string;
};

const MATCHING_STATION_TEXT_ENGLISH: MatchingStationText = {
  instruction: "Swipe the column up/down and align a pair on the center line.",
  attemptsLeft: "Attempts left",
};

const MATCHING_STATION_TEXT: Record<UiLanguage, MatchingStationText> = {
  polish: {
    instruction: "Przesuń palcem kolumnę w górę/dół i ustaw parę w linii środka.",
    attemptsLeft: "Pozostało prób",
  },
  english: MATCHING_STATION_TEXT_ENGLISH,
  ukrainian: {
    instruction: "Проведіть стовпець вгору/вниз і вирівняйте пару на центральній лінії.",
    attemptsLeft: "Залишилось спроб",
  },
  russian: {
    instruction: "Проведите столбец вверх/вниз и выровняйте пару по центральной линии.",
    attemptsLeft: "Осталось попыток",
  },
};

function normalizeCarouselIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }

  const normalized = index % length;
  return normalized >= 0 ? normalized : normalized + length;
}

function getCarouselItem(options: string[], selectedIndex: number, offset: -1 | 0 | 1) {
  if (options.length === 0) {
    return "—";
  }

  const normalizedSelected = normalizeCarouselIndex(selectedIndex, options.length);
  const normalizedOffset = normalizeCarouselIndex(normalizedSelected + offset, options.length);
  return options[normalizedOffset] ?? "—";
}

export function MatchingStationPanel({
  matchingAttemptsLeft,
  matchingLeftOptions,
  matchingLeftIndex,
  matchingRightOptions,
  matchingRightIndex,
  matchingResult,
  isInteractiveLocked,
  onShiftLeft,
  onShiftRight,
}: MatchingStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = MATCHING_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const canInteract = !isInteractiveLocked && matchingAttemptsLeft > 0;
  const leftTranslateY = useRef(new Animated.Value(0)).current;
  const rightTranslateY = useRef(new Animated.Value(0)).current;
  const leftIsAnimatingRef = useRef(false);
  const rightIsAnimatingRef = useRef(false);

  const leftPrev = getCarouselItem(matchingLeftOptions, matchingLeftIndex, -1);
  const leftCurrent = getCarouselItem(matchingLeftOptions, matchingLeftIndex, 0);
  const leftNext = getCarouselItem(matchingLeftOptions, matchingLeftIndex, 1);

  const rightPrev = getCarouselItem(matchingRightOptions, matchingRightIndex, -1);
  const rightCurrent = getCarouselItem(matchingRightOptions, matchingRightIndex, 0);
  const rightNext = getCarouselItem(matchingRightOptions, matchingRightIndex, 1);
  const centerLineColor = withAlpha(EXPEDITION_THEME.accentStrong, 0.45);
  const sideCardBorderColor = withAlpha(EXPEDITION_THEME.border, 0.68);
  const sideCardTopEdgeColor = withAlpha(EXPEDITION_THEME.accentStrong, 0.35);
  const sideCardBottomEdgeColor = withAlpha(EXPEDITION_THEME.textSubtle, 0.52);
  const sideCardBackgroundColor = withAlpha(EXPEDITION_THEME.panelMuted, 0.78);
  const centerCardBorderColor = withAlpha(EXPEDITION_THEME.accentStrong, 0.7);
  const centerCardBackgroundColor = withAlpha(EXPEDITION_THEME.panelStrong, 0.95);

  const settleColumn = useCallback((translateY: Animated.Value) => {
    Animated.spring(translateY, {
      toValue: 0,
      tension: 95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const animateShift = useCallback(
    (params: {
      translateY: Animated.Value;
      direction: 1 | -1;
      isAnimatingRef: { current: boolean };
      onShift: (direction: 1 | -1) => void;
    }) => {
      const { translateY, direction, isAnimatingRef, onShift } = params;
      if (!canInteract || isAnimatingRef.current) {
        return;
      }

      isAnimatingRef.current = true;
      const shiftOut = -direction * SWIPE_SHIFT_DISTANCE;

      Animated.timing(translateY, {
        toValue: shiftOut,
        duration: SWIPE_SHIFT_OUT_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          translateY.setValue(0);
          isAnimatingRef.current = false;
          return;
        }

        onShift(direction);
        translateY.setValue(-shiftOut * SWIPE_SWAP_OFFSET_FACTOR);

        Animated.timing(translateY, {
          toValue: 0,
          duration: SWIPE_SHIFT_IN_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          isAnimatingRef.current = false;
        });
      });
    },
    [canInteract],
  );

  const leftPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          canInteract &&
          matchingLeftOptions.length > 1 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 4,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          canInteract &&
          matchingLeftOptions.length > 1 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 8,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gestureState) => {
          if (!canInteract || leftIsAnimatingRef.current) {
            return;
          }
          const nextValue = Math.max(
            -SWIPE_MAX_DRAG,
            Math.min(SWIPE_MAX_DRAG, gestureState.dy * SWIPE_DRAG_FACTOR),
          );
          leftTranslateY.setValue(nextValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy <= -SWIPE_THRESHOLD_PX) {
            animateShift({
              translateY: leftTranslateY,
              direction: 1,
              isAnimatingRef: leftIsAnimatingRef,
              onShift: onShiftLeft,
            });
            return;
          }

          if (gestureState.dy >= SWIPE_THRESHOLD_PX) {
            animateShift({
              translateY: leftTranslateY,
              direction: -1,
              isAnimatingRef: leftIsAnimatingRef,
              onShift: onShiftLeft,
            });
            return;
          }

          settleColumn(leftTranslateY);
        },
        onPanResponderTerminate: () => {
          settleColumn(leftTranslateY);
        },
      }),
    [
      animateShift,
      canInteract,
      leftTranslateY,
      matchingLeftOptions.length,
      onShiftLeft,
      settleColumn,
    ],
  );

  const rightPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          canInteract &&
          matchingRightOptions.length > 1 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 4,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          canInteract &&
          matchingRightOptions.length > 1 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) &&
          Math.abs(gestureState.dy) > 8,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gestureState) => {
          if (!canInteract || rightIsAnimatingRef.current) {
            return;
          }
          const nextValue = Math.max(
            -SWIPE_MAX_DRAG,
            Math.min(SWIPE_MAX_DRAG, gestureState.dy * SWIPE_DRAG_FACTOR),
          );
          rightTranslateY.setValue(nextValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy <= -SWIPE_THRESHOLD_PX) {
            animateShift({
              translateY: rightTranslateY,
              direction: 1,
              isAnimatingRef: rightIsAnimatingRef,
              onShift: onShiftRight,
            });
            return;
          }

          if (gestureState.dy >= SWIPE_THRESHOLD_PX) {
            animateShift({
              translateY: rightTranslateY,
              direction: -1,
              isAnimatingRef: rightIsAnimatingRef,
              onShift: onShiftRight,
            });
            return;
          }

          settleColumn(rightTranslateY);
        },
        onPanResponderTerminate: () => {
          settleColumn(rightTranslateY);
        },
      }),
    [
      animateShift,
      canInteract,
      matchingRightOptions.length,
      onShiftRight,
      rightTranslateY,
      settleColumn,
    ],
  );

  return (
    <View className="h-full w-full justify-center">
      <Text className="text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.isTablet ? 16 : 14 }}>
        {text.instruction}
      </Text>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={matchingAttemptsLeft}
          maxAttempts={MEMORY_MAX_MISTAKES}
          align="center"
        />
      </View>

      <View className="mt-6 relative">
        <View
          className="absolute left-0 right-0"
          style={{
            top: Math.round(MATCHING_STACK_HEIGHT / 2),
            height: 2,
            backgroundColor: centerLineColor,
          }}
        />

        <View className="flex-row items-start gap-2">
          <View
            className="flex-1 overflow-hidden"
            style={{ height: MATCHING_STACK_HEIGHT }}
            {...leftPanResponder.panHandlers}
          >
            <Animated.View
              className="items-center gap-2"
              style={{ transform: [{ translateY: leftTranslateY }] }}
            >
              <View
                className="items-center justify-center rounded-xl border px-2"
                style={{
                  width: MATCHING_CARD_WIDTH,
                  height: MATCHING_CARD_HEIGHT,
                  borderColor: sideCardBorderColor,
                  borderTopColor: sideCardTopEdgeColor,
                  borderBottomColor: sideCardBottomEdgeColor,
                  backgroundColor: sideCardBackgroundColor,
                  opacity: MATCHING_SIDE_CARD_OPACITY,
                  overflow: "hidden",
                  transform: SIDE_TOP_CARD_TRANSFORM,
                }}
              >
                <Text
                  className="text-center font-semibold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 24 : 20 }}
                  maxFontSizeMultiplier={1.2}
                  minimumFontScale={0.9}
                  adjustsFontSizeToFit
                  numberOfLines={4}
                >
                  {leftPrev}
                </Text>
              </View>

              <View
                className="items-center justify-center rounded-xl border px-2"
                style={{
                  width: MATCHING_CARD_WIDTH,
                  height: MATCHING_CARD_HEIGHT,
                  borderColor: centerCardBorderColor,
                  backgroundColor: centerCardBackgroundColor,
                }}
              >
                <Text
                  className="text-center font-extrabold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 38 : 30 }}
                  maxFontSizeMultiplier={1.2}
                  minimumFontScale={0.9}
                  adjustsFontSizeToFit
                  numberOfLines={4}
                >
                  {leftCurrent}
                </Text>
              </View>

              <View
                className="items-center justify-center rounded-xl border px-2"
                style={{
                  width: MATCHING_CARD_WIDTH,
                  height: MATCHING_CARD_HEIGHT,
                  borderColor: sideCardBorderColor,
                  borderTopColor: sideCardBottomEdgeColor,
                  borderBottomColor: sideCardTopEdgeColor,
                  backgroundColor: sideCardBackgroundColor,
                  opacity: MATCHING_SIDE_CARD_OPACITY,
                  overflow: "hidden",
                  transform: SIDE_BOTTOM_CARD_TRANSFORM,
                }}
              >
                <Text
                  className="text-center font-semibold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 24 : 20 }}
                  maxFontSizeMultiplier={1.2}
                  minimumFontScale={0.9}
                  adjustsFontSizeToFit
                  numberOfLines={4}
                >
                  {leftNext}
                </Text>
              </View>
            </Animated.View>
          </View>

          <View
            className="w-7 items-center justify-center"
            style={{ height: MATCHING_STACK_HEIGHT }}
          >
            <Text
              className="text-3xl font-extrabold"
              style={{ color: EXPEDITION_THEME.textMuted, lineHeight: 38, includeFontPadding: false }}
            >
              ⇄
            </Text>
          </View>

          <View
            className="flex-1 overflow-hidden"
            style={{ height: MATCHING_STACK_HEIGHT }}
            {...rightPanResponder.panHandlers}
          >
            <Animated.View
              className="items-center gap-2"
              style={{ transform: [{ translateY: rightTranslateY }] }}
            >
              <View
                className="items-center justify-center rounded-xl border px-2"
                style={{
                  width: MATCHING_CARD_WIDTH,
                  height: MATCHING_CARD_HEIGHT,
                  borderColor: sideCardBorderColor,
                  borderTopColor: sideCardTopEdgeColor,
                  borderBottomColor: sideCardBottomEdgeColor,
                  backgroundColor: sideCardBackgroundColor,
                  opacity: MATCHING_SIDE_CARD_OPACITY,
                  overflow: "hidden",
                  transform: SIDE_TOP_CARD_TRANSFORM,
                }}
              >
                <Text
                  className="text-center font-semibold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 24 : 20 }}
                  maxFontSizeMultiplier={1.2}
                  minimumFontScale={0.9}
                  adjustsFontSizeToFit
                  numberOfLines={4}
                >
                  {rightPrev}
                </Text>
              </View>

              <View
                className="items-center justify-center rounded-xl border px-2"
                style={{
                  width: MATCHING_CARD_WIDTH,
                  height: MATCHING_CARD_HEIGHT,
                  borderColor: centerCardBorderColor,
                  backgroundColor: centerCardBackgroundColor,
                }}
              >
                <Text
                  className="text-center font-extrabold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 38 : 30 }}
                  maxFontSizeMultiplier={1.2}
                  minimumFontScale={0.9}
                  adjustsFontSizeToFit
                  numberOfLines={4}
                >
                  {rightCurrent}
                </Text>
              </View>

              <View
                className="items-center justify-center rounded-xl border px-2"
                style={{
                  width: MATCHING_CARD_WIDTH,
                  height: MATCHING_CARD_HEIGHT,
                  borderColor: sideCardBorderColor,
                  borderTopColor: sideCardBottomEdgeColor,
                  borderBottomColor: sideCardTopEdgeColor,
                  backgroundColor: sideCardBackgroundColor,
                  opacity: MATCHING_SIDE_CARD_OPACITY,
                  overflow: "hidden",
                  transform: SIDE_BOTTOM_CARD_TRANSFORM,
                }}
              >
                <Text
                  className="text-center font-semibold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 24 : 20 }}
                  maxFontSizeMultiplier={1.2}
                  minimumFontScale={0.9}
                  adjustsFontSizeToFit
                  numberOfLines={4}
                >
                  {rightNext}
                </Text>
              </View>
            </Animated.View>
          </View>
        </View>
      </View>

      {matchingResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {matchingResult}
        </Text>
      ) : null}
    </View>
  );
}
