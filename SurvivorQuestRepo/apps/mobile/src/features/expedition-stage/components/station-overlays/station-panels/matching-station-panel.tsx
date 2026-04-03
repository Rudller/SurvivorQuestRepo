import { Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import type { MatchingPair } from "../puzzle-helpers";

type MatchingStationPanelProps = {
  stationId: string;
  matchingAttemptsLeft: number;
  matchingPairs: MatchingPair[];
  matchingMatchedLeft: string[];
  matchingSelectionLeft: string | null;
  matchingRightOptions: string[];
  matchedRightSet: Set<string>;
  matchingResult: string | null;
  isInteractiveLocked: boolean;
  onSelectLeft: (left: string) => void;
  onSelectRight: (right: string) => void;
};

export function MatchingStationPanel({
  stationId,
  matchingAttemptsLeft,
  matchingPairs,
  matchingMatchedLeft,
  matchingSelectionLeft,
  matchingRightOptions,
  matchedRightSet,
  matchingResult,
  isInteractiveLocked,
  onSelectLeft,
  onSelectRight,
}: MatchingStationPanelProps) {
  return (
    <View className="mt-3">
      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
        Połącz elementy. Pozostało prób: {matchingAttemptsLeft}
      </Text>
      <View className="mt-2 flex-row gap-2">
        <View className="flex-1 gap-1.5">
          {matchingPairs.map((pair) => {
            const isMatched = matchingMatchedLeft.includes(pair.left);
            const isSelected = matchingSelectionLeft === pair.left;
            return (
              <Pressable
                key={`${stationId}-matching-left-${pair.left}`}
                className="rounded-xl border px-3 py-2 active:opacity-90"
                style={{
                  borderColor: isMatched
                    ? "rgba(52, 211, 153, 0.8)"
                    : isSelected
                      ? EXPEDITION_THEME.accentStrong
                      : EXPEDITION_THEME.border,
                  backgroundColor: isMatched ? "rgba(34, 197, 94, 0.2)" : EXPEDITION_THEME.panelStrong,
                }}
                onPress={() => {
                  onSelectLeft(pair.left);
                }}
                disabled={isInteractiveLocked || isMatched || matchingAttemptsLeft <= 0}
              >
                <Text className="text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {pair.left}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-1 gap-1.5">
          {matchingRightOptions.map((rightOption) => {
            const isMatched = matchedRightSet.has(rightOption);
            return (
              <Pressable
                key={`${stationId}-matching-right-${rightOption}`}
                className="rounded-xl border px-3 py-2 active:opacity-90"
                style={{
                  borderColor: isMatched ? "rgba(52, 211, 153, 0.8)" : EXPEDITION_THEME.border,
                  backgroundColor: isMatched ? "rgba(34, 197, 94, 0.2)" : EXPEDITION_THEME.panelStrong,
                }}
                onPress={() => {
                  onSelectRight(rightOption);
                }}
                disabled={isInteractiveLocked || isMatched || matchingAttemptsLeft <= 0}
              >
                <Text className="text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {rightOption}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {matchingResult ? (
        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {matchingResult}
        </Text>
      ) : null}
    </View>
  );
}
