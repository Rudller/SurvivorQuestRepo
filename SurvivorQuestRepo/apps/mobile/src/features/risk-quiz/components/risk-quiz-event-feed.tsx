import { useEffect, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useUiLanguage } from "../../i18n";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import type { RiskChatMessage } from "../api/risk-quiz.api";
import { describeRiskFeedEvent } from "../model/risk-quiz-feed-text";

// Always this many lines, blank ones included, so the feed never changes height
// and the card area below it never jumps when an event lands.
export const RISK_FEED_VISIBLE_ROWS = 3;

const ROW_ENTER_DURATION_MS = 420;
const ROW_ENTER_SLIDE_PX = -10;

type RiskQuizEventFeedProps = {
  // Oldest first, the way the poll accumulates them; the feed shows the tail.
  events: RiskChatMessage[];
  currentTeamId: string | null;
};

type FeedRowProps = {
  text: string;
  isNewest: boolean;
  isOwnTeam: boolean;
  height: number;
  fontSize: number;
};

function FeedRow({ text, isNewest, isOwnTeam, height, fontSize }: FeedRowProps) {
  const enter = useState(() => new Animated.Value(0))[0];

  // Keyed on the event id by the parent, so a row mounts exactly once per
  // event: it drops in from just above its slot while fading up, and the
  // older rows simply take the slots below.
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: ROW_ENTER_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  const textColor = isOwnTeam
    ? EXPEDITION_THEME.accentStrong
    : isNewest
      ? EXPEDITION_THEME.textPrimary
      : EXPEDITION_THEME.textSubtle;

  return (
    <Animated.View
      testID="risk-feed-row"
      style={{
        height,
        justifyContent: "center",
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [ROW_ENTER_SLIDE_PX, 0] }),
          },
        ],
      }}
    >
      <Text numberOfLines={1} style={{ color: textColor, fontSize }}>
        {text}
      </Text>
    </Animated.View>
  );
}

export function RiskQuizEventFeed({ events, currentTeamId }: RiskQuizEventFeedProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const language = useUiLanguage();
  const isTabletLayout = adaptiveLayout.isTablet;
  const fontSize = adaptiveLayout.fs(isTabletLayout ? 11 : 10, 9, 12);
  const rowHeight = Math.round(fontSize * 1.5);
  const paddingHorizontal = adaptiveLayout.s(isTabletLayout ? 8 : 6, 4, 10);

  const visible = events.slice(-RISK_FEED_VISIBLE_ROWS).reverse();
  const blankRows = Math.max(0, RISK_FEED_VISIBLE_ROWS - visible.length);

  return (
    <View
      testID="risk-feed"
      // Full column width rather than the bottom bar's centred 560px: on a
      // tablet that cap left the lines floating well inside the screen edge.
      style={{ width: "100%", paddingHorizontal }}
    >
      {visible.map((event, index) => (
        <FeedRow
          key={event.id}
          text={describeRiskFeedEvent(event, language)}
          isNewest={index === 0}
          isOwnTeam={event.teamId !== null && event.teamId === currentTeamId}
          height={rowHeight}
          fontSize={fontSize}
        />
      ))}
      {Array.from({ length: blankRows }, (_, index) => (
        <View key={`blank-${index}`} testID="risk-feed-blank" style={{ height: rowHeight }} />
      ))}
    </View>
  );
}
