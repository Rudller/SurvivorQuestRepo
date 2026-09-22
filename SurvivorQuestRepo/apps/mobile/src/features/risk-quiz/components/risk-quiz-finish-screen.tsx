import { useEffect } from "react";
import { Animated, Easing, Image, ScrollView, Text, View, useAnimatedValue } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ExpeditionLeaderboardEntry } from "../../expedition-stage/model/types";
import type { UiLanguage } from "../../i18n";
import { EXPEDITION_THEME, TEAM_COLORS } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { useReduceMotion } from "../../../shared/a11y/use-reduce-motion";
import { HiddenResetOnHold } from "../../../shared/ui/hidden-reset-on-hold";
import {
  buildRiskQuizFinishBars,
  resolveRiskQuizBarColors,
  summariseRiskQuizFinish,
  type RiskQuizFinishBar,
} from "../model/risk-quiz-finish-summary";
import { RISK_QUIZ_TEXT } from "../model/risk-quiz-text";
import { RiskQuizBackground } from "./risk-quiz-background";
import { RyzykanciLogoHeader } from "./ryzykanci-logo-header";

type RiskQuizFinishScreenProps = {
  language: UiLanguage;
  isLightTheme: boolean;
  currentTeamId: string;
  /** What the tablet counted; the leaderboard overrides it when it has a row. */
  teamPoints: number;
  leaderboardEntries: ExpeditionLeaderboardEntry[];
  /** The deck's face value, from deck-status. Bars are drawn against it. */
  maxPoints: number;
  /** The realization's `showLeaderboardOnFinish`. */
  showLeaderboard: boolean;
  onExitRealization: () => void;
};

const CONTENT_PADDING = 28;
// Same amber as the logo's halo, so the two glows on this screen read as one.
const HALO_COLOR = "#f59e0b";
const HALO_BREATH_MS = 2800;

/**
 * What a Ryzykanci tablet shows once the game is over.
 *
 * No panel, no card: the screen is the content, opening on the same wordmark
 * the team waited under before the game started. The standings carry the whole
 * screen — every team on its own bar, the tablet's own team picked out by a
 * breathing halo rather than by a separate banner repeating what its row
 * already says.
 *
 * There is no way off it on purpose. The game is over, so the scan UI
 * underneath would only send a team chasing cards the backend no longer scores;
 * the hidden hold stays for the organiser, exactly as on the intro card.
 */
export function RiskQuizFinishScreen({
  language,
  isLightTheme,
  currentTeamId,
  teamPoints,
  leaderboardEntries,
  maxPoints,
  showLeaderboard,
  onExitRealization,
}: RiskQuizFinishScreenProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
  const text = RISK_QUIZ_TEXT[language].finish;
  const bars = showLeaderboard
    ? buildRiskQuizFinishBars({ entries: leaderboardEntries, teamId: currentTeamId, maxPoints })
    : [];
  const ownPoints = summariseRiskQuizFinish({
    entries: leaderboardEntries,
    teamId: currentTeamId,
    fallbackPoints: teamPoints,
  }).points;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: EXPEDITION_THEME.background }}>
      <RiskQuizBackground isLightTheme={isLightTheme} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: CONTENT_PADDING,
          paddingTop: adaptiveLayout.s(isTabletLayout ? 20 : 12, 10, 28),
          paddingBottom: adaptiveLayout.s(isTabletLayout ? 24 : 16, 14, 32),
          flexGrow: 1,
        }}
      >
        {/* Same header the team waited under before the start, so the end reads
            as the closing bracket of that screen rather than a stranger. */}
        <RyzykanciLogoHeader maxHeightRatio={0.2} contentPadding={CONTENT_PADDING} />

        <Text
          className="text-center font-extrabold uppercase"
          style={{
            color: EXPEDITION_THEME.accentStrong,
            fontSize: adaptiveLayout.fs(isTabletLayout ? 64 : 38, 32, 76),
            letterSpacing: 2,
            marginTop: adaptiveLayout.s(isTabletLayout ? 12 : 8, 6, 18),
          }}
        >
          {text.title}
        </Text>
        <Text
          className="text-center"
          style={{
            color: EXPEDITION_THEME.textMuted,
            fontSize: adaptiveLayout.fs(isTabletLayout ? 24 : 16, 15, 28),
            marginTop: 6,
          }}
        >
          {text.subtitle}
        </Text>

        {bars.length > 0 ? (
          <View style={{ marginTop: adaptiveLayout.s(isTabletLayout ? 28 : 20, 16, 36) }}>
            {bars.map((bar) => (
              <FinishBarRow key={bar.teamId} bar={bar} />
            ))}
          </View>
        ) : (
          // Ranking off: the organiser announces the standings, so the tablet
          // shows nothing but the score that is unambiguously this team's.
          <View className="mt-8 items-center">
            <Text
              testID="risk-finish-own-points"
              className="font-extrabold"
              style={{ color: EXPEDITION_THEME.accentStrong, fontSize: adaptiveLayout.fs(isTabletLayout ? 96 : 60, 52, 112) }}
            >
              {ownPoints}
            </Text>
            <Text
              className="uppercase tracking-widest"
              style={{ color: EXPEDITION_THEME.textMuted, fontSize: adaptiveLayout.fs(isTabletLayout ? 20 : 14, 13, 24) }}
            >
              {text.points}
            </Text>
          </View>
        )}

        <View className="flex-1" />

        {/* The sign-off doubles as the organiser's way out, the same hold that
            sits on the intro card. Nothing else here is pressable, and a tablet
            that cannot reach the server still has to be recoverable. */}
        <HiddenResetOnHold language={language} variant="exit" onReset={onExitRealization}>
          <View style={{ marginTop: adaptiveLayout.s(isTabletLayout ? 28 : 20, 16, 36) }}>
            <Text
              className="text-center"
              style={{
                color: EXPEDITION_THEME.textMuted,
                fontSize: adaptiveLayout.fs(isTabletLayout ? 26 : 18, 16, 30),
              }}
            >
              {text.handBackTablets}
            </Text>
            <Text
              className="mt-2 text-center font-semibold"
              style={{
                color: EXPEDITION_THEME.textPrimary,
                fontSize: adaptiveLayout.fs(isTabletLayout ? 30 : 20, 18, 34),
              }}
            >
              {text.thanks}
            </Text>
          </View>
        </HiddenResetOnHold>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * One team's standing: place, badge, name and score, with the bar itself as the
 * row's background so the label stays readable at every width — including a
 * team on zero, whose bar is not there at all.
 */
function FinishBarRow({ bar }: { bar: RiskQuizFinishBar }) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
  const paletteColor =
    TEAM_COLORS.find((color) => color.key === bar.color) ??
    TEAM_COLORS[(Math.max(1, bar.slotNumber) - 1) % TEAM_COLORS.length];
  const barColors = resolveRiskQuizBarColors(paletteColor?.hex ?? "");
  const rowHeight = adaptiveLayout.s(isTabletLayout ? 78 : 56, 52, 88);
  const rowRadius = 14;
  const badgeSize = rowHeight - adaptiveLayout.s(isTabletLayout ? 18 : 14, 12, 20);
  const nameFontSize = adaptiveLayout.fs(isTabletLayout ? 26 : 17, 15, 30);
  const pointsFontSize = adaptiveLayout.fs(isTabletLayout ? 32 : 20, 18, 36);
  const placeFontSize = adaptiveLayout.fs(isTabletLayout ? 28 : 18, 16, 32);

  const row = (
    <View
      testID="risk-finish-bar-row"
      style={{
        height: rowHeight,
        borderRadius: rowRadius,
        overflow: "hidden",
        // The team's own colour at low alpha, not the theme's panel: bars are
        // measured against the whole deck, so most of a row is empty track and
        // a neutral one turned the table into a stack of black bands.
        backgroundColor: barColors.track,
        borderWidth: bar.isOwnTeam ? 2 : 0,
        borderColor: EXPEDITION_THEME.accentStrong,
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${bar.widthPercent}%`,
          backgroundColor: barColors.fill,
          // Other teams sit back a little, but nowhere near enough to grey out:
          // at 0.45 they read as dirt rather than as a colour.
          opacity: bar.isOwnTeam ? 1 : 0.8,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: adaptiveLayout.s(isTabletLayout ? 14 : 10, 8, 18),
          columnGap: adaptiveLayout.s(isTabletLayout ? 12 : 8, 6, 16),
        }}
      >
        <Text
          className="font-extrabold"
          style={{ color: EXPEDITION_THEME.textPrimary, fontSize: placeFontSize, minWidth: placeFontSize * 1.4 }}
        >
          {bar.position}.
        </Text>

        {/* badgeKey is the emoji itself, not a lookup key — a team without an
            uploaded photo still has an icon, and without this fallback the
            square just sat there empty. */}
        <View
          className="items-center justify-center overflow-hidden rounded-lg"
          style={{ width: badgeSize, height: badgeSize, backgroundColor: barColors.fill }}
        >
          {bar.badgeImageUrl ? (
            <Image source={{ uri: bar.badgeImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: badgeSize * 0.56 }}>{bar.badgeKey?.trim() || "🏁"}</Text>
          )}
        </View>

        <Text
          className="flex-1"
          numberOfLines={1}
          style={{
            color: EXPEDITION_THEME.textPrimary,
            fontSize: nameFontSize,
            fontWeight: bar.isOwnTeam ? "800" : "600",
          }}
        >
          {bar.name}
        </Text>

        <Text
          className="font-extrabold"
          style={{ color: EXPEDITION_THEME.textPrimary, fontSize: pointsFontSize, includeFontPadding: false }}
        >
          {bar.points}
        </Text>
      </View>
    </View>
  );

  if (!bar.isOwnTeam) {
    return <View style={{ marginBottom: 10 }}>{row}</View>;
  }

  return <OwnTeamHalo rowHeight={rowHeight}>{row}</OwnTeamHalo>;
}

/**
 * The glow that says "this one is yours".
 *
 * A radial gradient in SVG, the same trick the logo's halo uses. The first
 * attempt was a tinted frame behind the row — `rgba(245, 158, 11, 0.55)` at an
 * animated opacity — which on the near-black background composited to a muddy
 * dark ring instead of a glow. A gradient that reaches zero alpha off-frame has
 * no edge to go grey on.
 */
function OwnTeamHalo({ rowHeight, children }: { rowHeight: number; children: React.ReactNode }) {
  const breath = useAnimatedValue(0);
  const isReduceMotionEnabled = useReduceMotion();

  useEffect(() => {
    if (isReduceMotionEnabled) {
      breath.setValue(0.5);
      return;
    }

    const halfBreath = (toValue: number) =>
      Animated.timing(breath, {
        toValue,
        duration: HALO_BREATH_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([halfBreath(1), halfBreath(0)]));
    loop.start();

    return () => loop.stop();
  }, [breath, isReduceMotionEnabled]);

  return (
    <View testID="risk-finish-own-halo" style={{ marginBottom: 10 }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -rowHeight * 0.4,
          bottom: -rowHeight * 0.4,
          left: -18,
          right: -18,
          opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="riskFinishOwnGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor={HALO_COLOR} stopOpacity={0.5} />
              <Stop offset="55%" stopColor={HALO_COLOR} stopOpacity={0.2} />
              <Stop offset="100%" stopColor={HALO_COLOR} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#riskFinishOwnGlow)" />
        </Svg>
      </Animated.View>
      {children}
    </View>
  );
}
