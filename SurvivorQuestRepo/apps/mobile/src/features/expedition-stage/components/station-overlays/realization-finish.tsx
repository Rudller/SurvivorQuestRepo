import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { EXPEDITION_THEME, TEAM_COLORS } from "../../../onboarding/model/constants";
import type { ExpeditionLeaderboardEntry } from "../../model/types";
import type { RealizationFinishOverlayProps } from "./types";

function resolveReasonLabel(reason: RealizationFinishOverlayProps["reason"]) {
  if (reason === "all-tasks-completed") {
    return "Wszystkie zadania Waszej drużyny zostały ukończone.";
  }

  if (reason === "time-expired") {
    return "Czas realizacji dobiegł końca.";
  }

  if (reason === "realization-finished") {
    return "Realizacja została zakończona przez organizatora.";
  }

  if (reason === "manual-preview") {
    return "Podgląd ekranu końcowego (tryb testowy).";
  }

  return "Realizacja została zakończona.";
}

function resolveReasonSubtitle(reason: RealizationFinishOverlayProps["reason"]) {
  if (reason === "all-tasks-completed") {
    return "Świetna robota! Jesteście na mecie.";
  }

  if (reason === "time-expired") {
    return "To był intensywny etap. Sprawdźcie końcowe wyniki.";
  }

  if (reason === "realization-finished") {
    return "Dziękujemy za udział. Czas na podsumowanie.";
  }

  if (reason === "manual-preview") {
    return "Podgląd wizualny ekranu końcowego.";
  }

  return "Dziękujemy za wspólną grę.";
}

function resolveCardTextColor(hexColor: string) {
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

function resolveTeamBannerPalette(entry: ExpeditionLeaderboardEntry) {
  const colorOption =
    TEAM_COLORS.find((color) => color.key === entry.color) ??
    TEAM_COLORS[(Math.max(1, entry.slotNumber) - 1) % TEAM_COLORS.length];
  const cardHex = colorOption?.hex ?? "#334155";
  const textColor = resolveCardTextColor(cardHex);
  const mutedTextColor = textColor === "#0f172a" ? "rgba(15, 23, 42, 0.72)" : "rgba(248, 250, 252, 0.86)";
  const iconBackground = textColor === "#0f172a" ? "rgba(255, 255, 255, 0.52)" : "rgba(15, 23, 42, 0.24)";

  return {
    cardHex,
    textColor,
    mutedTextColor,
    iconBackground,
  };
}

function resolvePositionMedal(position: number) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "🎖️";
}

type TeamBannerCardProps = {
  entry: ExpeditionLeaderboardEntry;
  isCurrentTeam: boolean;
  compact?: boolean;
};

function TeamBannerCard({ entry, isCurrentTeam, compact = false }: TeamBannerCardProps) {
  const palette = resolveTeamBannerPalette(entry);
  const badgeLabel = entry.badgeKey?.trim() || "🏁";
  const medal = resolvePositionMedal(entry.position);
  const safeProgressTotal = Math.max(0, Math.round(entry.progressTotal));
  const safeProgressDone = Math.max(0, Math.min(safeProgressTotal, Math.round(entry.progressDone)));
  const computedPercent =
    safeProgressTotal > 0 ? Math.round((safeProgressDone / safeProgressTotal) * 100) : 0;
  const safeProgressPercent = Math.max(0, Math.min(100, Math.round(entry.progressPercent || computedPercent)));

  return (
    <View
      className="rounded-2xl border px-3 py-2"
      style={{
        borderColor: isCurrentTeam ? "rgba(52, 211, 153, 0.72)" : "rgba(68, 98, 81, 0.78)",
        backgroundColor: palette.cardHex,
      }}
    >
      <View className="flex-row items-center gap-2">
        <View
          className="h-9 w-9 items-center justify-center rounded-lg border"
          style={{ borderColor: palette.iconBackground, backgroundColor: palette.iconBackground }}
        >
          {entry.badgeImageUrl ? (
            <Image
              source={{ uri: entry.badgeImageUrl }}
              resizeMode="cover"
              style={{ height: "100%", width: "100%", borderRadius: 8 }}
            />
          ) : (
            <Text className="text-lg">{badgeLabel}</Text>
          )}
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-1">
            <Text className={compact ? "text-sm" : "text-base"}>{medal}</Text>
            <Text className={compact ? "text-[13px] font-extrabold" : "text-[15px] font-extrabold"} style={{ color: palette.textColor }} numberOfLines={1}>
              {entry.name}
            </Text>
          </View>
          <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: palette.mutedTextColor }}>
            Drużyna {entry.slotNumber}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: palette.mutedTextColor }}>
            Punkty
          </Text>
          <Text className={compact ? "text-lg font-extrabold" : "text-xl font-extrabold"} style={{ color: palette.textColor }}>
            {entry.points}
          </Text>
        </View>
      </View>

      <View className="mt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: palette.mutedTextColor }}>
            Progres
          </Text>
          <Text className="text-[10px] font-semibold" style={{ color: palette.textColor }}>
            {safeProgressDone}/{safeProgressTotal} ({safeProgressPercent}%)
          </Text>
        </View>
        <View className="mt-1 h-1.5 rounded-full" style={{ backgroundColor: palette.iconBackground }}>
          <View
            className="h-1.5 rounded-full"
            style={{
              width: `${safeProgressPercent}%`,
              backgroundColor: isCurrentTeam ? "#6ee7b7" : palette.textColor,
            }}
          />
        </View>
      </View>
    </View>
  );
}

type TeamRankRowProps = {
  position: number;
  entry: ExpeditionLeaderboardEntry | null;
  isCurrentTeam: boolean;
  compact?: boolean;
};

function EmptyPodiumBanner({ position, compact = false }: { position: number; compact?: boolean }) {
  return (
    <View
      className="rounded-2xl border px-3 py-2"
      style={{
        borderColor: "rgba(68, 98, 81, 0.6)",
        backgroundColor: "rgba(31, 51, 42, 0.72)",
      }}
    >
      <View className="flex-row items-center gap-1">
        <Text className={compact ? "text-sm" : "text-base"}>{resolvePositionMedal(position)}</Text>
        <Text className={compact ? "text-[13px] font-semibold" : "text-[15px] font-semibold"} style={{ color: EXPEDITION_THEME.textMuted }}>
          Brak drużyny
        </Text>
      </View>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: EXPEDITION_THEME.textSubtle }}>
        Wolne miejsce podium
      </Text>
      <View className="mt-2 h-1.5 rounded-full" style={{ backgroundColor: "rgba(148, 163, 184, 0.2)" }} />
    </View>
  );
}

function TeamRankRow({ position, entry, isCurrentTeam, compact = false }: TeamRankRowProps) {
  return (
    <View className="flex-row items-stretch gap-2">
      <Text
        className={compact ? "text-lg font-extrabold" : "text-2xl font-extrabold"}
        style={{
          width: compact ? 30 : 40,
          textAlign: "center",
          textAlignVertical: "center",
          color: isCurrentTeam ? "#6ee7b7" : EXPEDITION_THEME.textPrimary,
        }}
      >
        #{position}
      </Text>
      <View style={{ flex: 1 }}>
        {entry ? (
          <TeamBannerCard entry={entry} isCurrentTeam={isCurrentTeam} compact={compact} />
        ) : (
          <EmptyPodiumBanner position={position} compact={compact} />
        )}
      </View>
    </View>
  );
}

export function RealizationFinishOverlay({
  visible,
  reason,
  endedAt,
  leaderboardEntries,
  currentTeamId,
  canClose,
  onClose,
}: RealizationFinishOverlayProps) {
  const { width } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const [isFullLeaderboardVisible, setIsFullLeaderboardVisible] = useState(false);
  const isTablet = width >= 900;
  const sortedEntries = useMemo(
    () =>
      [...leaderboardEntries].sort(
        (left, right) =>
          left.position - right.position ||
          right.points - left.points ||
          left.slotNumber - right.slotNumber,
      ),
    [leaderboardEntries],
  );
  const podiumEntries = useMemo(
    () => Array.from({ length: 3 }, (_, index) => sortedEntries[index] ?? null),
    [sortedEntries],
  );
  const currentTeamEntry = sortedEntries.find((entry) => entry.teamId === currentTeamId) ?? null;

  useEffect(() => {
    if (!visible) {
      setIsFullLeaderboardVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    fadeAnim.setValue(0);
    slideAnim.setValue(14);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-[70] items-center justify-center px-4" style={{ backgroundColor: "rgba(5, 10, 8, 0.85)" }}>
      <Animated.View
        className="w-full rounded-3xl border"
        style={{
          maxWidth: isTablet ? 1120 : 640,
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: "rgba(16, 31, 25, 0.97)",
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          padding: isTablet ? 28 : 18,
        }}
      >
        <Pressable
          className="absolute right-4 top-4 rounded-lg border px-3 py-1.5 active:opacity-90"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(31, 51, 42, 0.82)" }}
          onPress={() => setIsFullLeaderboardVisible(true)}
        >
          <Text
            className={isTablet ? "text-xs font-semibold uppercase tracking-wide" : "text-[11px] font-semibold uppercase tracking-wide"}
            style={{ color: EXPEDITION_THEME.textPrimary }}
          >
            Pełna tabela
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-2 pr-36">
          <Text className={isTablet ? "text-2xl" : "text-xl"}>🏆</Text>
          <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
            Koniec realizacji
          </Text>
        </View>

        <Text className={isTablet ? "mt-2 text-xl font-semibold" : "mt-2 text-base font-semibold"} style={{ color: EXPEDITION_THEME.textPrimary }}>
          {resolveReasonLabel(reason)}
        </Text>
        <Text className={isTablet ? "mt-1 text-sm" : "mt-1 text-xs"} style={{ color: EXPEDITION_THEME.textMuted }}>
          {resolveReasonSubtitle(reason)}
        </Text>
        {endedAt ? (
          <Text className={isTablet ? "mt-1 text-sm" : "mt-1 text-xs"} style={{ color: EXPEDITION_THEME.textMuted }}>
            Czas zakończenia: {new Date(endedAt).toLocaleString("pl-PL")}
          </Text>
        ) : null}

        <View className="mt-4">
          <Text className={isTablet ? "text-base font-semibold" : "text-sm font-semibold"} style={{ color: EXPEDITION_THEME.textPrimary }}>
            Top 3 drużyny
          </Text>
          <View className="mt-2 gap-2">
            {podiumEntries.map((entry, index) => (
              <TeamRankRow
                key={`podium-${index + 1}-${entry?.teamId ?? "empty"}`}
                position={index + 1}
                entry={entry}
                isCurrentTeam={Boolean(entry && entry.teamId === currentTeamId)}
                compact={!isTablet}
              />
            ))}
          </View>
        </View>

        <View className="mt-4 h-px" style={{ backgroundColor: EXPEDITION_THEME.border, opacity: 0.7 }} />

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-widest" style={{ color: "#6ee7b7" }}>
            Wasza drużyna
          </Text>
          {currentTeamEntry ? (
            <View className="mt-2">
              <TeamRankRow
                position={currentTeamEntry.position}
                entry={currentTeamEntry}
                isCurrentTeam
                compact={!isTablet}
              />
            </View>
          ) : (
            <Text className={isTablet ? "mt-2 text-sm" : "mt-2 text-xs"} style={{ color: EXPEDITION_THEME.textMuted }}>
              Wasza drużyna nie jest jeszcze widoczna w rankingu.
            </Text>
          )}
        </View>

        <Text
          className={isTablet ? "mt-5 text-base font-semibold" : "mt-4 text-sm font-semibold"}
          style={{ color: "#fde68a", textAlign: "center", lineHeight: isTablet ? 24 : 20 }}
        >
          Świetna robota! Po zakończeniu realizacji prosimy całą drużynę o powrót na miejsce startu,{" "}
          <Text style={{ fontWeight: "900" }}>oddanie tabletów organizatorowi</Text> oraz potwierdzenie zakończenia
          udziału. Dziękujemy za grę 💚
        </Text>

        {canClose ? (
          <Pressable
            className="mt-3 rounded-xl border px-3 py-2 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
          >
            <Text className={isTablet ? "text-center text-sm font-semibold" : "text-center text-xs font-semibold"} style={{ color: EXPEDITION_THEME.textPrimary }}>
              Zamknij podgląd
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>

      {isFullLeaderboardVisible ? (
        <View
          className="absolute inset-0 items-center justify-center px-4"
          style={{ backgroundColor: "rgba(4, 10, 8, 0.82)" }}
        >
          <View
            className="w-full overflow-hidden rounded-3xl border"
            style={{
              maxWidth: isTablet ? 1120 : 640,
              maxHeight: isTablet ? 760 : 600,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: "rgba(9, 20, 16, 0.98)",
            }}
          >
            <View className="border-b px-4 pb-3 pt-4" style={{ borderColor: EXPEDITION_THEME.border }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className={isTablet ? "text-lg font-extrabold uppercase tracking-widest" : "text-base font-extrabold uppercase tracking-wider"} style={{ color: "#86efac" }}>
                    Match Summary
                  </Text>
                  <Text className={isTablet ? "mt-1 text-base font-bold" : "mt-1 text-sm font-bold"} style={{ color: EXPEDITION_THEME.textPrimary }}>
                    📊 Pełna tabela wyników
                  </Text>
                </View>
                <Pressable
                  className="rounded-lg border px-3 py-1.5 active:opacity-90"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(24, 45, 37, 0.96)" }}
                  onPress={() => setIsFullLeaderboardVisible(false)}
                >
                  <Text className={isTablet ? "text-xs font-semibold uppercase tracking-wide" : "text-[11px] font-semibold uppercase tracking-wide"} style={{ color: EXPEDITION_THEME.textPrimary }}>
                    Zamknij
                  </Text>
                </Pressable>
              </View>
            </View>

            <View
              className="flex-row items-center border-b px-4 py-2"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: "rgba(24, 45, 37, 0.94)" }}
            >
              <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ width: 74, color: "#9ca3af" }}>
                Miejsce
              </Text>
              <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ flex: 1, color: "#9ca3af" }}>
                Drużyna
              </Text>
              <Text className="text-[11px] font-bold uppercase tracking-wide text-right" style={{ width: 96, color: "#9ca3af" }}>
                Progres
              </Text>
              <Text className="text-[11px] font-bold uppercase tracking-wide text-right" style={{ width: 84, color: "#9ca3af" }}>
                Punkty
              </Text>
            </View>

            {sortedEntries.length > 0 ? (
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
                {sortedEntries.map((entry, index) => {
                  const isCurrentTeam = entry.teamId === currentTeamId;
                  const safeProgressTotal = Math.max(0, Math.round(entry.progressTotal));
                  const safeProgressDone = Math.max(0, Math.min(safeProgressTotal, Math.round(entry.progressDone)));
                  const computedPercent =
                    safeProgressTotal > 0 ? Math.round((safeProgressDone / safeProgressTotal) * 100) : 0;
                  const safeProgressPercent = Math.max(
                    0,
                    Math.min(100, Math.round(entry.progressPercent || computedPercent)),
                  );
                  return (
                    <View
                      key={`full-table-${entry.teamId}`}
                      className="flex-row items-center border-b px-4 py-2.5"
                      style={{
                        borderColor: "rgba(68, 98, 81, 0.55)",
                        backgroundColor: isCurrentTeam
                          ? "rgba(20, 74, 57, 0.95)"
                          : index % 2 === 0
                            ? "rgba(16, 33, 27, 0.95)"
                            : "rgba(12, 26, 21, 0.95)",
                      }}
                    >
                      <View
                        className="absolute bottom-1 left-0 top-1 w-1 rounded-r"
                        style={{ backgroundColor: isCurrentTeam ? "#6ee7b7" : "transparent" }}
                      />
                      <Text className={isTablet ? "text-base font-extrabold" : "text-sm font-extrabold"} style={{ width: 74, color: isCurrentTeam ? "#6ee7b7" : EXPEDITION_THEME.textPrimary }}>
                        #{entry.position}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text className={isTablet ? "text-base font-bold" : "text-sm font-bold"} style={{ color: EXPEDITION_THEME.textPrimary }} numberOfLines={1}>
                          {resolvePositionMedal(entry.position)} {entry.name}
                        </Text>
                        <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: EXPEDITION_THEME.textMuted }}>
                          Drużyna {entry.slotNumber}
                        </Text>
                      </View>
                      <View style={{ width: 96 }}>
                        <Text className="text-right text-[11px] font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          {safeProgressDone}/{safeProgressTotal}
                        </Text>
                        <View className="mt-1 h-1.5 rounded-full" style={{ backgroundColor: "rgba(148, 163, 184, 0.25)" }}>
                          <View className="h-1.5 rounded-full" style={{ width: `${safeProgressPercent}%`, backgroundColor: isCurrentTeam ? "#6ee7b7" : "#93c5fd" }} />
                        </View>
                      </View>
                      <Text className={isTablet ? "text-lg font-extrabold" : "text-base font-extrabold"} style={{ width: 84, textAlign: "right", color: EXPEDITION_THEME.textPrimary }}>
                        {entry.points}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text className={isTablet ? "px-4 py-4 text-sm" : "px-4 py-3 text-xs"} style={{ color: EXPEDITION_THEME.textMuted }}>
                Brak danych do wyświetlenia tabeli wyników.
              </Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}
