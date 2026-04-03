import { Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { MEMORY_MAX_MISTAKES, type MemoryCard } from "../puzzle-helpers";

type MemoryStationPanelProps = {
  memoryDeck: MemoryCard[];
  memoryMatchedCount: number;
  memoryMistakes: number;
  memoryAttemptsLeft: number;
  memoryBusy: boolean;
  memoryResult: string | null;
  isInteractiveLocked: boolean;
  onPressCard: (cardId: string) => void;
};

export function MemoryStationPanel({
  memoryDeck,
  memoryMatchedCount,
  memoryMistakes,
  memoryAttemptsLeft,
  memoryBusy,
  memoryResult,
  isInteractiveLocked,
  onPressCard,
}: MemoryStationPanelProps) {
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Pary: {memoryMatchedCount / 2}/{memoryDeck.length / 2} • Błędy: {memoryMistakes}/{MEMORY_MAX_MISTAKES}
      </Text>
      <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
        {memoryDeck.map((card) => (
          <Pressable
            key={card.id}
            className="h-16 w-[31.5%] items-center justify-center rounded-xl border active:opacity-90"
            style={{
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
            disabled={isInteractiveLocked || memoryBusy || card.matched || card.revealed || memoryAttemptsLeft <= 0}
          >
            <Text className="text-xl">{card.revealed || card.matched ? card.symbol : "?"}</Text>
          </Pressable>
        ))}
      </View>
      {memoryResult ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {memoryResult}
        </Text>
      ) : null}
    </View>
  );
}
