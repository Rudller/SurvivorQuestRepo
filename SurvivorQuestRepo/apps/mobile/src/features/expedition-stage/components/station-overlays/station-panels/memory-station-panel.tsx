import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import type { MemoryCard } from "../puzzle-helpers";
import { StationQuizTaskWrapper, useStationPanelLayout } from "./shared-ui";

type MemoryStationPanelProps = {
  memoryDeck: MemoryCard[];
  memoryMatchedCount: number;
  memoryBusy: boolean;
  memoryResult: string | null;
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
  const dots = Array.from({ length: Math.max(1, max) }, (_, index) => index < activeCount);

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

export function MemoryStationPanel({
  memoryDeck,
  memoryMatchedCount,
  memoryBusy,
  memoryResult,
  isInteractiveLocked,
  onPressCard,
}: MemoryStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = MEMORY_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const adaptiveLayout = useAdaptiveLayout();
  const [memoryGridWidth, setMemoryGridWidth] = useState(0);
  const totalPairs = memoryDeck.length / 2;
  const matchedPairs = memoryMatchedCount / 2;
  const memoryGridColumns = layout.isTablet ? 6 : 4;
  const memoryGridGap = adaptiveLayout.s(layout.isTablet ? 10 : 7, 6, 14);
  const fallbackCardWidth = layout.isTablet ? "16%" : "24%";
  const baseCardHeight = adaptiveLayout.s(layout.isTablet ? 110 : 84, 76, 128);
  const computedCardWidth =
    memoryGridWidth > 0
      ? (memoryGridWidth - memoryGridGap * Math.max(0, memoryGridColumns - 1)) / memoryGridColumns
      : null;
  const resolvedCardWidth = computedCardWidth && computedCardWidth > 0 ? computedCardWidth : fallbackCardWidth;
  const resolvedCardHeight =
    computedCardWidth && computedCardWidth > 0
      ? Math.max(baseCardHeight, Math.round(computedCardWidth * (layout.isTablet ? 1.02 : 1.1)))
      : baseCardHeight;

  return (
    <View className="mt-3">
      <View className="items-center justify-center">
        <DotMetric
          label={text.pairs}
          value={matchedPairs}
          max={totalPairs}
          fillColor="#34d399"
        />
      </View>
      <View
        className="mt-3 w-full flex-row flex-wrap self-center"
        style={{ columnGap: memoryGridGap, rowGap: memoryGridGap }}
        onLayout={({ nativeEvent }) => {
          const nextWidth = nativeEvent.layout.width;
          setMemoryGridWidth((currentWidth) =>
            Math.abs(currentWidth - nextWidth) < 0.5 ? currentWidth : nextWidth,
          );
        }}
      >
        {memoryDeck.map((card) => (
          <Pressable
            key={card.id}
            className="items-center justify-center rounded-lg border active:opacity-90"
            style={{
              width: resolvedCardWidth,
              height: resolvedCardHeight,
              minHeight: adaptiveLayout.hit(layout.isTablet ? 72 : 56),
              borderColor: card.matched ? "rgba(52, 211, 153, 0.8)" : EXPEDITION_THEME.border,
              backgroundColor: card.matched
                ? "rgba(34, 197, 94, 0.2)"
                : card.revealed
                  ? "rgba(59, 130, 246, 0.2)"
                  : EXPEDITION_THEME.panelStrong,
              opacity: isInteractiveLocked || memoryBusy ? 0.85 : 1,
            }}
            onPress={() => {
              onPressCard(card.id);
            }}
            disabled={isInteractiveLocked || memoryBusy || card.matched || card.revealed}
            hitSlop={6}
          >
            <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 36 : 30 }}>
              {card.revealed || card.matched ? card.symbol : "?"}
            </Text>
          </Pressable>
        ))}
      </View>
      {memoryResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {memoryResult}
        </Text>
      ) : null}
    </View>
  );
}

type MemoryMediaSectionProps = {
  prompt: string;
  memoryDeck: MemoryCard[];
  memoryMatchedCount: number;
  memoryBusy: boolean;
  memoryResult: string | null;
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
  memoryResult,
  isInteractiveLocked,
  isTabletOverlay,
  quizSubmitError,
  onPressCard,
}: MemoryMediaSectionProps) {
  return (
    <View className="flex-1 px-2 py-2">
      <StationQuizTaskWrapper
        prompt={prompt}
        isTabletOverlay={isTabletOverlay}
        showBorder={false}
        error={quizSubmitError}
        errorPlacement="outside"
      >
        <MemoryStationPanel
          memoryDeck={memoryDeck}
          memoryMatchedCount={memoryMatchedCount}
          memoryBusy={memoryBusy}
          memoryResult={memoryResult}
          isInteractiveLocked={isInteractiveLocked}
          onPressCard={onPressCard}
        />
      </StationQuizTaskWrapper>
    </View>
  );
}
