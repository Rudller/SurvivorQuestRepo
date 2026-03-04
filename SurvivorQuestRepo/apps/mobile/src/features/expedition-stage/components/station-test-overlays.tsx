import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { ExpeditionTaskStatus } from "../model/types";

export type StationTestType = "quiz" | "time" | "points";

export type StationTestViewModel = {
  stationId: string;
  stationType: StationTestType;
  name: string;
  typeLabel: string;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitLabel: string;
  status: ExpeditionTaskStatus;
};

type StationTestMenuOverlayProps = {
  visible: boolean;
  stations: StationTestViewModel[];
  onClose: () => void;
  onEnterStation: (stationId: string) => void;
};

type StationPreviewOverlayProps = {
  station: StationTestViewModel | null;
  onClose: () => void;
};

function getStatusLabel(status: ExpeditionTaskStatus) {
  if (status === "done") {
    return "Ukończone";
  }

  if (status === "in-progress") {
    return "W trakcie";
  }

  return "Do zrobienia";
}

function getStatusColor(status: ExpeditionTaskStatus) {
  if (status === "done") {
    return "#34d399";
  }

  if (status === "in-progress") {
    return "#fbbf24";
  }

  return EXPEDITION_THEME.textMuted;
}

function getCodePlaceholder(stationType: StationTestType) {
  return stationType === "time" ? "np. TIME-2048" : "np. POINTS-2048";
}

export function StationTestMenuOverlay({ visible, stations, onClose, onEnterStation }: StationTestMenuOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-40 items-center justify-center px-4" style={{ backgroundColor: "rgba(2, 7, 5, 0.72)" }}>
      <View
        className="w-full max-w-[560px] rounded-3xl border p-4"
        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              Menu testowe stanowisk
            </Text>
            <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
              Lista pobrana z panelu admina + dodatkowe stanowiska testowe mobile.
            </Text>
          </View>
          <Pressable
            className="rounded-full border px-3 py-1 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
          >
            <Text className="text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              Zamknij
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
                  <Text className="mt-1 text-xs" style={{ color: getStatusColor(station.status) }}>
                    Status: {getStatusLabel(station.status)}
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

export function StationPreviewOverlay({ station, onClose }: StationPreviewOverlayProps) {
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeResult, setCodeResult] = useState<string | null>(null);
  const quizOptions = useMemo(
    () => [
      "Sprawdzam komunikację i plan zespołu.",
      "Działam bez konsultacji z drużyną.",
      "Ignoruję zasady bezpieczeństwa.",
      "Rozdzielam zespół i tracę kontakt.",
    ],
    [],
  );

  useEffect(() => {
    setSelectedQuizOption(null);
    setQuizResult(null);
    setVerificationCode("");
    setCodeResult(null);
  }, [station?.stationId]);

  if (!station) {
    return null;
  }

  const isQuizStation = station.stationType === "quiz";
  const requiresCode = station.stationType === "time" || station.stationType === "points";

  return (
    <View className="absolute inset-0 z-50" style={{ backgroundColor: "rgba(2, 7, 5, 0.9)" }}>
      <View className="flex-1 px-3 pb-5 pt-9">
        <View className="flex-1 rounded-3xl border" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}>
          <View className="flex-row items-start justify-between gap-3 px-4 pb-2 pt-4">
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                Podgląd stanowiska
              </Text>
              <Text className="mt-1 text-base font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                Tryb testowy
              </Text>
            </View>
            <Pressable
              className="rounded-full border px-3 py-1 active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={onClose}
            >
              <Text className="text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                Zamknij
              </Text>
            </Pressable>
          </View>

          <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
            <Image source={{ uri: station.imageUrl }} className="h-44 w-full rounded-2xl" resizeMode="cover" />

            <View className="mt-3 flex-row items-start justify-between gap-2">
              <Text className="flex-1 text-lg font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {station.name}
              </Text>
              <View className="rounded-full border px-3 py-1" style={{ borderColor: EXPEDITION_THEME.border }}>
                <Text className="text-[11px]" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {station.typeLabel}
                </Text>
              </View>
            </View>

            <Text className="mt-2 text-sm leading-5" style={{ color: EXPEDITION_THEME.textMuted }}>
              {station.description}
            </Text>

            <View
              className="mt-3 rounded-2xl border px-3 py-2"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            >
              <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                Punkty: {station.points}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                Czas: {station.timeLimitLabel}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: getStatusColor(station.status) }}>
                Status drużyny: {getStatusLabel(station.status)}
              </Text>
            </View>

            {isQuizStation ? (
              <View
                className="mt-3 rounded-2xl border px-3 py-3"
                style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              >
                <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  Quiz: wybierz jedną z 4 odpowiedzi
                </Text>
                <View className="mt-2 gap-2">
                  {quizOptions.map((option, index) => {
                    const isSelected = selectedQuizOption === index;

                    return (
                      <Pressable
                        key={`${station.stationId}-quiz-${index}`}
                        className="rounded-xl border px-3 py-2 active:opacity-90"
                        style={{
                          borderColor: isSelected ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                          backgroundColor: isSelected ? "rgba(255, 217, 141, 0.18)" : "rgba(18, 34, 27, 0.7)",
                        }}
                        onPress={() => {
                          setSelectedQuizOption(index);
                          setQuizResult(null);
                        }}
                      >
                        <Text className="text-sm" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          {`${index + 1}. ${option}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  className="mt-3 items-center rounded-xl py-2.5 active:opacity-90"
                  style={{ backgroundColor: EXPEDITION_THEME.accent }}
                  onPress={() => {
                    if (selectedQuizOption === null) {
                      setQuizResult("Wybierz jedną odpowiedź przed zatwierdzeniem.");
                      return;
                    }

                    setQuizResult(`Zatwierdzono odpowiedź ${selectedQuizOption + 1}/4 (tryb testowy).`);
                  }}
                >
                  <Text className="text-sm font-semibold text-zinc-950">Zatwierdź odpowiedź</Text>
                </Pressable>

                {quizResult ? (
                  <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                    {quizResult}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {requiresCode ? (
              <View
                className="mt-3 rounded-2xl border px-3 py-3"
                style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              >
                <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {station.stationType === "time" ? "Time: potwierdź wykonanie kodem" : "Points: potwierdź wynik kodem"}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                  Wpisz kod i zatwierdź stanowisko.
                </Text>

                <TextInput
                  className="mt-2 rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: EXPEDITION_THEME.border,
                    backgroundColor: "rgba(18, 34, 27, 0.7)",
                    color: EXPEDITION_THEME.textPrimary,
                  }}
                  placeholder={getCodePlaceholder(station.stationType)}
                  placeholderTextColor={EXPEDITION_THEME.textSubtle}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={verificationCode}
                  onChangeText={(value) => {
                    setVerificationCode(value);
                    setCodeResult(null);
                  }}
                />

                <Pressable
                  className="mt-3 items-center rounded-xl py-2.5 active:opacity-90"
                  style={{ backgroundColor: EXPEDITION_THEME.accent }}
                  onPress={() => {
                    if (!verificationCode.trim()) {
                      setCodeResult("Wpisz kod, aby zatwierdzić stanowisko.");
                      return;
                    }

                    setCodeResult("Kod zatwierdzony (tryb testowy).");
                  }}
                >
                  <Text className="text-sm font-semibold text-zinc-950">Zatwierdź kod</Text>
                </Pressable>

                {codeResult ? (
                  <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                    {codeResult}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          <View className="px-4 pb-4">
            <Pressable
              className="items-center rounded-2xl py-3 active:opacity-90"
              style={{ backgroundColor: EXPEDITION_THEME.accent }}
              onPress={onClose}
            >
              <Text className="text-sm font-semibold text-zinc-950">Wróć do mapy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
