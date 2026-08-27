import { Pressable, ScrollView, Text, View } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../i18n";
import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../../onboarding/model/constants";
import type { ExpeditionTaskStatus } from "../../model/types";
import { useAdaptiveLayout } from "../../../../shared/layout/use-adaptive-layout";
import type { StationTestMenuOverlayProps } from "./types";

const STATION_TEST_MENU_TEXT: Record<
  UiLanguage,
  {
    title: string;
    description: string;
    openWelcome: string;
    openFinish: string;
    exitRealization: string;
    emptyStations: string;
    enter: string;
    status: string;
    failed: string;
    done: string;
    inProgress: string;
    todo: string;
    showFeedbackPopups: string;
  }
> = {
  polish: {
    title: "Menu testowe",
    description: "Lista pobrana z panelu admina dla aktywnej realizacji.",
    openWelcome: "Pokaż Welcome Screen",
    openFinish: "Pokaż ekran końcowy",
    exitRealization: "Wyjdź z realizacji",
    emptyStations: "Brak stanowisk. Dodaj je w panelu admina.",
    enter: "Wejdź",
    status: "Status",
    failed: "Niezaliczone",
    done: "Ukończone",
    inProgress: "W trakcie",
    todo: "Do zrobienia",
    showFeedbackPopups: "Pokazuj popupy informacyjne (np. „zadanie niezaliczone”)",
  },
  english: {
    title: "Test menu",
    description: "List fetched from the admin panel for the active realization.",
    openWelcome: "Show welcome screen",
    openFinish: "Show finish screen",
    exitRealization: "Exit realization",
    emptyStations: "No stations. Add them in the admin panel.",
    enter: "Enter",
    status: "Status",
    failed: "Failed",
    done: "Completed",
    inProgress: "In progress",
    todo: "To do",
    showFeedbackPopups: "Show info popups (e.g. \"task failed\")",
  },
  ukrainian: {
    title: "Тестове меню",
    description: "Список отримано з адмін-панелі для активної реалізації.",
    openWelcome: "Показати екран вітання",
    openFinish: "Показати фінальний екран",
    exitRealization: "Вийти з реалізації",
    emptyStations: "Немає станцій. Додайте їх в адмін-панелі.",
    enter: "Увійти",
    status: "Статус",
    failed: "Не зараховано",
    done: "Завершено",
    inProgress: "У процесі",
    todo: "До виконання",
    showFeedbackPopups: "Показувати інформаційні popup (напр. «завдання не зараховано»)",
  },
  russian: {
    title: "Тестовое меню",
    description: "Список получен из админ-панели для активной реализации.",
    openWelcome: "Показать экран приветствия",
    openFinish: "Показать финальный экран",
    exitRealization: "Выйти из реализации",
    emptyStations: "Нет станций. Добавьте их в админ-панели.",
    enter: "Войти",
    status: "Статус",
    failed: "Не зачтено",
    done: "Завершено",
    inProgress: "В процессе",
    todo: "К выполнению",
    showFeedbackPopups: "Показывать информационные popup (напр. «задание не зачтено»)",
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
  onExitRealization,
  isFeedbackPopupEnabled,
  onToggleFeedbackPopupEnabled,
}: StationTestMenuOverlayProps) {
  const uiLanguage = useUiLanguage();
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
  const text = STATION_TEST_MENU_TEXT[uiLanguage];
  const isLightTheme = getExpeditionThemeMode() === "light";
  const accentButtonTextColor = isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background;
  const overlayPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 16 : 10, 8, 20);
  const panelMaxWidth = adaptiveLayout.s(isTabletLayout ? 720 : 680, 620, 780);
  const panelPadding = adaptiveLayout.s(isTabletLayout ? 22 : 20, 16, 26);
  const titleFontSize = adaptiveLayout.fs(isTabletLayout ? 18 : 16, 14, 20);
  const descriptionFontSize = adaptiveLayout.fs(isTabletLayout ? 14 : 13, 12, 15);
  const closeButtonSize = adaptiveLayout.hit(isTabletLayout ? 40 : 34);
  const quickButtonPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 16 : 14, 12, 18);
  const quickButtonPaddingVertical = adaptiveLayout.s(isTabletLayout ? 12 : 10, 9, 14);
  const quickButtonFontSize = adaptiveLayout.fs(isTabletLayout ? 14 : 13, 12, 15);
  const scrollMaxHeight = adaptiveLayout.s(isTabletLayout ? 460 : 420, 380, 520);
  const checkboxSize = adaptiveLayout.hit(isTabletLayout ? 24 : 22);
  const checkboxLabelFontSize = adaptiveLayout.fs(isTabletLayout ? 13 : 12, 11, 14);
  const stationCardPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 14 : 12, 12, 16);
  const stationCardPaddingVertical = adaptiveLayout.s(isTabletLayout ? 11 : 8, 8, 12);
  const stationNameFontSize = adaptiveLayout.fs(isTabletLayout ? 15 : 14, 13, 17);
  const stationMetaFontSize = adaptiveLayout.fs(isTabletLayout ? 13 : 12, 11, 14);
  const enterButtonPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 16 : 12, 12, 18);
  const enterButtonPaddingVertical = adaptiveLayout.s(isTabletLayout ? 8 : 6, 6, 9);

  if (!visible) {
    return null;
  }

  return (
    <View
      className="absolute inset-0 z-40 items-center justify-center"
      style={{ paddingHorizontal: overlayPaddingHorizontal, backgroundColor: isLightTheme ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)` : `rgba(${EXPEDITION_THEME.scrimDeepRgb}, 0.78)` }}
    >
      <View
        className="w-full rounded-3xl border"
        style={{ maxWidth: panelMaxWidth, padding: panelPadding, borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: titleFontSize }}>
              {text.title}
            </Text>
            <Text className="mt-1" style={{ color: EXPEDITION_THEME.textMuted, fontSize: descriptionFontSize }}>
              {text.description}
            </Text>
          </View>
          <Pressable
            className="items-center justify-center rounded-full border active:opacity-90"
            style={{ width: closeButtonSize, height: closeButtonSize, borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
          >
            <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: titleFontSize }}>
              ✕
            </Text>
          </Pressable>
        </View>

        <Pressable
          className="mt-3 rounded-xl border active:opacity-90"
          style={{ paddingHorizontal: quickButtonPaddingHorizontal, paddingVertical: quickButtonPaddingVertical, borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
          onPress={onOpenWelcomeScreen}
        >
          <Text className="font-semibold" style={{ color: EXPEDITION_THEME.accentStrong, fontSize: quickButtonFontSize }}>
            {text.openWelcome}
          </Text>
        </Pressable>
        <Pressable
          className="mt-2 rounded-xl border active:opacity-90"
          style={{ paddingHorizontal: quickButtonPaddingHorizontal, paddingVertical: quickButtonPaddingVertical, borderColor: "rgba(56, 189, 248, 0.45)", backgroundColor: "rgba(8, 47, 73, 0.35)" }}
          onPress={onOpenFinishScreen}
        >
          <Text className="font-semibold text-center" style={{ color: "#7dd3fc", fontSize: quickButtonFontSize }}>
            {text.openFinish}
          </Text>
        </Pressable>
        <Pressable
          className="mt-2 rounded-xl border active:opacity-90"
          style={{ paddingHorizontal: quickButtonPaddingHorizontal, paddingVertical: quickButtonPaddingVertical, borderColor: "rgba(248, 113, 113, 0.55)", backgroundColor: "rgba(127, 29, 29, 0.3)" }}
          onPress={onExitRealization}
        >
          <Text className="font-semibold text-center" style={{ color: "#fca5a5", fontSize: quickButtonFontSize }}>
            {text.exitRealization}
          </Text>
        </Pressable>

        <Pressable
          className="mt-3 flex-row items-center gap-2 active:opacity-80"
          onPress={onToggleFeedbackPopupEnabled}
        >
          <View
            className="items-center justify-center rounded-md border"
            style={{
              width: checkboxSize,
              height: checkboxSize,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: isFeedbackPopupEnabled ? EXPEDITION_THEME.accent : "transparent",
            }}
          >
            {isFeedbackPopupEnabled ? (
              <Text className="font-semibold" style={{ color: accentButtonTextColor, fontSize: checkboxLabelFontSize }}>
                ✓
              </Text>
            ) : null}
          </View>
          <Text className="flex-1" style={{ color: EXPEDITION_THEME.textMuted, fontSize: checkboxLabelFontSize }}>
            {text.showFeedbackPopups}
          </Text>
        </Pressable>

        <ScrollView className="mt-3" style={{ maxHeight: scrollMaxHeight }} showsVerticalScrollIndicator={false}>
          <View className="gap-2">
            {stations.length === 0 ? (
              <View
                className="rounded-2xl border"
                style={{ paddingHorizontal: stationCardPaddingHorizontal, paddingVertical: stationCardPaddingVertical, borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              >
                <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: stationMetaFontSize }}>
                  {text.emptyStations}
                </Text>
              </View>
            ) : (
              stations.map((station) => (
                <View
                  key={station.stationId}
                  className="rounded-2xl border"
                  style={{ paddingHorizontal: stationCardPaddingHorizontal, paddingVertical: stationCardPaddingVertical, borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                >
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: stationNameFontSize }}>
                        {station.name}
                      </Text>
                      <Text className="mt-0.5" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: stationMetaFontSize }}>
                        {station.typeLabel}
                      </Text>
                    </View>
                    <Pressable
                      className="rounded-full active:opacity-90"
                      style={{ paddingHorizontal: enterButtonPaddingHorizontal, paddingVertical: enterButtonPaddingVertical, backgroundColor: EXPEDITION_THEME.accent }}
                      onPress={() => onEnterStation(station.stationId)}
                    >
                      <Text className="font-semibold" style={{ color: accentButtonTextColor, fontSize: quickButtonFontSize }}>
                        {text.enter}
                      </Text>
                    </Pressable>
                  </View>
                  <Text className="mt-1" style={{ color: getStatusColor(station.status, Boolean(station.quizFailed)), fontSize: stationMetaFontSize }}>
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
