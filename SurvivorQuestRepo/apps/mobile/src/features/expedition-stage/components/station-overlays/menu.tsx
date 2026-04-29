import { Pressable, ScrollView, Text, View } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../i18n";
import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../../onboarding/model/constants";
import type { ExpeditionTaskStatus } from "../../model/types";
import type { StationTestMenuOverlayProps } from "./types";

const STATION_TEST_MENU_TEXT: Record<
  UiLanguage,
  {
    title: string;
    description: string;
    openWelcome: string;
    openFinish: string;
    openPassedPopup: string;
    openFailedPopup: string;
    emptyStations: string;
    enter: string;
    status: string;
    failed: string;
    done: string;
    inProgress: string;
    todo: string;
  }
> = {
  polish: {
    title: "Menu testowe",
    description: "Lista pobrana z panelu admina dla aktywnej realizacji.",
    openWelcome: "Pokaż Welcome Screen",
    openFinish: "Pokaż ekran końcowy",
    openPassedPopup: "Pokaż popup zaliczone",
    openFailedPopup: "Pokaż popup niezaliczone",
    emptyStations: "Brak stanowisk. Dodaj je w panelu admina.",
    enter: "Wejdź",
    status: "Status",
    failed: "Niezaliczone",
    done: "Ukończone",
    inProgress: "W trakcie",
    todo: "Do zrobienia",
  },
  english: {
    title: "Test menu",
    description: "List fetched from the admin panel for the active realization.",
    openWelcome: "Show welcome screen",
    openFinish: "Show finish screen",
    openPassedPopup: "Show passed popup",
    openFailedPopup: "Show failed popup",
    emptyStations: "No stations. Add them in the admin panel.",
    enter: "Enter",
    status: "Status",
    failed: "Failed",
    done: "Completed",
    inProgress: "In progress",
    todo: "To do",
  },
  ukrainian: {
    title: "Тестове меню",
    description: "Список отримано з адмін-панелі для активної реалізації.",
    openWelcome: "Показати екран вітання",
    openFinish: "Показати фінальний екран",
    openPassedPopup: "Показати popup «зараховано»",
    openFailedPopup: "Показати popup «не зараховано»",
    emptyStations: "Немає станцій. Додайте їх в адмін-панелі.",
    enter: "Увійти",
    status: "Статус",
    failed: "Не зараховано",
    done: "Завершено",
    inProgress: "У процесі",
    todo: "До виконання",
  },
  russian: {
    title: "Тестовое меню",
    description: "Список получен из админ-панели для активной реализации.",
    openWelcome: "Показать экран приветствия",
    openFinish: "Показать финальный экран",
    openPassedPopup: "Показать popup «зачтено»",
    openFailedPopup: "Показать popup «не зачтено»",
    emptyStations: "Нет станций. Добавьте их в админ-панели.",
    enter: "Войти",
    status: "Статус",
    failed: "Не зачтено",
    done: "Завершено",
    inProgress: "В процессе",
    todo: "К выполнению",
  },
};

function getStatusLabel(
  status: ExpeditionTaskStatus,
  labels: Pick<(typeof STATION_TEST_MENU_TEXT)["polish"], "failed" | "done" | "inProgress" | "todo">,
  quizFailed = false,
) {
  if (status === "failed") {
    return labels.failed;
  }

  if (quizFailed && status !== "done") {
    return labels.failed;
  }

  if (status === "done") {
    return labels.done;
  }

  if (status === "in-progress") {
    return labels.inProgress;
  }

  return labels.todo;
}

function getStatusColor(status: ExpeditionTaskStatus, quizFailed = false) {
  if (status === "failed") {
    return "#fca5a5";
  }

  if (quizFailed && status !== "done") {
    return "#fca5a5";
  }

  if (status === "done") {
    return "#34d399";
  }

  if (status === "in-progress") {
    return "#fbbf24";
  }

  return EXPEDITION_THEME.textMuted;
}

export function StationTestMenuOverlay({
  visible,
  stations,
  onClose,
  onEnterStation,
  onOpenWelcomeScreen,
  onOpenFinishScreen,
  onPreviewSuccessPopup,
  onPreviewFailedPopup,
}: StationTestMenuOverlayProps) {
  const uiLanguage = useUiLanguage();
  const text = STATION_TEST_MENU_TEXT[uiLanguage];
  const isLightTheme = getExpeditionThemeMode() === "light";
  const accentButtonTextColor = isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background;

  if (!visible) {
    return null;
  }

  return (
    <View
      className="absolute inset-0 z-40 items-center justify-center px-4"
      style={{ backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(15, 25, 20, 0.78)" }}
    >
      <View
        className="w-full max-w-[560px] rounded-3xl border p-4"
        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.title}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
              {text.description}
            </Text>
          </View>
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full border active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
          >
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              ✕
            </Text>
          </Pressable>
        </View>

        <Pressable
          className="mt-3 rounded-xl border px-3 py-2 active:opacity-90"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
          onPress={onOpenWelcomeScreen}
        >
          <Text className="text-xs font-semibold" style={{ color: EXPEDITION_THEME.accentStrong }}>
            {text.openWelcome}
          </Text>
        </Pressable>
        <Pressable
          className="mt-2 rounded-xl border px-3 py-2 active:opacity-90"
          style={{ borderColor: "rgba(56, 189, 248, 0.45)", backgroundColor: "rgba(8, 47, 73, 0.35)" }}
          onPress={onOpenFinishScreen}
        >
          <Text className="text-xs font-semibold text-center" style={{ color: "#7dd3fc" }}>
            {text.openFinish}
          </Text>
        </Pressable>
        <View className="mt-2 flex-row gap-2">
          <Pressable
            className="flex-1 rounded-xl border px-3 py-2 active:opacity-90"
            style={{ borderColor: "rgba(16, 185, 129, 0.45)", backgroundColor: "rgba(16, 185, 129, 0.16)" }}
            onPress={onPreviewSuccessPopup}
          >
            <Text className="text-xs font-semibold text-center" style={{ color: "#6ee7b7" }}>
              {text.openPassedPopup}
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-xl border px-3 py-2 active:opacity-90"
            style={{ borderColor: "rgba(239, 68, 68, 0.45)", backgroundColor: "rgba(239, 68, 68, 0.16)" }}
            onPress={onPreviewFailedPopup}
          >
            <Text className="text-xs font-semibold text-center" style={{ color: "#fca5a5" }}>
              {text.openFailedPopup}
            </Text>
          </Pressable>
        </View>

        <ScrollView className="mt-3" style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          <View className="gap-2">
            {stations.length === 0 ? (
              <View
                className="rounded-2xl border px-3 py-3"
                style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              >
                <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {text.emptyStations}
                </Text>
              </View>
            ) : (
              stations.map((station) => (
                <View
                  key={station.stationId}
                  className="rounded-2xl border px-3 py-2"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                >
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                        {station.name}
                      </Text>
                      <Text className="mt-0.5 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                        {station.typeLabel}
                      </Text>
                    </View>
                    <Pressable
                      className="rounded-full px-3 py-1.5 active:opacity-90"
                      style={{ backgroundColor: EXPEDITION_THEME.accent }}
                      onPress={() => onEnterStation(station.stationId)}
                    >
                      <Text className="text-xs font-semibold" style={{ color: accentButtonTextColor }}>
                        {text.enter}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: getStatusColor(station.status, Boolean(station.quizFailed)) }}>
                    {text.status}:{" "}
                    {getStatusLabel(
                      station.status,
                      {
                        failed: text.failed,
                        done: text.done,
                        inProgress: text.inProgress,
                        todo: text.todo,
                      },
                      Boolean(station.quizFailed),
                    )}
                  </Text>
                </View>
                ))
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
