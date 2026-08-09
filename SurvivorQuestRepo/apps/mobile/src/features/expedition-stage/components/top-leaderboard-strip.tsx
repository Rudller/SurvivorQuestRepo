import { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME, TEAM_COLORS } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { useCountUpValue } from "../../../shared/ui/use-count-up-value";
import type { ExpeditionLeaderboardEntry } from "../model/types";

type TopLeaderboardStripProps = {
  entries: ExpeditionLeaderboardEntry[];
  currentTeamId: string;
};

type TopLeaderboardText = {
  points: string;
  missingTeam: string;
  fullTable: string;
  close: string;
  place: string;
  team: string;
  noData: string;
};

const TOP_LEADERBOARD_TEXT: Record<UiLanguage, TopLeaderboardText> = {
  polish: {
    points: "pkt",
    missingTeam: "Brak drużyny",
    fullTable: "Tabela wyników",
    close: "Zamknij",
    place: "Miejsce",
    team: "Drużyna",
    noData: "Brak danych",
  },
  english: {
    points: "pts",
    missingTeam: "No team",
    fullTable: "Results table",
    close: "Close",
    place: "Place",
    team: "Team",
    noData: "No data",
  },
  ukrainian: {
    points: "б.",
    missingTeam: "Немає команди",
    fullTable: "Таблиця результатів",
    close: "Закрити",
    place: "Місце",
    team: "Команда",
    noData: "Немає даних",
  },
  russian: {
    points: "очк.",
    missingTeam: "Нет команды",
    fullTable: "Таблица результатов",
    close: "Закрыть",
    place: "Место",
    team: "Команда",
    noData: "Нет данных",
  },
};

function CloseIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M18 6L6 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function truncateTeamName(name: string, maxLength: number) {
  if (name.length <= maxLength) {
    return name;
  }

  return `${name.slice(0, Math.max(1, maxLength - 1))}…`;
}

function resolveTeamColorHex(entry: ExpeditionLeaderboardEntry) {
  const colorOption =
    TEAM_COLORS.find((color) => color.key === entry.color) ??
    TEAM_COLORS[(Math.max(1, entry.slotNumber) - 1) % TEAM_COLORS.length];

  return colorOption?.hex ?? "#334155";
}

function resolveRowTextColor(hexColor: string) {
  const normalizedHex = hexColor.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return "#f8fafc";
  }

  const parsedHex = Number.parseInt(normalizedHex, 16);
  const red = (parsedHex >> 16) & 255;
  const green = (parsedHex >> 8) & 255;
  const blue = parsedHex & 255;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 172 ? "#0f172a" : "#f8fafc";
}

type PodiumColumnProps = {
  entry: ExpeditionLeaderboardEntry | null;
  rank: 1 | 2 | 3;
  isCurrentTeam: boolean;
  stepHeight: number;
  isTablet: boolean;
  adaptiveLayout: ReturnType<typeof useAdaptiveLayout>;
  text: TopLeaderboardText;
};

function PodiumColumn({ entry, rank, isCurrentTeam, stepHeight, isTablet, adaptiveLayout, text }: PodiumColumnProps) {
  const stepLabelStyle = {
    fontSize: adaptiveLayout.fs(isTablet ? 14 : 12, 10, 16),
  };
  const displayedPoints = useCountUpValue(entry?.points ?? 0);

  if (!entry) {
    return (
      <View className="flex-1 items-center">
        <Text
          numberOfLines={1}
          className="font-semibold"
          style={{ color: EXPEDITION_THEME.textMuted, fontSize: adaptiveLayout.fs(isTablet ? 10 : 9, 8, 12) }}
        >
          {text.missingTeam}
        </Text>
        <View
          className="mt-1 w-full items-center rounded-t-lg border pt-1"
          style={{ height: stepHeight, borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
        >
          <Text className="font-extrabold" style={{ ...stepLabelStyle, color: EXPEDITION_THEME.textSubtle }}>
            {rank}
          </Text>
        </View>
      </View>
    );
  }

  const teamColor = resolveTeamColorHex(entry);
  const stepTextColor = resolveRowTextColor(teamColor);
  const teamName = entry.name?.trim() || `#${entry.slotNumber}`;
  const badgeLabel = entry.badgeKey?.trim() || "🏁";
  const highlightColor = isCurrentTeam ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.textPrimary;

  return (
    <View className="flex-1 items-center">
      <Text
        className="font-extrabold"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{ color: highlightColor, fontSize: adaptiveLayout.fs(isTablet ? 14 : 12, 10, 16) }}
      >
        {displayedPoints} {text.points}
      </Text>
      <View className="mt-1 max-w-full flex-row items-center" style={{ columnGap: adaptiveLayout.s(3, 2, 4) }}>
        {entry.badgeImageUrl ? (
          <Image
            source={{ uri: entry.badgeImageUrl }}
            resizeMode="cover"
            style={{
              width: adaptiveLayout.s(isTablet ? 16 : 14, 12, 18),
              height: adaptiveLayout.s(isTablet ? 16 : 14, 12, 18),
              borderRadius: 999,
            }}
          />
        ) : (
          <Text style={{ fontSize: adaptiveLayout.fs(isTablet ? 13 : 11, 10, 15) }}>{badgeLabel}</Text>
        )}
        <Text
          numberOfLines={1}
          className="font-semibold"
          style={{ color: highlightColor, fontSize: adaptiveLayout.fs(isTablet ? 10 : 9, 8, 12) }}
        >
          {truncateTeamName(teamName, isTablet ? 12 : 9)}
        </Text>
      </View>
      <View
        className="mt-1 w-full items-center rounded-t-lg border pt-1"
        style={{
          height: stepHeight,
          borderColor: isCurrentTeam ? EXPEDITION_THEME.accentStrong : "rgba(255,255,255,0.28)",
          backgroundColor: teamColor,
        }}
      >
        <Text className="font-extrabold" style={{ ...stepLabelStyle, color: stepTextColor }}>
          {rank}
        </Text>
      </View>
    </View>
  );
}

type LeaderboardTableRowProps = {
  entry: ExpeditionLeaderboardEntry;
  isCurrentTeam: boolean;
  isEvenRow: boolean;
  isTablet: boolean;
  adaptiveLayout: ReturnType<typeof useAdaptiveLayout>;
};

function LeaderboardTableRow({ entry, isCurrentTeam, isEvenRow, isTablet, adaptiveLayout }: LeaderboardTableRowProps) {
  const badgeLabel = entry.badgeKey?.trim() || "🏁";
  const displayedPoints = useCountUpValue(entry.points);

  return (
    <View
      className="flex-row items-center border-b px-3 py-2"
      style={{
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: isCurrentTeam
          ? EXPEDITION_THEME.panelStrong
          : isEvenRow
            ? EXPEDITION_THEME.panelMuted
            : EXPEDITION_THEME.panel,
      }}
    >
      <Text
        className="font-extrabold"
        style={{
          width: 56,
          color: isCurrentTeam ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.textPrimary,
          fontSize: adaptiveLayout.fs(isTablet ? 14 : 12, 11, 18),
        }}
      >
        #{entry.position}
      </Text>
      <View className="flex-1 flex-row items-center">
        {entry.badgeImageUrl ? (
          <Image
            source={{ uri: entry.badgeImageUrl }}
            resizeMode="cover"
            style={{
              width: adaptiveLayout.s(18, 16, 24),
              height: adaptiveLayout.s(18, 16, 24),
              borderRadius: adaptiveLayout.s(999, 999, 999),
              marginRight: adaptiveLayout.s(6, 4, 8),
            }}
          />
        ) : (
          <Text
            style={{
              fontSize: adaptiveLayout.fs(isTablet ? 14 : 12, 11, 18),
              marginRight: adaptiveLayout.s(6, 4, 8),
            }}
          >
            {badgeLabel}
          </Text>
        )}
        <Text
          numberOfLines={1}
          className="flex-1 font-semibold"
          style={{
            color: EXPEDITION_THEME.textPrimary,
            fontSize: adaptiveLayout.fs(isTablet ? 14 : 12, 11, 18),
          }}
        >
          {entry.name || `#${entry.slotNumber}`}
        </Text>
      </View>
      <Text
        className="w-20 text-right font-extrabold"
        style={{
          color: EXPEDITION_THEME.textPrimary,
          fontSize: adaptiveLayout.fs(isTablet ? 15 : 13, 12, 20),
        }}
      >
        {displayedPoints}
      </Text>
    </View>
  );
}

export function TopLeaderboardStrip({ entries, currentTeamId }: TopLeaderboardStripProps) {
  const uiLanguage = useUiLanguage();
  const text = TOP_LEADERBOARD_TEXT[uiLanguage];
  const adaptiveLayout = useAdaptiveLayout();
  const isTablet = adaptiveLayout.isTablet;
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (left, right) =>
          left.position - right.position ||
          right.points - left.points ||
          left.slotNumber - right.slotNumber,
      ),
    [entries],
  );

  const topThree = sortedEntries.slice(0, 3);
  const podiumEntries = Array.from({ length: 3 }, (_, index) => topThree[index] ?? null);

  if (topThree.length === 0) {
    return null;
  }

  const stepHeights: Record<1 | 2 | 3, number> = {
    1: adaptiveLayout.s(isTablet ? 64 : 52, 44, 76),
    2: adaptiveLayout.s(isTablet ? 48 : 40, 34, 60),
    3: adaptiveLayout.s(isTablet ? 38 : 32, 28, 48),
  };
  // Match BottomCountdownPanel's own border radius so the podium's outer
  // edges land on the flat part of that panel's rounded top, not its curve.
  const podiumHorizontalInset = adaptiveLayout.s(isTablet ? 32 : 30, 26, 36);

  return (
    <>
      <Pressable
        className="flex-row items-end rounded-2xl pt-2 active:opacity-85"
        style={{ columnGap: adaptiveLayout.s(isTablet ? 8 : 6, 4, 10), paddingHorizontal: podiumHorizontalInset }}
        onPress={() => setIsPopupVisible(true)}
      >
        {([2, 1, 3] as const).map((rank) => {
          const entry = podiumEntries[rank - 1];

          return (
            <PodiumColumn
              // Keyed by team (not rank slot) so a component instance follows
              // its team across rank changes instead of being reused for
              // whichever different team now occupies that position — which
              // would otherwise animate the points counter between two
              // unrelated teams' scores.
              key={entry ? `podium-team-${entry.teamId}` : `podium-empty-${rank}`}
              entry={entry}
              rank={rank}
              isCurrentTeam={entry?.teamId === currentTeamId}
              stepHeight={stepHeights[rank]}
              isTablet={isTablet}
              adaptiveLayout={adaptiveLayout}
              text={text}
            />
          );
        })}
      </Pressable>

      <Modal
        visible={isPopupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPopupVisible(false)}
      >
        <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.56)" }}>
          <Pressable className="absolute inset-0" onPress={() => setIsPopupVisible(false)} />

          <View
            className="w-full rounded-2xl border"
            style={{
              maxWidth: isTablet ? 760 : 500,
              maxHeight: isTablet ? 640 : 520,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
          >
            <View
              className="flex-row items-center justify-between border-b px-3 py-2"
              style={{ borderColor: EXPEDITION_THEME.border }}
            >
              <Text
                className="font-extrabold uppercase"
                style={{
                  color: EXPEDITION_THEME.accentStrong,
                  fontSize: adaptiveLayout.fs(isTablet ? 14 : 12, 11, 18),
                  letterSpacing: 0.8,
                }}
              >
                {text.fullTable}
              </Text>
              <Pressable
                className="items-center justify-center rounded-md border p-1 active:opacity-80"
                style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
                onPress={() => setIsPopupVisible(false)}
              >
                <CloseIcon
                  color={EXPEDITION_THEME.textPrimary}
                  size={adaptiveLayout.s(isTablet ? 14 : 12, 10, 18)}
                />
              </Pressable>
            </View>

            <View
              className="flex-row items-center border-b px-3 py-1.5"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
            >
              <Text className="font-bold uppercase" style={{ width: 56, color: EXPEDITION_THEME.textSubtle, fontSize: 11 }}>
                {text.place}
              </Text>
              <Text className="flex-1 font-bold uppercase" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: 11 }}>
                {text.team}
              </Text>
              <Text className="w-20 text-right font-bold uppercase" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: 11 }}>
                {text.points}
              </Text>
            </View>

            {sortedEntries.length > 0 ? (
              <ScrollView contentContainerStyle={{ paddingBottom: 6 }}>
                {sortedEntries.map((entry, index) => (
                  <LeaderboardTableRow
                    key={`full-table-${entry.teamId}`}
                    entry={entry}
                    isCurrentTeam={entry.teamId === currentTeamId}
                    isEvenRow={index % 2 === 0}
                    isTablet={isTablet}
                    adaptiveLayout={adaptiveLayout}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text className="px-3 py-3" style={{ color: EXPEDITION_THEME.textMuted, fontSize: adaptiveLayout.fs(12, 11, 16) }}>
                {text.noData}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
