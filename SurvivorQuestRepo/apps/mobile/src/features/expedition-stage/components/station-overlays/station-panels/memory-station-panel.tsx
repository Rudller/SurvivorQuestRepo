import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, Text, View, type DimensionValue } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import type { MemoryCard } from "../puzzle-helpers";
import { StationQuizTaskWrapper, useStationPanelLayout } from "./shared-ui";

type MemoryStationPanelProps = {
  memoryDeck: MemoryCard[];
  memoryMatchedCount: number;
  memoryBusy: boolean;
  isInteractiveLocked: boolean;
  onPressCard: (cardId: string) => void;
};

type MemoryStationText = {
  pairs: string;
};

const MEMORY_STATION_TEXT_ENGLISH: MemoryStationText = {
  pairs: "Pairs",
};

const MEMORY_STATION_TEXT: Record<UiLanguage, MemoryStationText> = {
  polish: {
    pairs: "Pary",
  },
  english: MEMORY_STATION_TEXT_ENGLISH,
  ukrainian: {
    pairs: "Пари",
  },
  russian: {
    pairs: "Пары",
  },
};

type DotMetricProps = {
  label: string;
  value: number;
  max: number;
  fillColor: string;
};

function DotMetric({ label, value, max, fillColor }: DotMetricProps) {
  const layout = useStationPanelLayout();
  const activeCount = Math.max(0, Math.min(value, max));
  const dots = useMemo(
    () => Array.from({ length: Math.max(1, max) }, (_, index) => index < activeCount),
    [activeCount, max],
  );

  return (
    <View className="items-center justify-center">
      <Text
        className="text-center font-semibold"
        style={{
          color: EXPEDITION_THEME.textMuted,
          fontSize: layout.isTablet ? 16 : 14,
        }}
      >
        {label}: {activeCount}/{Math.max(1, max)}
      </Text>
      <View className="mt-2 flex-row flex-wrap items-center justify-center gap-2">
        {dots.map((isActive, index) => (
          <View
            key={`${label}-dot-${index}`}
            style={{
              width: layout.isTablet ? 14 : 12,
              height: layout.isTablet ? 14 : 12,
              borderRadius: 999,
              backgroundColor: isActive ? fillColor : "rgba(148, 163, 184, 0.25)",
            }}
          />
        ))}
      </View>
    </View>
  );
}

// Matches the flip timing used by wordle-station-panel.tsx's WordleRevealCell,
// for a consistent feel between the two reveal animations.
const MEMORY_FLIP_HALF_DURATION_MS = 120;

type MemoryCardButtonProps = {
  card: MemoryCard;
  disabled: boolean;
  width: DimensionValue;
  height: number;
  minHeight: number;
  fontSize: number;
  onPressCard: (cardId: string) => void;
};

const MemoryCardButton = memo(function MemoryCardButton({
  card,
  disabled,
  width,
  height,
  minHeight,
  fontSize,
  onPressCard,
}: MemoryCardButtonProps) {
  const handlePress = useCallback(() => {
    onPressCard(card.id);
  }, [card.id, onPressCard]);

  const isFaceUp = card.revealed || card.matched;
  const flipScaleAnimation = useRef(new Animated.Value(1)).current;
  const wasFaceUpRef = useRef(isFaceUp);
  const [showsSymbol, setShowsSymbol] = useState(isFaceUp);

  useEffect(() => {
    let symbolSwapTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!isFaceUp) {
      wasFaceUpRef.current = false;
      setShowsSymbol(false);
      flipScaleAnimation.stopAnimation();
      flipScaleAnimation.setValue(1);
      return () => {};
    }

    if (!wasFaceUpRef.current) {
      wasFaceUpRef.current = true;
      symbolSwapTimeout = setTimeout(() => {
        setShowsSymbol(true);
      }, MEMORY_FLIP_HALF_DURATION_MS);
      Animated.sequence([
        Animated.timing(flipScaleAnimation, {
          toValue: 0,
          duration: MEMORY_FLIP_HALF_DURATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(flipScaleAnimation, {
          toValue: 1,
          duration: MEMORY_FLIP_HALF_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setShowsSymbol(true);
    }

    return () => {
      if (symbolSwapTimeout) {
        clearTimeout(symbolSwapTimeout);
      }
    };
  }, [flipScaleAnimation, isFaceUp]);

  return (
    <Pressable
      className="items-center justify-center rounded-lg border active:opacity-90"
      style={{
        width,
        height,
        minHeight,
        borderColor: card.matched ? "rgba(52, 211, 153, 0.8)" : EXPEDITION_THEME.border,
        backgroundColor: card.matched
          ? "rgba(34, 197, 94, 0.2)"
          : card.revealed
            ? "rgba(59, 130, 246, 0.2)"
            : EXPEDITION_THEME.panelStrong,
        opacity: disabled ? 0.85 : 1,
      }}
      onPress={handlePress}
      disabled={disabled || card.matched || card.revealed}
      hitSlop={6}
    >
      <Animated.View style={{ transform: [{ scaleY: flipScaleAnimation }] }}>
        <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize }}>
          {showsSymbol ? card.symbol : "?"}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

export function MemoryStationPanel({
  memoryDeck,
  memoryMatchedCount,
  memoryBusy,
  isInteractiveLocked,
  onPressCard,
}: MemoryStationPanelProps) {
  const layout = useStationPanelLayout();
  const adaptiveLayout = useAdaptiveLayout();
  const [gridAreaWidth, setGridAreaWidth] = useState(0);
  const [gridAreaHeight, setGridAreaHeight] = useState(0);
  const memoryGridColumns = 6;
  const memoryGridRows = Math.max(1, Math.ceil(memoryDeck.length / memoryGridColumns));
  const memoryGridGap = adaptiveLayout.s(layout.isTablet ? 10 : 2, 6, 14);
  const defaultCellSize = layout.isTablet ? 110 : 44;
  // The grid-area wrapper below is flex-1 inside a flex-1 chain that fills
  // the height-bounded media box (StationQuizTaskWrapper's fillHeight, see
  // MemoryMediaSection), so its measured size is the real space left over
  // after the prompt above it — sizing cells off both the column count
  // (width) and row count (height) keeps the grid fitted to the container
  // instead of overflowing and being clipped by overflow:hidden.
  const widthBasedCellSize =
    gridAreaWidth > 0 ? (gridAreaWidth - memoryGridGap * (memoryGridColumns - 1)) / memoryGridColumns : null;
  const heightBasedCellSize =
    gridAreaHeight > 0 ? (gridAreaHeight - memoryGridGap * (memoryGridRows - 1)) / memoryGridRows : null;
  const cellSize = Math.max(
    12,
    Math.floor(
      widthBasedCellSize && heightBasedCellSize
        ? Math.min(widthBasedCellSize, heightBasedCellSize)
        : widthBasedCellSize ?? heightBasedCellSize ?? defaultCellSize,
    ),
  );
  const cardFontSize = layout.isTablet ? 36 : 13;
  const areCardsDisabled = isInteractiveLocked || memoryBusy;

  return (
    <View className="flex-1">
      <View
        className="flex-1 items-center justify-center"
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          const nextWidth = Math.round(width);
          const nextHeight = Math.round(height);
          setGridAreaWidth((currentWidth) => (Math.abs(currentWidth - nextWidth) < 0.5 ? currentWidth : nextWidth));
          setGridAreaHeight((currentHeight) =>
            Math.abs(currentHeight - nextHeight) < 0.5 ? currentHeight : nextHeight,
          );
        }}
      >
        <View
          className="flex-row flex-wrap justify-center"
          style={{
            width: cellSize * memoryGridColumns + memoryGridGap * (memoryGridColumns - 1),
            columnGap: memoryGridGap,
            rowGap: memoryGridGap,
          }}
        >
          {memoryDeck.map((card) => (
            <MemoryCardButton
              key={card.id}
              card={card}
              disabled={areCardsDisabled}
              width={cellSize}
              height={cellSize}
              minHeight={cellSize}
              fontSize={cardFontSize}
              onPressCard={onPressCard}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

type MemoryMediaSectionProps = {
  prompt: string;
  memoryDeck: MemoryCard[];
  memoryMatchedCount: number;
  memoryBusy: boolean;
  isInteractiveLocked: boolean;
  isTabletOverlay: boolean;
  quizSubmitError: string | null;
  onPressCard: (cardId: string) => void;
};

export function MemoryMediaSection({
  prompt,
  memoryDeck,
  memoryMatchedCount,
  memoryBusy,
  isInteractiveLocked,
  isTabletOverlay,
  quizSubmitError,
  onPressCard,
}: MemoryMediaSectionProps) {
  return (
    <View className="flex-1 px-2 py-2">
      <StationQuizTaskWrapper
        prompt={prompt}
        hidePrompt
        isTabletOverlay={isTabletOverlay}
        showBorder={false}
        error={quizSubmitError}
        errorPlacement="outside"
        className="flex-1"
        fillHeight
      >
        <MemoryStationPanel
          memoryDeck={memoryDeck}
          memoryMatchedCount={memoryMatchedCount}
          memoryBusy={memoryBusy}
          isInteractiveLocked={isInteractiveLocked}
          onPressCard={onPressCard}
        />
      </StationQuizTaskWrapper>
    </View>
  );
}

type MemoryPairsRowProps = {
  memoryDeck: MemoryCard[];
  memoryMatchedCount: number;
};

// Rendered outside the media-panel box (preview.tsx), below it.
export function MemoryPairsRow({ memoryDeck, memoryMatchedCount }: MemoryPairsRowProps) {
  const uiLanguage = useUiLanguage();
  const text = MEMORY_STATION_TEXT[uiLanguage];
  const totalPairs = memoryDeck.length / 2;
  const matchedPairs = memoryMatchedCount / 2;

  return <DotMetric label={text.pairs} value={matchedPairs} max={totalPairs} fillColor="#34d399" />;
}
