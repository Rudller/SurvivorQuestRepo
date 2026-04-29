import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../i18n";
import { EXPEDITION_THEME, TEAM_COLORS, getExpeditionThemeMode } from "../../../onboarding/model/constants";
import type { ExpeditionLeaderboardEntry } from "../../model/types";
import type { RealizationFinishOverlayProps } from "./types";

const REALIZATION_FINISH_TEXT: Record<
  UiLanguage,
  {
    reasonAllTasksCompleted: string;
    reasonTimeExpired: string;
    reasonRealizationFinished: string;
    reasonManualPreview: string;
    reasonDefault: string;
    subtitleAllTasksCompleted: string;
    subtitleTimeExpired: string;
    subtitleRealizationFinished: string;
    subtitleManualPreview: string;
    subtitleDefault: string;
    team: string;
    points: string;
    progress: string;
    emptyTeam: string;
    emptyPodiumSlot: string;
    fullTable: string;
    realizationEnd: string;
    endedAt: string;
    topThreeTeams: string;
    yourTeam: string;
    yourTeamUnavailable: string;
    finalInstruction: string;
    finalInstructionBold: string;
    finalInstructionSuffix: string;
    closePreview: string;
    matchSummary: string;
    fullResultsTable: string;
    close: string;
    place: string;
    noTableData: string;
  }
> = {
  polish: {
    reasonAllTasksCompleted: "Wszystkie zadania Waszej drużyny zostały ukończone.",
    reasonTimeExpired: "Czas realizacji dobiegł końca.",
    reasonRealizationFinished: "Realizacja została zakończona przez organizatora.",
    reasonManualPreview: "Podgląd ekranu końcowego (tryb testowy).",
    reasonDefault: "Realizacja została zakończona.",
    subtitleAllTasksCompleted: "Świetna robota! Jesteście na mecie.",
    subtitleTimeExpired: "To był intensywny etap. Sprawdźcie końcowe wyniki.",
    subtitleRealizationFinished: "Dziękujemy za udział. Czas na podsumowanie.",
    subtitleManualPreview: "Podgląd wizualny ekranu końcowego.",
    subtitleDefault: "Dziękujemy za wspólną grę.",
    team: "Drużyna",
    points: "Punkty",
    progress: "Progres",
    emptyTeam: "Brak drużyny",
    emptyPodiumSlot: "Wolne miejsce podium",
    fullTable: "Pełna tabela",
    realizationEnd: "Koniec realizacji",
    endedAt: "Czas zakończenia",
    topThreeTeams: "Top 3 drużyny",
    yourTeam: "Wasza drużyna",
    yourTeamUnavailable: "Dane Waszej drużyny nie są jeszcze dostępne.",
    finalInstruction: "Świetna robota! Po zakończeniu realizacji prosimy całą drużynę o powrót na miejsce startu,",
    finalInstructionBold: "oddanie tabletów organizatorowi",
    finalInstructionSuffix: "oraz potwierdzenie zakończenia udziału. Dziękujemy za grę 💚",
    closePreview: "Zamknij podgląd",
    matchSummary: "Podsumowanie",
    fullResultsTable: "📊 Pełna tabela wyników",
    close: "Zamknij",
    place: "Miejsce",
    noTableData: "Brak danych do wyświetlenia tabeli wyników.",
  },
  english: {
    reasonAllTasksCompleted: "All tasks for your team have been completed.",
    reasonTimeExpired: "The realization time has ended.",
    reasonRealizationFinished: "The realization was ended by the organizer.",
    reasonManualPreview: "Final screen preview (test mode).",
    reasonDefault: "The realization has ended.",
    subtitleAllTasksCompleted: "Great job! You reached the finish.",
    subtitleTimeExpired: "That was an intense stage. Check the final results.",
    subtitleRealizationFinished: "Thank you for participating. Time for a summary.",
    subtitleManualPreview: "Visual preview of the final screen.",
    subtitleDefault: "Thank you for playing together.",
    team: "Team",
    points: "Points",
    progress: "Progress",
    emptyTeam: "No team",
    emptyPodiumSlot: "Empty podium slot",
    fullTable: "Full table",
    realizationEnd: "Realization finished",
    endedAt: "End time",
    topThreeTeams: "Top 3 teams",
    yourTeam: "Your team",
    yourTeamUnavailable: "Your team data is not available yet.",
    finalInstruction: "Great job! After the realization ends, please return to the start point,",
    finalInstructionBold: "hand the tablets to the organizer",
    finalInstructionSuffix: "and confirm the end of participation. Thank you for playing 💚",
    closePreview: "Close preview",
    matchSummary: "Match summary",
    fullResultsTable: "📊 Full results table",
    close: "Close",
    place: "Place",
    noTableData: "No data to display in the results table.",
  },
  ukrainian: {
    reasonAllTasksCompleted: "Усі завдання вашої команди виконано.",
    reasonTimeExpired: "Час реалізації завершився.",
    reasonRealizationFinished: "Реалізацію завершено організатором.",
    reasonManualPreview: "Попередній перегляд фінального екрана (тестовий режим).",
    reasonDefault: "Реалізацію завершено.",
    subtitleAllTasksCompleted: "Чудова робота! Ви на фініші.",
    subtitleTimeExpired: "Це був насичений етап. Перегляньте фінальні результати.",
    subtitleRealizationFinished: "Дякуємо за участь. Час підсумків.",
    subtitleManualPreview: "Візуальний перегляд фінального екрана.",
    subtitleDefault: "Дякуємо за спільну гру.",
    team: "Команда",
    points: "Бали",
    progress: "Прогрес",
    emptyTeam: "Немає команди",
    emptyPodiumSlot: "Вільне місце на п'єдесталі",
    fullTable: "Повна таблиця",
    realizationEnd: "Кінець реалізації",
    endedAt: "Час завершення",
    topThreeTeams: "Топ 3 команди",
    yourTeam: "Ваша команда",
    yourTeamUnavailable: "Дані вашої команди ще недоступні.",
    finalInstruction: "Чудова робота! Після завершення реалізації просимо всю команду повернутися до місця старту,",
    finalInstructionBold: "передати планшети організатору",
    finalInstructionSuffix: "та підтвердити завершення участі. Дякуємо за гру 💚",
    closePreview: "Закрити перегляд",
    matchSummary: "Підсумок",
    fullResultsTable: "📊 Повна таблиця результатів",
    close: "Закрити",
    place: "Місце",
    noTableData: "Немає даних для відображення таблиці результатів.",
  },
  russian: {
    reasonAllTasksCompleted: "Все задания вашей команды выполнены.",
    reasonTimeExpired: "Время реализации истекло.",
    reasonRealizationFinished: "Реализация завершена организатором.",
    reasonManualPreview: "Предпросмотр финального экрана (тестовый режим).",
    reasonDefault: "Реализация завершена.",
    subtitleAllTasksCompleted: "Отличная работа! Вы на финише.",
    subtitleTimeExpired: "Это был интенсивный этап. Проверьте финальные результаты.",
    subtitleRealizationFinished: "Спасибо за участие. Время подвести итоги.",
    subtitleManualPreview: "Визуальный предпросмотр финального экрана.",
    subtitleDefault: "Спасибо за игру.",
    team: "Команда",
    points: "Очки",
    progress: "Прогресс",
    emptyTeam: "Нет команды",
    emptyPodiumSlot: "Свободное место на пьедестале",
    fullTable: "Полная таблица",
    realizationEnd: "Конец реализации",
    endedAt: "Время завершения",
    topThreeTeams: "Топ-3 команды",
    yourTeam: "Ваша команда",
    yourTeamUnavailable: "Данные вашей команды пока недоступны.",
    finalInstruction: "Отличная работа! После завершения реализации просим всю команду вернуться на место старта,",
    finalInstructionBold: "передать планшеты организатору",
    finalInstructionSuffix: "и подтвердить завершение участия. Спасибо за игру 💚",
    closePreview: "Закрыть просмотр",
    matchSummary: "Сводка",
    fullResultsTable: "📊 Полная таблица результатов",
    close: "Закрыть",
    place: "Место",
    noTableData: "Нет данных для отображения таблицы результатов.",
  },
};

const REALIZATION_FINISH_DATE_LOCALE: Record<UiLanguage, string> = {
  polish: "pl-PL",
  english: "en-US",
  ukrainian: "uk-UA",
  russian: "ru-RU",
};

type RealizationFinishText = (typeof REALIZATION_FINISH_TEXT)["polish"];

function resolveReasonLabel(reason: RealizationFinishOverlayProps["reason"], text: RealizationFinishText) {
  if (reason === "all-tasks-completed") {
    return text.reasonAllTasksCompleted;
  }

  if (reason === "time-expired") {
    return text.reasonTimeExpired;
  }

  if (reason === "realization-finished") {
    return text.reasonRealizationFinished;
  }

  if (reason === "manual-preview") {
    return text.reasonManualPreview;
  }

  return text.reasonDefault;
}

function resolveReasonSubtitle(reason: RealizationFinishOverlayProps["reason"], text: RealizationFinishText) {
  if (reason === "all-tasks-completed") {
    return text.subtitleAllTasksCompleted;
  }

  if (reason === "time-expired") {
    return text.subtitleTimeExpired;
  }

  if (reason === "realization-finished") {
    return text.subtitleRealizationFinished;
  }

  if (reason === "manual-preview") {
    return text.subtitleManualPreview;
  }

  return text.subtitleDefault;
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
  showMedal?: boolean;
  text: RealizationFinishText;
};

function TeamBannerCard({
  entry,
  isCurrentTeam,
  compact = false,
  showMedal = true,
  text,
}: TeamBannerCardProps) {
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
        borderColor: isCurrentTeam ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
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
            {showMedal ? <Text className={compact ? "text-sm" : "text-base"}>{medal}</Text> : null}
            <Text className={compact ? "text-[13px] font-extrabold" : "text-[15px] font-extrabold"} style={{ color: palette.textColor }} numberOfLines={1}>
              {entry.name}
            </Text>
          </View>
          <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: palette.mutedTextColor }}>
            {text.team} {entry.slotNumber}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: palette.mutedTextColor }}>
            {text.points}
          </Text>
          <Text className={compact ? "text-lg font-extrabold" : "text-xl font-extrabold"} style={{ color: palette.textColor }}>
            {entry.points}
          </Text>
        </View>
      </View>

      <View className="mt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: palette.mutedTextColor }}>
            {text.progress}
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
              backgroundColor: isCurrentTeam ? EXPEDITION_THEME.accentStrong : palette.textColor,
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
  text: RealizationFinishText;
};

function EmptyPodiumBanner({
  position,
  compact = false,
  text,
}: {
  position: number;
  compact?: boolean;
  text: RealizationFinishText;
}) {
  return (
    <View
      className="rounded-2xl border px-3 py-2"
      style={{
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: EXPEDITION_THEME.panelMuted,
      }}
    >
      <View className="flex-row items-center gap-1">
        <Text className={compact ? "text-sm" : "text-base"}>{resolvePositionMedal(position)}</Text>
        <Text className={compact ? "text-[13px] font-semibold" : "text-[15px] font-semibold"} style={{ color: EXPEDITION_THEME.textMuted }}>
          {text.emptyTeam}
        </Text>
      </View>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: EXPEDITION_THEME.textSubtle }}>
        {text.emptyPodiumSlot}
      </Text>
      <View className="mt-2 h-1.5 rounded-full" style={{ backgroundColor: EXPEDITION_THEME.border }} />
    </View>
  );
}

function TeamRankRow({ position, entry, isCurrentTeam, compact = false, text }: TeamRankRowProps) {
  return (
    <View className="flex-row items-stretch gap-2">
      <Text
        className={compact ? "text-lg font-extrabold" : "text-2xl font-extrabold"}
        style={{
          width: compact ? 30 : 40,
          textAlign: "center",
          textAlignVertical: "center",
          color: isCurrentTeam ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.textPrimary,
        }}
      >
        #{position}
      </Text>
      <View style={{ flex: 1 }}>
        {entry ? (
          <TeamBannerCard entry={entry} isCurrentTeam={isCurrentTeam} compact={compact} text={text} />
        ) : (
          <EmptyPodiumBanner position={position} compact={compact} text={text} />
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
  showLeaderboard,
  canClose,
  onClose,
}: RealizationFinishOverlayProps) {
  const uiLanguage = useUiLanguage();
  const text = REALIZATION_FINISH_TEXT[uiLanguage];
  const dateLocale = REALIZATION_FINISH_DATE_LOCALE[uiLanguage];
  const isLightTheme = getExpeditionThemeMode() === "light";
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
    if (!visible || !showLeaderboard) {
      setIsFullLeaderboardVisible(false);
    }
  }, [showLeaderboard, visible]);

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
    <View
      className="absolute inset-0 z-[70] items-center justify-center px-4"
      style={{ backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(0, 0, 0, 0.56)" }}
    >
      <Animated.View
        className="w-full rounded-3xl border"
        style={{
          maxWidth: isTablet ? 1120 : 640,
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panel,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          padding: isTablet ? 28 : 18,
        }}
      >
        {showLeaderboard ? (
          <Pressable
            className="absolute right-4 top-4 rounded-lg border px-3 py-1.5 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
            onPress={() => setIsFullLeaderboardVisible(true)}
          >
            <Text
              className={isTablet ? "text-xs font-semibold uppercase tracking-wide" : "text-[11px] font-semibold uppercase tracking-wide"}
              style={{ color: EXPEDITION_THEME.textPrimary }}
            >
              {text.fullTable}
            </Text>
          </Pressable>
        ) : null}

        <View className={`flex-row items-center gap-2 ${showLeaderboard ? "pr-36" : ""}`}>
          <Text className={isTablet ? "text-2xl" : "text-xl"}>🏆</Text>
          <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
            {text.realizationEnd}
          </Text>
        </View>

        <Text className={isTablet ? "mt-2 text-xl font-semibold" : "mt-2 text-base font-semibold"} style={{ color: EXPEDITION_THEME.textPrimary }}>
          {resolveReasonLabel(reason, text)}
        </Text>
        <Text className={isTablet ? "mt-1 text-sm" : "mt-1 text-xs"} style={{ color: EXPEDITION_THEME.textMuted }}>
          {resolveReasonSubtitle(reason, text)}
        </Text>
        {endedAt ? (
          <Text className={isTablet ? "mt-1 text-sm" : "mt-1 text-xs"} style={{ color: EXPEDITION_THEME.textMuted }}>
            {text.endedAt}: {new Date(endedAt).toLocaleString(dateLocale)}
          </Text>
        ) : null}

        {showLeaderboard ? (
          <View className="mt-4">
            <Text className={isTablet ? "text-base font-semibold" : "text-sm font-semibold"} style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.topThreeTeams}
            </Text>
            <View className="mt-2 gap-2">
              {podiumEntries.map((entry, index) => (
                <TeamRankRow
                  key={`podium-${index + 1}-${entry?.teamId ?? "empty"}`}
                  position={index + 1}
                  entry={entry}
                  isCurrentTeam={Boolean(entry && entry.teamId === currentTeamId)}
                  compact={!isTablet}
                  text={text}
                />
              ))}
            </View>
          </View>
        ) : null}

        {showLeaderboard ? (
          <View className="mt-4 h-px" style={{ backgroundColor: EXPEDITION_THEME.border, opacity: 0.7 }} />
        ) : null}

        <View className="mt-4">
          <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
            {text.yourTeam}
          </Text>
          {currentTeamEntry ? (
            <View className="mt-2">
              {showLeaderboard ? (
                <TeamRankRow
                  position={currentTeamEntry.position}
                  entry={currentTeamEntry}
                  isCurrentTeam
                  compact={!isTablet}
                  text={text}
                />
              ) : (
                <TeamBannerCard
                  entry={currentTeamEntry}
                  isCurrentTeam
                  compact={!isTablet}
                  showMedal={false}
                  text={text}
                />
              )}
            </View>
          ) : (
            <Text className={isTablet ? "mt-2 text-sm" : "mt-2 text-xs"} style={{ color: EXPEDITION_THEME.textMuted }}>
              {text.yourTeamUnavailable}
            </Text>
          )}
        </View>

        <Text
          className={isTablet ? "mt-5 text-base font-semibold" : "mt-4 text-sm font-semibold"}
          style={{ color: EXPEDITION_THEME.accentStrong, textAlign: "center", lineHeight: isTablet ? 24 : 20 }}
        >
          {text.finalInstruction}{" "}
          <Text style={{ fontWeight: "900" }}>{text.finalInstructionBold}</Text> {text.finalInstructionSuffix}
        </Text>

        {canClose ? (
          <Pressable
            className="mt-3 rounded-xl border px-3 py-2 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
          >
            <Text className={isTablet ? "text-center text-sm font-semibold" : "text-center text-xs font-semibold"} style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.closePreview}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>

      {showLeaderboard && isFullLeaderboardVisible ? (
        <View
          className="absolute inset-0 items-center justify-center px-4"
          style={{ backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(4, 10, 8, 0.82)" }}
        >
          <View
            className="w-full overflow-hidden rounded-3xl border"
            style={{
              maxWidth: isTablet ? 1120 : 640,
              maxHeight: isTablet ? 760 : 600,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
          >
            <View className="border-b px-4 pb-3 pt-4" style={{ borderColor: EXPEDITION_THEME.border }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className={isTablet ? "text-lg font-extrabold uppercase tracking-widest" : "text-base font-extrabold uppercase tracking-wider"} style={{ color: EXPEDITION_THEME.accentStrong }}>
                    {text.matchSummary}
                  </Text>
                  <Text className={isTablet ? "mt-1 text-base font-bold" : "mt-1 text-sm font-bold"} style={{ color: EXPEDITION_THEME.textPrimary }}>
                    {text.fullResultsTable}
                  </Text>
                </View>
                <Pressable
                  className="rounded-lg border px-3 py-1.5 active:opacity-90"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
                  onPress={() => setIsFullLeaderboardVisible(false)}
                >
                  <Text className={isTablet ? "text-xs font-semibold uppercase tracking-wide" : "text-[11px] font-semibold uppercase tracking-wide"} style={{ color: EXPEDITION_THEME.textPrimary }}>
                    {text.close}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View
              className="flex-row items-center border-b px-4 py-2"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
            >
              <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ width: 74, color: EXPEDITION_THEME.textSubtle }}>
                {text.place}
              </Text>
              <Text className="text-[11px] font-bold uppercase tracking-wide" style={{ flex: 1, color: EXPEDITION_THEME.textSubtle }}>
                {text.team}
              </Text>
              <Text className="text-[11px] font-bold uppercase tracking-wide text-right" style={{ width: 96, color: EXPEDITION_THEME.textSubtle }}>
                {text.progress}
              </Text>
              <Text className="text-[11px] font-bold uppercase tracking-wide text-right" style={{ width: 84, color: EXPEDITION_THEME.textSubtle }}>
                {text.points}
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
                        borderColor: EXPEDITION_THEME.border,
                        backgroundColor: isCurrentTeam
                          ? EXPEDITION_THEME.panelStrong
                          : index % 2 === 0
                            ? EXPEDITION_THEME.panelMuted
                            : EXPEDITION_THEME.panel,
                      }}
                    >
                      <View
                        className="absolute bottom-1 left-0 top-1 w-1 rounded-r"
                        style={{ backgroundColor: isCurrentTeam ? EXPEDITION_THEME.accentStrong : "transparent" }}
                      />
                      <Text className={isTablet ? "text-base font-extrabold" : "text-sm font-extrabold"} style={{ width: 74, color: isCurrentTeam ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.textPrimary }}>
                        #{entry.position}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text className={isTablet ? "text-base font-bold" : "text-sm font-bold"} style={{ color: EXPEDITION_THEME.textPrimary }} numberOfLines={1}>
                          {resolvePositionMedal(entry.position)} {entry.name}
                        </Text>
                        <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {text.team} {entry.slotNumber}
                        </Text>
                      </View>
                      <View style={{ width: 96 }}>
                        <Text className="text-right text-[11px] font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          {safeProgressDone}/{safeProgressTotal}
                        </Text>
                        <View className="mt-1 h-1.5 rounded-full" style={{ backgroundColor: EXPEDITION_THEME.border }}>
                          <View
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${safeProgressPercent}%`,
                              backgroundColor: isCurrentTeam ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.accent,
                            }}
                          />
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
                {text.noTableData}
              </Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}
