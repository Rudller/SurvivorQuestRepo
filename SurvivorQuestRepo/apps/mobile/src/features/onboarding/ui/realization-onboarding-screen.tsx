import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Animated,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { EXPEDITION_THEME, TEAM_COLORS, TEAM_ICONS } from "../model/constants";
import type { Screen, TeamColor } from "../model/types";

type SetupState = "idle" | "loading" | "ready" | "error";

type MobileBootstrapRealization = {
  id: string;
  companyName: string;
  status: "planned" | "in-progress" | "done";
  scheduledAt: string;
  joinCode: string;
  teamCount: number;
  stationIds: string[];
};

type MobileBootstrapResponse = {
  serverTime: string;
  teamColors: string[];
  badgeKeys: string[];
  realizations: MobileBootstrapRealization[];
};

type MobileJoinResponse = {
  sessionToken: string;
  realizationId: string;
  locationRequired: boolean;
  team: {
    id: string;
    slotNumber: number;
    name: string | null;
    color: string | null;
    badgeKey: string | null;
    points: number;
  };
};

type MobileClaimResponse = {
  teamId: string;
  name: string;
  color: string | null;
  badgeKey: string | null;
  changedFields: string[];
};

type MobileSelectTeamResponse = {
  team: {
    id: string;
    slotNumber: number;
    name: string | null;
    color: string | null;
    badgeKey: string | null;
    points: number;
  };
};

type MobileApiError = {
  message?: string;
};

const OFFLINE_TEST_SESSION_TOKEN = "offline-test-session";

const TOP_PANEL_STEP_ORDER: Screen[] = ["code", "team"];

const STEP_LABEL: Record<Screen, string> = {
  code: "Kod realizacji",
  team: "Auto-przydział drużyny",
  customize: "Personalizacja",
};

const STEP_HINT: Record<Screen, string> = {
  code: "Etap 1 jest inicjalizowany kodem realizacji od administratora.",
  team: "Etap 2 automatycznie przypisuje pierwszą dostępną drużynę.",
  customize: "Etap 3 jest przeznaczony dla użytkownika końcowego.",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Wystąpił nieoczekiwany błąd połączenia.";
}

function formatScheduledAt(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pl-PL");
}

function resolveApiBaseUrlCandidates() {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (envBaseUrl) {
    return [envBaseUrl.replace(/\/+$/, "")];
  }

  let protocol = "http:";
  let host = "";

  if (Platform.OS === "web" && typeof window !== "undefined") {
    protocol = window.location.protocol === "https:" ? "https:" : "http:";
    host = window.location.hostname;
  }

  if (!host) {
    const scriptUrl = NativeModules?.SourceCode?.scriptURL as string | undefined;

    if (typeof scriptUrl === "string" && scriptUrl.trim().length > 0) {
      try {
        const parsed = new URL(scriptUrl);
        const scriptHost = parsed.hostname?.trim();

        if (!scriptHost) {
          return [];
        }

        host =
          Platform.OS === "android" && (scriptHost === "localhost" || scriptHost === "127.0.0.1")
            ? "10.0.2.2"
            : scriptHost;

        protocol =
          parsed.protocol === "exps:"
            ? "https:"
            : parsed.protocol === "exp:"
              ? "http:"
              : parsed.protocol === "https:"
                ? "https:"
                : "http:";
      } catch {
        return [];
      }
    }
  }

  if (!host) {
    return [];
  }

  const ports = [3000, 3001, 3002];
  return ports.map((port) => `${protocol}//${host}:${port}`);
}

async function requestMobileApi<T>(baseUrl: string, path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & MobileApiError;

  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `HTTP ${response.status}`);
  }

  return data as T;
}

function isTeamColor(value: string | null): value is TeamColor {
  return TEAM_COLORS.some((color) => color.key === value);
}

function buildOfflineTestRealization(code: string): MobileBootstrapRealization {
  return {
    id: "offline-test-realization",
    companyName: "Realizacja TEST (offline)",
    status: "in-progress",
    scheduledAt: new Date().toISOString(),
    joinCode: code,
    teamCount: 6,
    stationIds: ["g-1", "g-2", "g-3"],
  };
}

export function RealizationOnboardingScreen() {
  const routePulse = useRef(new Animated.Value(0)).current;
  const deviceIdRef = useRef(`sq-${Platform.OS}-${Math.random().toString(36).slice(2, 10)}`);
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= 768;
  const contentMaxWidth = isTabletLayout ? 560 : 448;
  const contentHorizontalPadding = isTabletLayout ? 40 : 16;
  const contentTopPadding = isTabletLayout ? 44 : 24;
  const contentBottomPadding = isTabletLayout ? 56 : 32;
  const contentGapClassName = isTabletLayout ? "gap-8" : "gap-4";
  const teamPickerListMaxHeight = isTabletLayout ? 420 : 316;

  const [screen, setScreen] = useState<Screen>("code");
  const [setupState, setSetupState] = useState<SetupState>("idle");
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingTeam, setIsSwitchingTeam] = useState(false);
  const [isTeamPickerOpen, setIsTeamPickerOpen] = useState(false);
  const [teamPickerError, setTeamPickerError] = useState<string | null>(null);

  const [realizationCode, setRealizationCode] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [activeRealization, setActiveRealization] = useState<MobileBootstrapRealization | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("Drużyna");
  const [teamColor, setTeamColor] = useState<TeamColor>("amber");
  const [teamIcon, setTeamIcon] = useState("🦊");

  const selectedColor = useMemo(
    () => TEAM_COLORS.find((color) => color.key === teamColor) ?? TEAM_COLORS[0],
    [teamColor],
  );
  const topPanelActiveStepIndex = TOP_PANEL_STEP_ORDER.indexOf(screen);
  const availableTeamSlots = useMemo(
    () => Array.from({ length: activeRealization?.teamCount ?? 0 }, (_, index) => index + 1),
    [activeRealization?.teamCount],
  );

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(routePulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(routePulse, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [routePulse]);

  const firstMarkerPulse = {
    opacity: routePulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.48, 0.1],
    }),
    transform: [
      {
        scale: routePulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.5],
        }),
      },
    ],
  };

  const secondMarkerPulse = {
    opacity: routePulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.38, 0.08],
    }),
    transform: [
      {
        scale: routePulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1.1, 1.65],
        }),
      },
    ],
  };

  async function onSubmitCode() {
    const normalizedCode = realizationCode.trim().toUpperCase();

    if (!normalizedCode) {
      setSetupState("error");
      setSetupMessage("Wpisz kod realizacji.");
      return;
    }

    setRealizationCode(normalizedCode);
    setSetupState("loading");
    setSetupMessage(null);
    setSaveMessage(null);
    setActiveRealization(null);
    setApiBaseUrl(null);
    setSessionToken(null);
    setSelectedTeam(null);
    setTeamPickerError(null);
    setIsTeamPickerOpen(false);

    if (normalizedCode === "TEST") {
      const offlineRealization = buildOfflineTestRealization(normalizedCode);
      setApiBaseUrl(null);
      setActiveRealization(offlineRealization);
      setSessionToken(OFFLINE_TEST_SESSION_TOKEN);
      setSelectedTeam(1);
      setTeamName("Drużyna 1");
      setTeamColor("amber");
      setTeamIcon("🦊");
      setSetupState("ready");
      setSetupMessage("Przydzielono automatycznie: Drużyna 1.");
      return;
    }

    const baseUrlCandidates = resolveApiBaseUrlCandidates();

    if (baseUrlCandidates.length === 0) {
      setSetupState("error");
      setSetupMessage("Brakuje EXPO_PUBLIC_API_BASE_URL. Ustaw adres API admina w .env.local.");
      return;
    }

    try {
      let resolvedBaseUrl: string | null = null;
      let bootstrap: MobileBootstrapResponse | null = null;
      let bootstrapError: unknown = null;

      for (const candidate of baseUrlCandidates) {
        try {
          bootstrap = await requestMobileApi<MobileBootstrapResponse>(candidate, "/api/mobile/bootstrap");
          resolvedBaseUrl = candidate;
          break;
        } catch (error) {
          bootstrapError = error;
        }
      }

      if (!resolvedBaseUrl || !bootstrap) {
        throw bootstrapError ?? new Error("Nie udało się połączyć z backendem.");
      }

      const join = await requestMobileApi<MobileJoinResponse>(resolvedBaseUrl, "/api/mobile/session/join", {
        method: "POST",
        body: JSON.stringify({
          joinCode: normalizedCode,
          deviceId: deviceIdRef.current,
          memberName: "Użytkownik mobilny",
        }),
      });

      const realization =
        bootstrap.realizations.find((item) => item.id === join.realizationId) ??
        bootstrap.realizations.find((item) => item.joinCode.trim().toUpperCase() === normalizedCode);

      if (!realization) {
        throw new Error("Nie znaleziono realizacji dla podanego kodu.");
      }

      setApiBaseUrl(resolvedBaseUrl);
      setActiveRealization(realization);
      setSessionToken(join.sessionToken);
      setSelectedTeam(join.team.slotNumber);
      setTeamName(join.team.name?.trim() || `Drużyna ${join.team.slotNumber}`);

      if (isTeamColor(join.team.color)) {
        setTeamColor(join.team.color);
      }

      if (typeof join.team.badgeKey === "string" && TEAM_ICONS.includes(join.team.badgeKey)) {
        setTeamIcon(join.team.badgeKey);
      }

      setSetupState("ready");
      setSetupMessage(`Przydzielono automatycznie: Drużyna ${join.team.slotNumber}.`);
    } catch (error) {
      setSetupState("error");
      setSetupMessage(getErrorMessage(error));
    }
  }

  async function onSelectTeamFromPopup(slotNumber: number) {
    if (slotNumber === selectedTeam) {
      setIsTeamPickerOpen(false);
      return;
    }

    if (sessionToken === OFFLINE_TEST_SESSION_TOKEN) {
      setSelectedTeam(slotNumber);
      setTeamName(`Drużyna ${slotNumber}`);
      setSetupMessage(`Przydzielono ręcznie: Drużyna ${slotNumber}.`);
      setTeamPickerError(null);
      setIsTeamPickerOpen(false);
      return;
    }

    if (!sessionToken || !apiBaseUrl) {
      setTeamPickerError("Brak aktywnej sesji lub konfiguracji API.");
      return;
    }

    setIsSwitchingTeam(true);
    setTeamPickerError(null);

    try {
      const result = await requestMobileApi<MobileSelectTeamResponse>(apiBaseUrl, "/api/mobile/team/select", {
        method: "POST",
        body: JSON.stringify({
          sessionToken,
          slotNumber,
        }),
      });

      setSelectedTeam(result.team.slotNumber);
      setTeamName(result.team.name?.trim() || `Drużyna ${result.team.slotNumber}`);

      if (isTeamColor(result.team.color)) {
        setTeamColor(result.team.color);
      }

      if (typeof result.team.badgeKey === "string" && TEAM_ICONS.includes(result.team.badgeKey)) {
        setTeamIcon(result.team.badgeKey);
      }

      setSetupMessage(`Przydzielono ręcznie: Drużyna ${result.team.slotNumber}.`);
      setIsTeamPickerOpen(false);
    } catch (error) {
      setTeamPickerError(getErrorMessage(error));
    } finally {
      setIsSwitchingTeam(false);
    }
  }

  async function onSaveCustomization() {
    const trimmedName = teamName.trim();

    if (!sessionToken) {
      setSaveMessage("Brak aktywnej sesji. Najpierw aktywuj kod realizacji.");
      return;
    }

    if (!trimmedName) {
      setSaveMessage("Podaj nazwę drużyny przed zapisaniem.");
      return;
    }

    if (sessionToken === OFFLINE_TEST_SESSION_TOKEN) {
      setSaveMessage(`Zapisano lokalnie ustawienia: ${trimmedName}.`);
      return;
    }

    if (!apiBaseUrl) {
      setSaveMessage("Brakuje konfiguracji API. Ustaw EXPO_PUBLIC_API_BASE_URL.");
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const result = await requestMobileApi<MobileClaimResponse>(apiBaseUrl, "/api/mobile/team/claim", {
        method: "POST",
        body: JSON.stringify({
          sessionToken,
          name: trimmedName,
          color: teamColor,
          badgeKey: teamIcon,
        }),
      });

      setSaveMessage(`Zapisano ustawienia: ${result.name}.`);
    } catch (error) {
      setSaveMessage(`Nie udało się zapisać: ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  function openTeamPicker() {
    setTeamPickerError(null);

    if (availableTeamSlots.length === 0) {
      return;
    }

    if (Platform.OS === "ios") {
      const options = [...availableTeamSlots.map((slot) => `Drużyna ${slot}`), "Anuluj"];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Wybierz drużynę",
        },
        (selectedIndex) => {
          if (typeof selectedIndex !== "number" || selectedIndex === cancelButtonIndex) {
            return;
          }

          const slot = availableTeamSlots[selectedIndex];

          if (typeof slot === "number") {
            void onSelectTeamFromPopup(slot);
          }
        },
      );
      return;
    }

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const selected = window.prompt(
        `Wybierz numer drużyny (${availableTeamSlots.join(", ")})`,
        String(selectedTeam ?? availableTeamSlots[0]),
      );

      if (selected === null) {
        return;
      }

      const parsed = Number(selected.trim());

      if (!Number.isInteger(parsed) || !availableTeamSlots.includes(parsed)) {
        setTeamPickerError("Wpisz numer drużyny z listy.");
        return;
      }

      void onSelectTeamFromPopup(parsed);
      return;
    }

    setIsTeamPickerOpen(true);
  }

  return (
    <View className="relative flex-1 overflow-hidden" style={{ backgroundColor: EXPEDITION_THEME.background }}>
      <View pointerEvents="none" className="absolute inset-0">
        <Svg width="100%" height="100%" viewBox="0 0 430 932" preserveAspectRatio="xMidYMid slice">
          <Rect x="0" y="0" width="430" height="932" fill={EXPEDITION_THEME.background} />
          <Path
            d="M48 130 C128 170 164 236 150 330 C136 428 205 486 228 590 C254 704 328 736 362 846"
            fill="none"
            stroke={EXPEDITION_THEME.mapLine}
            strokeDasharray="8 11"
            strokeWidth={2}
            opacity={0.7}
          />
          <Path
            d="M76 454 C154 424 198 478 274 520"
            fill="none"
            stroke={EXPEDITION_THEME.mapLine}
            strokeDasharray="5 10"
            strokeWidth={1.5}
            opacity={0.5}
          />
          <Circle cx="48" cy="130" r="4" fill={EXPEDITION_THEME.mapNode} opacity={0.9} />
          <Circle cx="150" cy="330" r="4" fill={EXPEDITION_THEME.mapNode} opacity={0.9} />
          <Circle cx="228" cy="590" r="4" fill={EXPEDITION_THEME.mapNode} opacity={0.9} />
          <Circle cx="362" cy="846" r="4" fill={EXPEDITION_THEME.mapNode} opacity={0.9} />
        </Svg>
      </View>

      <Animated.View
        pointerEvents="none"
        className="absolute h-4 w-4 rounded-full"
        style={[{ left: "11%", top: "14%", backgroundColor: EXPEDITION_THEME.accent }, firstMarkerPulse]}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute h-4 w-4 rounded-full"
        style={[{ right: "16%", top: "61%", backgroundColor: EXPEDITION_THEME.accentStrong }, secondMarkerPulse]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: isTabletLayout ? "center" : "flex-start",
          paddingHorizontal: contentHorizontalPadding,
          paddingTop: contentTopPadding,
          paddingBottom: contentBottomPadding,
        }}
      >
        <View className={`w-full ${contentGapClassName}`} style={{ maxWidth: contentMaxWidth }}>
          {screen !== "customize" && (
            <View
              className={`rounded-3xl border ${isTabletLayout ? "px-8 py-7" : "px-5 py-5"}`}
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
            >
              <Text
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: EXPEDITION_THEME.accentStrong }}
              >
                Expedition Map
              </Text>
              <Text
                className={`mt-1 font-semibold tracking-tight ${isTabletLayout ? "text-5xl" : "text-3xl"}`}
                style={{ color: EXPEDITION_THEME.textPrimary }}
              >
                SurvivorQuest
              </Text>
              <Text className="mt-2 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                {STEP_HINT[screen]}
              </Text>

              <View className="mt-4 flex-row gap-2">
                {TOP_PANEL_STEP_ORDER.map((step, index) => {
                  const isActive = index === topPanelActiveStepIndex;
                  const isCompleted = topPanelActiveStepIndex > -1 && index < topPanelActiveStepIndex;

                  return (
                    <View
                      key={step}
                      className="flex-1 rounded-xl border px-2 py-2"
                      style={{
                        borderColor: isActive || isCompleted ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                        backgroundColor: isActive ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                      }}
                    >
                      <Text
                        className="text-[10px] uppercase tracking-widest"
                        style={{ color: isActive || isCompleted ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.textSubtle }}
                      >
                        Etap {index + 1}
                      </Text>
                      <Text className="mt-0.5 text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                        {STEP_LABEL[step]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {screen === "code" && (
            <View
              className={`rounded-3xl border ${isTabletLayout ? "p-7" : "p-5"}`}
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
            >
              <View className="gap-1.5">
                <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  Etap 1: kod realizacji
                </Text>
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  Wpisz kod przekazany przez administratora i uruchom przydział drużyny.
                </Text>
              </View>

              <TextInput
                className="mt-3 rounded-2xl border px-4 py-3 text-base font-semibold tracking-widest"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                  color: EXPEDITION_THEME.textPrimary,
                }}
                value={realizationCode}
                onChangeText={(value) => setRealizationCode(value.toUpperCase())}
                placeholder="Kod realizacji"
                placeholderTextColor={EXPEDITION_THEME.textSubtle}
                autoCapitalize="characters"
                maxLength={12}
              />

              <Pressable
                className="mt-4 rounded-2xl px-4 py-3 active:opacity-90"
                style={{ backgroundColor: EXPEDITION_THEME.accent }}
                onPress={() => void onSubmitCode()}
              >
                <Text className="text-center text-base font-semibold text-zinc-950">Aktywuj realizację</Text>
              </Pressable>

              {setupState === "loading" && (
                <View
                  className="mt-4 rounded-2xl border px-4 py-4"
                  style={{
                    borderColor: EXPEDITION_THEME.border,
                    backgroundColor: EXPEDITION_THEME.panelMuted,
                  }}
                >
                  <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
                  <Text className="mt-3 text-center text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                    Pobieranie konfiguracji od administratora...
                  </Text>
                </View>
              )}

              {setupState === "error" && (
                <View
                  className="mt-4 rounded-2xl border px-4 py-4"
                  style={{ borderColor: EXPEDITION_THEME.danger, backgroundColor: "rgba(239, 111, 108, 0.12)" }}
                >
                  <Text className="text-sm" style={{ color: EXPEDITION_THEME.danger }}>
                    {setupMessage ?? "Nie udało się pobrać konfiguracji."}
                  </Text>
                </View>
              )}

              {setupState === "ready" && activeRealization && (
                <>
                  <View
                    className="mt-4 rounded-2xl border px-4 py-4"
                    style={{
                      borderColor: EXPEDITION_THEME.border,
                      backgroundColor: EXPEDITION_THEME.panelMuted,
                    }}
                  >
                    <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                      Aktywna realizacja
                    </Text>
                    <Text className="mt-1 text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                      {activeRealization.companyName}
                    </Text>
                    <Text className="mt-1 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                      Kod: {realizationCode}
                    </Text>
                    <Text className="mt-0.5 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                      Termin: {formatScheduledAt(activeRealization.scheduledAt)}
                    </Text>
                    <Text className="mt-0.5 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                      Limit drużyn: {activeRealization.teamCount}
                    </Text>
                  </View>

                  <Pressable
                    className="mt-4 rounded-2xl px-4 py-3 active:opacity-90"
                    style={{ backgroundColor: EXPEDITION_THEME.accent }}
                    onPress={() => setScreen("team")}
                  >
                    <Text className="text-center text-base font-semibold text-zinc-950">Przejdź do etapu 2</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {screen === "team" && (
            <View
              className={`rounded-3xl border ${isTabletLayout ? "p-7" : "p-5"}`}
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
            >
              <View className="gap-1">
                <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  Etap 2: automatyczny przydział
                </Text>
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  System przypisuje pierwszą dostępną drużynę na podstawie danych realizacji z backendu.
                </Text>
              </View>

              <View
                className="mt-4 rounded-2xl border px-4 py-4"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
              >
                <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                  Wynik przydziału
                </Text>
                <Text className="mt-1 text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {setupMessage ?? "Przydział drużyny nie został jeszcze wykonany."}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {selectedTeam ? `Przydzielona drużyna: ${selectedTeam}` : "Brak przydzielonej drużyny."}
                </Text>
                <Text className="mt-0.5 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  Liczba możliwych drużyn: {activeRealization?.teamCount ?? "-"}
                </Text>
              </View>

              <Pressable
                className="mt-3 rounded-2xl border px-3 py-3 active:opacity-90"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelStrong,
                  opacity: availableTeamSlots.length > 0 ? 1 : 0.6,
                }}
                onPress={openTeamPicker}
                disabled={availableTeamSlots.length === 0}
              >
                <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  Zmień drużynę
                </Text>
              </Pressable>

              <View className="mt-4 flex-row gap-2">
                <Pressable
                  className="flex-1 rounded-2xl border px-3 py-3 active:opacity-90"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                  onPress={() => setScreen("code")}
                >
                  <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    Wstecz
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-2xl px-3 py-3 active:opacity-90"
                  style={{ backgroundColor: EXPEDITION_THEME.accent, opacity: selectedTeam ? 1 : 0.6 }}
                  onPress={() => setScreen("customize")}
                  disabled={!selectedTeam}
                >
                  <Text className="text-center font-semibold text-zinc-950">Przejdź do startu aplikacji</Text>
                </Pressable>
              </View>
            </View>
          )}

          {screen === "customize" && (
            <View
              className={`rounded-3xl border ${isTabletLayout ? "p-7" : "p-5"}`}
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
            >
              <View
                className="rounded-2xl border"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                  overflow: "hidden",
                }}
              >
                <View className="h-2" style={{ backgroundColor: selectedColor.hex }} />
                <View className="px-4 py-3">
                  <Text className="text-[10px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                    Karta wyprawy
                  </Text>
                  <View className="mt-2 flex-row items-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-xl border" style={{ borderColor: EXPEDITION_THEME.border }}>
                      <Text className="text-2xl">{teamIcon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                        {teamName.trim() || "Drużyna bez nazwy"}
                      </Text>
                      <Text className="text-xs" style={{ color: selectedColor.hex }}>
                        Drużyna {selectedTeam ?? "-"} • Kolor: {selectedColor.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <TextInput
                className="mt-3 rounded-2xl border px-4 py-3 text-base"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                  color: EXPEDITION_THEME.textPrimary,
                }}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="Nazwa drużyny"
                placeholderTextColor={EXPEDITION_THEME.textSubtle}
              />

              <Text className="mt-3 text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                Kolor identyfikacji
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {TEAM_COLORS.map((color) => (
                  <Pressable
                    key={color.key}
                    onPress={() => setTeamColor(color.key)}
                    className="h-11 w-11 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: teamColor === color.key ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                      backgroundColor: color.hex,
                    }}
                  >
                    {teamColor === color.key ? <Text className="text-sm font-bold text-zinc-950">✓</Text> : null}
                  </Pressable>
                ))}
              </View>
              <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                Wybrano: {selectedColor.label}
              </Text>

              <Text className="mt-3 text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                Ikona drużyny
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {TEAM_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    onPress={() => setTeamIcon(icon)}
                    className={`h-11 w-11 items-center justify-center rounded-lg border ${teamIcon === icon ? "bg-zinc-700" : ""}`}
                    style={{
                      borderColor: teamIcon === icon ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                      backgroundColor: teamIcon === icon ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                    }}
                  >
                    <Text className="text-xl">{icon}</Text>
                  </Pressable>
                ))}
              </View>

              {saveMessage && (
                <View
                  className="mt-3 rounded-2xl border px-3 py-2"
                  style={{
                    borderColor: EXPEDITION_THEME.border,
                    backgroundColor: EXPEDITION_THEME.panelStrong,
                  }}
                >
                  <Text className="text-sm" style={{ color: EXPEDITION_THEME.accentStrong }}>
                    {saveMessage}
                  </Text>
                </View>
              )}

              <View className="mt-4 flex-row gap-2">
                <Pressable
                  className="flex-1 rounded-2xl border px-3 py-3 active:opacity-90"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                  onPress={() => setScreen("team")}
                >
                  <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    Wstecz
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-2xl px-3 py-3 active:opacity-90"
                  style={{ backgroundColor: EXPEDITION_THEME.accent, opacity: isSaving ? 0.7 : 1 }}
                  onPress={() => void onSaveCustomization()}
                  disabled={isSaving}
                >
                  <Text className="text-center font-semibold text-zinc-950">
                    {isSaving ? "Zapisywanie..." : "Zapisz ustawienia"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {screen !== "customize" && (
            <Text className="px-2 text-center text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
              Etapy 1 i 2 pochodzą z danych admina, a użytkownik uzupełnia tylko etap 3.
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isTeamPickerOpen && Platform.OS !== "ios" && Platform.OS !== "web"}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTeamPickerOpen(false)}
      >
        <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: "rgba(12, 18, 15, 0.72)" }}>
          <View
            className={`w-full rounded-3xl border ${isTabletLayout ? "p-6" : "p-4"}`}
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
              maxWidth: isTabletLayout ? 760 : 640,
            }}
          >
            <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              Wybierz drużynę
            </Text>
            <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
              Lista możliwych drużyn pochodzi z limitu drużyn realizacji.
            </Text>

            <View className="mt-3 rounded-2xl border p-2" style={{ borderColor: EXPEDITION_THEME.border }}>
              <ScrollView style={{ maxHeight: teamPickerListMaxHeight }} showsVerticalScrollIndicator>
                <View className="gap-2">
                  {availableTeamSlots.map((slotNumber) => {
                    const isCurrent = slotNumber === selectedTeam;

                    return (
                      <Pressable
                        key={slotNumber}
                        className="rounded-2xl border px-3 py-3 active:opacity-90"
                        style={{
                          borderColor: isCurrent ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                          backgroundColor: isCurrent ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                          minHeight: isTabletLayout ? 76 : 64,
                          justifyContent: "center",
                          opacity: isSwitchingTeam ? 0.65 : 1,
                        }}
                        onPress={() => void onSelectTeamFromPopup(slotNumber)}
                        disabled={isSwitchingTeam}
                      >
                        <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          Drużyna {slotNumber}
                        </Text>
                        <Text className="mt-0.5 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {isCurrent ? "Aktualnie przypisana" : "Dotknij, aby przypisać"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {isSwitchingTeam && (
              <View className="mt-3 flex-row items-center gap-2">
                <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
                <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                  Zmieniam przydział drużyny...
                </Text>
              </View>
            )}

            {teamPickerError && (
              <Text className="mt-3 text-xs" style={{ color: EXPEDITION_THEME.danger }}>
                {teamPickerError}
              </Text>
            )}

            <Pressable
              className="mt-4 rounded-2xl border px-3 py-3 active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={() => setIsTeamPickerOpen(false)}
            >
              <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                Zamknij
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
