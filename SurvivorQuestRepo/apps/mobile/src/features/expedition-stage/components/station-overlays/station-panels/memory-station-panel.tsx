import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { MEMORY_MAX_MISTAKES, type MemoryCard } from "../puzzle-helpers";
import { AttemptsIndicator, useStationPanelLayout } from "./shared-ui";

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

type MemoryStationText = {
  pairs: string;
  errors: string;
  attemptsLeft: string;
};

const MEMORY_STATION_TEXT_ENGLISH: MemoryStationText = {
  pairs: "Pairs",
  errors: "Errors",
  attemptsLeft: "Attempts left",
};

const MEMORY_STATION_TEXT: Record<UiLanguage, MemoryStationText> = {
  polish: {
    pairs: "Pary",
    errors: "Błędy",
    attemptsLeft: "Pozostało prób",
  },
  english: MEMORY_STATION_TEXT_ENGLISH,
  ukrainian: {
    pairs: "Пари",
    errors: "Помилки",
    attemptsLeft: "Залишилось спроб",
  },
  russian: {
    pairs: "Пары",
    errors: "Ошибки",
    attemptsLeft: "Осталось попыток",
  },
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
  const uiLanguage = useUiLanguage();
  const text = MEMORY_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();

  return (
    <View className="mt-3">
      <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.pairs}: {memoryMatchedCount / 2}/{memoryDeck.length / 2} • {text.errors}: {memoryMistakes}/{MEMORY_MAX_MISTAKES}
      </Text>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={memoryAttemptsLeft}
          maxAttempts={MEMORY_MAX_MISTAKES}
        />
      </View>
      <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
        {memoryDeck.map((card) => (
          <Pressable
            key={card.id}
            className="w-[31.5%] items-center justify-center rounded-xl border active:opacity-90"
            style={{
              height: layout.isTablet ? 76 : 64,
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
            hitSlop={4}
          >
            <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 30 : 20 }}>
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
