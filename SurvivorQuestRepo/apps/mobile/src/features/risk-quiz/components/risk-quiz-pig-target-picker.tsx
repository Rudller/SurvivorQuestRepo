import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EXPEDITION_THEME, TEAM_COLORS } from "../../onboarding/model/constants";
import type { RiskPigTarget, RiskPigType } from "../api/risk-quiz.api";
import { useUiLanguage } from "../../i18n";
import { RISK_QUIZ_TEXT } from "../model/risk-quiz-text";
import { RISK_PIG_TEXT } from "../model/risk-quiz-pig-text";

// Team.color is a palette key ("amber"), never a hex — the same lookup the chat
// dock uses, so a team reads the same colour everywhere.
const TEAM_COLOR_HEX_BY_KEY = new Map<string, string>(
  TEAM_COLORS.map((color) => [color.key, color.hex]),
);

type RiskQuizPigTargetPickerProps = {
  visible: boolean;
  type: RiskPigType;
  targets: RiskPigTarget[];
  isThrowing: boolean;
  errorMessage: string | null;
  onThrow: (targetTeamId?: string) => void;
  onClose: () => void;
};

export function RiskQuizPigTargetPicker({
  visible,
  type,
  targets,
  isThrowing,
  errorMessage,
  onThrow,
  onClose,
}: RiskQuizPigTargetPickerProps) {
  const uiLanguage = useUiLanguage();
  const text = RISK_QUIZ_TEXT[uiLanguage].targetPicker;
  const pigText = RISK_PIG_TEXT[uiLanguage];
  const availableCount = targets.filter((target) => target.isAvailable).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: EXPEDITION_THEME.background }}>
        <View
          className="flex-row items-center justify-between border-b px-4 py-3"
          style={{ borderColor: EXPEDITION_THEME.border }}
        >
          <View>
            <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: 17 }}>
              {pigText.heading(pigText.labels[type])}
            </Text>
            <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: 13 }}>
              {pigText.descriptions[type]}
            </Text>
          </View>
          <Pressable
            testID="risk-pig-picker-close"
            onPress={onClose}
            className="px-4 py-2 active:opacity-80"
            style={{ backgroundColor: EXPEDITION_THEME.panelStrong }}
          >
            <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: 14 }}>{text.cancel}</Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <Text style={{ color: EXPEDITION_THEME.danger, fontSize: 13, padding: 12 }}>
            {errorMessage}
          </Text>
        ) : null}

        <ScrollView contentContainerStyle={{ padding: 12, rowGap: 8 }}>
          {targets.map((target) => {
            const accent = target.teamColor
              ? (TEAM_COLOR_HEX_BY_KEY.get(target.teamColor) ?? EXPEDITION_THEME.textMuted)
              : EXPEDITION_THEME.textMuted;

            return (
              <Pressable
                key={target.teamId}
                testID={`risk-pig-target-${target.teamId}`}
                disabled={!target.isAvailable || isThrowing}
                onPress={() => onThrow(target.teamId)}
                className="flex-row items-center border px-4 py-3 active:opacity-90"
                style={{
                  columnGap: 10,
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelStrong,
                  // Greyed out rather than hidden: a team already under a pig is
                  // worth seeing, it just cannot be piled on.
                  opacity: target.isAvailable ? 1 : 0.4,
                }}
              >
                <View style={{ width: 10, height: 10, backgroundColor: accent }} />
                <Text className="flex-1" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: 16 }}>
                  {target.teamName}
                </Text>
                {target.isAvailable ? null : (
                  <Text style={{ color: EXPEDITION_THEME.textSubtle, fontSize: 12 }}>
                    {text.alreadyHit}
                  </Text>
                )}
              </Pressable>
            );
          })}

          {targets.length === 0 ? (
            <Text className="text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: 14, marginTop: 20 }}>
              {text.nobodyToHit}
            </Text>
          ) : null}
        </ScrollView>

        <View className="border-t px-3 py-3" style={{ borderColor: EXPEDITION_THEME.border }}>
          <Pressable
            testID="risk-pig-random"
            disabled={availableCount === 0 || isThrowing}
            onPress={() => onThrow(undefined)}
            className="items-center justify-center px-5 active:opacity-90"
            style={{
              minHeight: 48,
              backgroundColor:
                availableCount === 0 || isThrowing
                  ? EXPEDITION_THEME.panelStrong
                  : EXPEDITION_THEME.accent,
            }}
          >
            <Text
              className="font-semibold uppercase tracking-widest"
              style={{
                color:
                  availableCount === 0 || isThrowing
                    ? EXPEDITION_THEME.textMuted
                    : EXPEDITION_THEME.background,
                fontSize: 13,
              }}
            >
              {isThrowing ? text.throwing : text.randomTarget}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
