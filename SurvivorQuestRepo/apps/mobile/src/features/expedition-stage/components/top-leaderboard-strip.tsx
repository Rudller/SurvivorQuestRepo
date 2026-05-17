import { useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME, TEAM_COLORS } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import type { ExpeditionLeaderboardEntry } from "../model/types";

type TopLeaderboardStripProps = {
  entries: ExpeditionLeaderboardEntry[];
  currentTeamId: string;
  compact?: boolean;
};

const TOP_LEADERBOARD_TEXT: Record<
  UiLanguage,
  {
    points: string;
    missingTeam: string;
    fullTable: string;
    close: string;
    place: string;
    team: string;
    noData: string;
  }
> = {
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

function LeaderboardIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 7.5L12 12.5L17 7.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 12.5L12 17.5L17 12.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

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

export function TopLeaderboardStrip({ entries, currentTeamId, compact = false }: TopLeaderboardStripProps) {
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

  const trigger = compact ? (
    <Pressable
      className="h-14 flex-row items-center rounded-lg border active:opacity-80"
      style={{
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: EXPEDITION_THEME.panelMuted,
        overflow: "hidden",
      }}
      onPress={() => setIsPopupVisible(true)}
    >
      <View className="w-5 items-center justify-center">
        <LeaderboardIcon
          color={EXPEDITION_THEME.accentStrong}
          size={adaptiveLayout.s(isTablet ? 14 : 12, 11, 16)}
        />
      </View>
      <View className="flex-1 self-stretch">
        {podiumEntries.map((entry, index) => {
          if (!entry) {
            return (
              <View
                key={`compact-top-three-empty-${index + 1}`}
                className="w-full flex-row items-center border"
                style={{
                  flex: 1,
                  marginTop: -1,
                  marginBottom: index === podiumEntries.length - 1 ? -1 : 0,
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelStrong,
                  opacity: 0.62,
                }}
              >
                <Text
                  className="font-bold"
                  style={{
                    width: adaptiveLayout.s(isTablet ? 10 : 8, 7, 13),
                    color: EXPEDITION_THEME.textSubtle,
                    fontSize: adaptiveLayout.fs(isTablet ? 6 : 5, 5, 8),
                  }}
                >
                  {index + 1}.
                </Text>
                <Text
                  style={{
                    width: adaptiveLayout.s(isTablet ? 8 : 7, 6, 10),
                    color: EXPEDITION_THEME.textMuted,
                    fontSize: adaptiveLayout.fs(isTablet ? 6 : 5, 5, 8),
                  }}
                >
                  —
                </Text>
                <Text
                  numberOfLines={1}
                  className="flex-1 font-semibold"
                  style={{
                    color: EXPEDITION_THEME.textMuted,
                    fontSize: adaptiveLayout.fs(isTablet ? 6 : 5, 5, 8),
                  }}
                >
                  {text.missingTeam}
                </Text>
                <Text
                  className="font-bold text-right"
                  style={{
                    width: adaptiveLayout.s(isTablet ? 12 : 10, 9, 16),
                    color: EXPEDITION_THEME.textSubtle,
                    fontSize: adaptiveLayout.fs(isTablet ? 6 : 5, 5, 8),
                  }}
                >
                  —
                </Text>
              </View>
            );
          }

          const teamName = entry.name?.trim() || `#${entry.slotNumber}`;
          const badgeLabel = entry.badgeKey?.trim() || "🏁";
          const teamColorHex = resolveTeamColorHex(entry);
          const rowTextColor = resolveRowTextColor(teamColorHex);
          const rowMutedTextColor =
            rowTextColor === "#0f172a" ? "rgba(15, 23, 42, 0.72)" : "rgba(248, 250, 252, 0.86)";

          return (
            <View
              key={`compact-top-three-${entry.teamId}`}
              className="w-full flex-row items-center border"
              style={{
                flex: 1,
                marginTop: -1,
                marginBottom: index === podiumEntries.length - 1 ? -1 : 0,
                borderColor: entry.teamId === currentTeamId ? EXPEDITION_THEME.accentStrong : "rgba(255,255,255,0.28)",
                backgroundColor: teamColorHex,
              }}
            >
              <Text
                className="font-extrabold"
                style={{
                  width: adaptiveLayout.s(isTablet ? 10 : 8, 7, 13),
                  color: rowMutedTextColor,
                  fontSize: adaptiveLayout.fs(isTablet ? 6 : 5, 5, 8),
                }}
              >
                {entry.position}.
              </Text>
              {entry.badgeImageUrl ? (
                <Image
                  source={{ uri: entry.badgeImageUrl }}
                  resizeMode="cover"
                  style={{
                    width: adaptiveLayout.s(isTablet ? 7 : 6, 5, 10),
                    height: adaptiveLayout.s(isTablet ? 7 : 6, 5, 10),
                    borderRadius: adaptiveLayout.s(999, 999, 999),
                  }}
                />
              ) : (
                <Text
                  style={{
                    width: adaptiveLayout.s(isTablet ? 8 : 7, 6, 10),
                    color: rowTextColor,
                    fontSize: adaptiveLayout.fs(isTablet ? 7 : 6, 5, 9),
                  }}
                >
                  {badgeLabel}
                </Text>
              )}
              <Text
                numberOfLines={1}
                className="flex-1 font-semibold"
                style={{
                  color: rowTextColor,
                  fontSize: adaptiveLayout.fs(isTablet ? 6 : 5, 5, 8),
                }}
              >
                {truncateTeamName(teamName, isTablet ? 10 : 8)}
              </Text>
              <Text
                className="font-bold text-right"
                style={{
                  width: adaptiveLayout.s(isTablet ? 12 : 10, 9, 16),
                  color: rowTextColor,
                  fontSize: adaptiveLayout.fs(isTablet ? 6 : 5, 5, 8),
                }}
              >
                {entry.points}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  ) : (
    <View>
      <View
        className="rounded-lg border"
        style={{
          minHeight: adaptiveLayout.s(isTablet ? 44 : 36, 32, 56),
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panelMuted,
          paddingLeft: adaptiveLayout.s(isTablet ? 4 : 3, 2, 6),
          paddingRight: adaptiveLayout.s(1, 1, 3),
          paddingVertical: adaptiveLayout.s(1, 1, 3),
        }}
      >
        <View className="flex-row items-center gap-1">
          <View className="flex-1" style={{ rowGap: adaptiveLayout.s(1, 1, 2) }}>
            {podiumEntries.map((entry, index) => {
              if (!entry) {
                return (
                  <View
                    key={`top-three-empty-${index + 1}`}
                    className="w-full flex-row items-center rounded-md border"
                    style={{
                      minHeight: adaptiveLayout.s(isTablet ? 12 : 11, 10, 16),
                      borderColor: EXPEDITION_THEME.border,
                      backgroundColor: EXPEDITION_THEME.panelStrong,
                      paddingHorizontal: adaptiveLayout.s(isTablet ? 2 : 1, 1, 4),
                    }}
                  >
                    <Text
                      className="font-extrabold"
                      style={{
                        width: adaptiveLayout.s(isTablet ? 12 : 10, 8, 16),
                        color: EXPEDITION_THEME.textSubtle,
                        fontSize: adaptiveLayout.fs(isTablet ? 8 : 7, 6, 10),
                      }}
                    >
                      {index + 1}.
                    </Text>
                    <Text
                      style={{
                        fontSize: adaptiveLayout.fs(isTablet ? 9 : 8, 7, 11),
                        color: EXPEDITION_THEME.textMuted,
                        marginRight: adaptiveLayout.s(2, 2, 4),
                      }}
                    >
                      —
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="flex-1 font-semibold"
                      style={{
                        color: EXPEDITION_THEME.textMuted,
                        fontSize: adaptiveLayout.fs(isTablet ? 8 : 7, 6, 10),
                      }}
                    >
                      {text.missingTeam}
                    </Text>
                    <Text
                      className="font-bold text-right"
                      style={{
                        width: adaptiveLayout.s(isTablet ? 18 : 16, 14, 22),
                        color: EXPEDITION_THEME.textSubtle,
                        fontSize: adaptiveLayout.fs(isTablet ? 7 : 6, 6, 9),
                      }}
                    >
                      —
                    </Text>
                  </View>
                );
              }

              const teamName = entry.name?.trim() || `#${entry.slotNumber}`;
              const badgeLabel = entry.badgeKey?.trim() || "🏁";
              const teamColorHex = resolveTeamColorHex(entry);
              const rowTextColor = resolveRowTextColor(teamColorHex);
              const rowMutedTextColor =
                rowTextColor === "#0f172a" ? "rgba(15, 23, 42, 0.72)" : "rgba(248, 250, 252, 0.86)";

              return (
                <View
                  key={`top-three-${entry.teamId}`}
                  className="w-full flex-row items-center rounded-md border"
                  style={{
                    minHeight: adaptiveLayout.s(isTablet ? 12 : 11, 10, 16),
                    borderColor:
                      entry.teamId === currentTeamId ? EXPEDITION_THEME.accentStrong : "rgba(255,255,255,0.28)",
                    backgroundColor: teamColorHex,
                    paddingHorizontal: adaptiveLayout.s(isTablet ? 2 : 1, 1, 4),
                  }}
                >
                  <Text
                    className="font-extrabold"
                    style={{
                      width: adaptiveLayout.s(isTablet ? 12 : 10, 8, 16),
                      color: rowMutedTextColor,
                      fontSize: adaptiveLayout.fs(isTablet ? 8 : 7, 6, 10),
                    }}
                  >
                    {entry.position}.
                  </Text>
                  {entry.badgeImageUrl ? (
                    <Image
                      source={{ uri: entry.badgeImageUrl }}
                      resizeMode="cover"
                      style={{
                        width: adaptiveLayout.s(isTablet ? 10 : 9, 8, 12),
                        height: adaptiveLayout.s(isTablet ? 10 : 9, 8, 12),
                        borderRadius: adaptiveLayout.s(999, 999, 999),
                        marginRight: adaptiveLayout.s(2, 2, 4),
                      }}
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: adaptiveLayout.fs(isTablet ? 10 : 9, 8, 13),
                        color: rowTextColor,
                        marginRight: adaptiveLayout.s(2, 2, 4),
                      }}
                    >
                      {badgeLabel}
                    </Text>
                  )}
                  <Text
                    numberOfLines={1}
                    className="flex-1 font-semibold"
                    style={{
                      color: rowTextColor,
                      fontSize: adaptiveLayout.fs(isTablet ? 8 : 7, 6, 10),
                    }}
                  >
                    {truncateTeamName(teamName, isTablet ? 8 : 6)}
                  </Text>
                  <Text
                    className="font-bold text-right"
                    style={{
                      width: adaptiveLayout.s(isTablet ? 18 : 16, 14, 22),
                      color: rowTextColor,
                      fontSize: adaptiveLayout.fs(isTablet ? 7 : 6, 6, 9),
                    }}
                  >
                    {entry.points}
                  </Text>
                </View>
              );
            })}
          </View>

          <Pressable
            className="items-center justify-center rounded-lg active:opacity-80"
            style={{
              width: adaptiveLayout.s(isTablet ? 28 : 24, 22, 34),
              height: adaptiveLayout.s(isTablet ? 28 : 24, 22, 34),
              backgroundColor: EXPEDITION_THEME.panelStrong,
            }}
            onPress={() => setIsPopupVisible(true)}
          >
            <LeaderboardIcon
              color={EXPEDITION_THEME.accentStrong}
              size={adaptiveLayout.s(isTablet ? 16 : 14, 12, 20)}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <>
      {trigger}

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
                {sortedEntries.map((entry, index) => {
                  const isCurrentTeam = entry.teamId === currentTeamId;
                  const badgeLabel = entry.badgeKey?.trim() || "🏁";

                  return (
                    <View
                      key={`full-table-${entry.teamId}`}
                      className="flex-row items-center border-b px-3 py-2"
                      style={{
                        borderColor: EXPEDITION_THEME.border,
                        backgroundColor: isCurrentTeam
                          ? EXPEDITION_THEME.panelStrong
                          : index % 2 === 0
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
                        {entry.points}
                      </Text>
                    </View>
                  );
                })}
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
