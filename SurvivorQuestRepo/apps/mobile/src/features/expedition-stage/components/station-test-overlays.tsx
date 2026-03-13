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
  timeLimitSeconds: number;
  timeLimitLabel: string;
  status: ExpeditionTaskStatus;
  startedAt: string | null;
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
  onStartTask?: (stationId: string) => Promise<string | null>;
  onCompleteTask?: (stationId: string, completionCode: string, startedAt?: string) => Promise<string | null>;
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

function formatRemainingTimeLabel(seconds: number) {
  if (seconds <= 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function StationPreviewOverlay({ station, onClose, onStartTask, onCompleteTask }: StationPreviewOverlayProps) {
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeResult, setCodeResult] = useState<string | null>(null);
  const [isStartingTask, setIsStartingTask] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
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
    setIsStartingTask(false);
    setIsSubmittingCode(false);
    setNowMs(Date.now());
  }, [station?.stationId]);

  useEffect(() => {
    if (!station || station.stationType !== "time" || !station.startedAt || station.status === "done") {
      return;
    }

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [station]);

  if (!station) {
    return null;
  }

  const isQuizStation = station.stationType === "quiz";
  const requiresCode = station.stationType === "time" || station.stationType === "points";
  const isTimeStation = station.stationType === "time";
  const hasTimerStarted = Boolean(station.startedAt);
  const remainingTimeLabel = (() => {
    if (!isTimeStation || !hasTimerStarted || station.timeLimitSeconds <= 0 || !station.startedAt) {
      return null;
    }

    const startedMs = new Date(station.startedAt).getTime();
    if (!Number.isFinite(startedMs)) {
      return null;
    }

    const elapsedSeconds = Math.max(0, Math.round((nowMs - startedMs) / 1000));
    const remainingSeconds = Math.max(0, station.timeLimitSeconds - elapsedSeconds);
    return formatRemainingTimeLabel(remainingSeconds);
  })();

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
            <Image source={{ uri: station.imageUrl }} style={{ height: 176, width: "100%", borderRadius: 16 }} resizeMode="cover" />

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
              {isTimeStation ? (
                <Text className="mt-1 text-xs font-semibold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                  Licznik: {remainingTimeLabel ?? (hasTimerStarted ? "w toku" : "nieuruchomiony")}
                </Text>
              ) : null}
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

                {isTimeStation && station.status !== "done" ? (
                  <Pressable
                    className="mt-2 items-center rounded-xl py-2.5 active:opacity-90"
                    style={{ backgroundColor: hasTimerStarted ? "rgba(120, 113, 108, 0.6)" : EXPEDITION_THEME.accent }}
                    disabled={hasTimerStarted || isStartingTask}
                    onPress={async () => {
                      if (!onStartTask) {
                        setCodeResult("Start timera dostępny po podpięciu API.");
                        return;
                      }

                      setIsStartingTask(true);
                      const error = await onStartTask(station.stationId);
                      setIsStartingTask(false);

                      if (error) {
                        setCodeResult(error);
                        return;
                      }

                      setCodeResult("Licznik zadania uruchomiony.");
                    }}
                  >
                    <Text className="text-sm font-semibold text-zinc-950">
                      {hasTimerStarted ? "Licznik uruchomiony" : isStartingTask ? "Uruchamianie..." : "Start zadania"}
                    </Text>
                  </Pressable>
                ) : null}

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
                  editable={station.status !== "done" && (!isTimeStation || hasTimerStarted)}
                  onChangeText={(value) => {
                    setVerificationCode(value);
                    setCodeResult(null);
                  }}
                />

                <Pressable
                  className="mt-3 items-center rounded-xl py-2.5 active:opacity-90"
                  style={{
                    backgroundColor:
                      station.status === "done" || (isTimeStation && !hasTimerStarted)
                        ? "rgba(120, 113, 108, 0.6)"
                        : EXPEDITION_THEME.accent,
                  }}
                  disabled={station.status === "done" || isSubmittingCode || (isTimeStation && !hasTimerStarted)}
                  onPress={async () => {
                    if (!verificationCode.trim()) {
                      setCodeResult("Wpisz kod, aby zatwierdzić stanowisko.");
                      return;
                    }

                    if (!onCompleteTask) {
                      setCodeResult("Kod zatwierdzony (tryb testowy).");
                      return;
                    }

                    setIsSubmittingCode(true);
                    const error = await onCompleteTask(station.stationId, verificationCode, station.startedAt ?? undefined);
                    setIsSubmittingCode(false);

                    if (error) {
                      setCodeResult(error);
                      return;
                    }

                    setCodeResult("Kod zatwierdzony.");
                  }}
                >
                  <Text className="text-sm font-semibold text-zinc-950">
                    {isSubmittingCode ? "Zatwierdzanie..." : "Zatwierdź kod"}
                  </Text>
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
