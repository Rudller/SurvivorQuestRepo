import { Pressable, ScrollView, Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../../onboarding/model/constants";
import type { ExpeditionTaskStatus } from "../../model/types";
import type { StationTestMenuOverlayProps } from "./types";

function getStatusLabel(status: ExpeditionTaskStatus, quizFailed = false) {
  if (status === "failed") {
    return "Niezaliczone";
  }

  if (quizFailed && status !== "done") {
    return "Niezaliczone";
  }

  if (status === "done") {
    return "Ukończone";
  }

  if (status === "in-progress") {
    return "W trakcie";
  }

  return "Do zrobienia";
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
  onPreviewSuccessPopup,
  onPreviewFailedPopup,
}: StationTestMenuOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-40 items-center justify-center px-4" style={{ backgroundColor: "rgba(15, 25, 20, 0.78)" }}>
      <View
        className="w-full max-w-[560px] rounded-3xl border p-4"
        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              Menu testowe
            </Text>
            <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
              Lista pobrana z panelu admina dla aktywnej realizacji.
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
            Pokaż Welcome Screen
          </Text>
        </Pressable>
        <View className="mt-2 flex-row gap-2">
          <Pressable
            className="flex-1 rounded-xl border px-3 py-2 active:opacity-90"
            style={{ borderColor: "rgba(16, 185, 129, 0.45)", backgroundColor: "rgba(16, 185, 129, 0.16)" }}
            onPress={onPreviewSuccessPopup}
          >
            <Text className="text-xs font-semibold text-center" style={{ color: "#6ee7b7" }}>
              Pokaż popup zaliczone
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-xl border px-3 py-2 active:opacity-90"
            style={{ borderColor: "rgba(239, 68, 68, 0.45)", backgroundColor: "rgba(239, 68, 68, 0.16)" }}
            onPress={onPreviewFailedPopup}
          >
            <Text className="text-xs font-semibold text-center" style={{ color: "#fca5a5" }}>
              Pokaż popup niezaliczone
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
                  Brak stanowisk. Dodaj je w panelu admina.
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
                      <Text className="text-xs font-semibold text-zinc-950">Wejdź</Text>
                    </Pressable>
                  </View>
                  <Text className="mt-1 text-xs" style={{ color: getStatusColor(station.status, Boolean(station.quizFailed)) }}>
                    Status: {getStatusLabel(station.status, Boolean(station.quizFailed))}
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
