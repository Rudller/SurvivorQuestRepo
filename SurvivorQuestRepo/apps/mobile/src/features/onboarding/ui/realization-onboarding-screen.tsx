import { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { DEFAULT_REALIZATION_CODE, EXPEDITION_THEME, TEAM_COLORS, TEAM_ICONS } from "../model/constants";
import type { OnboardingSession, Screen, TeamColor } from "../model/types";

type SetupState = "idle" | "loading" | "ready" | "error";
type ApiConnectionStatus = "checking" | "connected" | "disconnected" | "config-missing";

type MobileBootstrapRealization = {
  id: string;
  companyName: string;
  status: "planned" | "in-progress" | "done";
  scheduledAt: string;
  durationMinutes: number;
  joinCode: string;
  locationRequired: boolean;
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
  error?: {
    message?: string;
  };
  data?: {
    error?: {
      message?: string;
    };
  };
};

const OFFLINE_TEST_SESSION_TOKEN = "offline-test-session";
const API_BASE_URL_OVERRIDE_STORAGE_KEY = "sq.mobile.api-base-url-override.v1";
const MOBILE_DEVICE_ID_STORAGE_KEY = "sq.mobile.device-id.v1";

const TOP_PANEL_STEP_ORDER: Screen[] = ["api", "code", "team"];

const STEP_LABEL: Record<Screen, string> = {
  api: "Połączenie API",
  code: "Kod realizacji",
  team: "Przydzielenie drużyny",
};

const STEP_HINT: Record<Screen, string> = {
  api: "Etap 1 potwierdza połączenie z backendem i gotowość API.",
  code: "Etap 2 wymaga wpisania kodu realizacji od administratora.",
  team: "Etap 3 pokazuje przydział drużyny i pozwala rozpocząć aplikację.",
};

type RealizationOnboardingScreenProps = {
  onComplete?: (session: OnboardingSession) => void;
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

function normalizeDurationMinutes(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 120;
  }

  return Math.round(parsed);
}

function normalizeApiBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${pathname}`;
}

function addBaseUrlCandidate(list: string[], candidate: string | null) {
  if (!candidate) {
    return;
  }

  if (!list.includes(candidate)) {
    list.push(candidate);
  }
}

function resolveApiBaseUrlCandidates(overrideBaseUrl?: string | null) {
  const candidates: string[] = [];
  addBaseUrlCandidate(candidates, normalizeApiBaseUrl(overrideBaseUrl));
  const envBaseUrl = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

  if (envBaseUrl) {
    addBaseUrlCandidate(candidates, envBaseUrl);
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
        return candidates;
      }
    }
  }

  if (!host) {
    return candidates;
  }

  const ports = [3000, 3001, 3002];
  for (const port of ports) {
    addBaseUrlCandidate(candidates, normalizeApiBaseUrl(`${protocol}//${host}:${port}`));
  }

  return candidates;
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
    const errorMessage =
      (typeof data.message === "string" && data.message.trim()) ||
      (typeof data.error?.message === "string" && data.error.message.trim()) ||
      (typeof data.data?.error?.message === "string" && data.data.error.message.trim()) ||
      null;
    throw new Error(errorMessage || `HTTP ${response.status}`);
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
    durationMinutes: 120,
    joinCode: code,
    locationRequired: true,
    teamCount: 6,
    stationIds: ["g-1", "g-2", "g-3"],
  };
}

export function RealizationOnboardingScreen({ onComplete }: RealizationOnboardingScreenProps) {
  const routePulse = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= 768;
  const contentMaxWidth = isTabletLayout ? 560 : 448;
  const contentHorizontalPadding = isTabletLayout ? 40 : 16;
  const contentTopPadding = isTabletLayout ? 44 : 24;
  const contentBottomPadding = isTabletLayout ? 56 : 32;
  const contentGapClassName = isTabletLayout ? "gap-8" : "gap-4";
  const teamPickerListMaxHeight = isTabletLayout ? 420 : 316;

  const [screen, setScreen] = useState<Screen>("api");
  const [setupState, setSetupState] = useState<SetupState>("idle");
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingTeam, setIsSwitchingTeam] = useState(false);
  const [isTeamPickerOpen, setIsTeamPickerOpen] = useState(false);
  const [teamPickerError, setTeamPickerError] = useState<string | null>(null);

  const [realizationCode, setRealizationCode] = useState(DEFAULT_REALIZATION_CODE);
  const [apiBaseUrlOverride, setApiBaseUrlOverride] = useState<string | null>(null);
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = useState("");
  const [apiConfigMessage, setApiConfigMessage] = useState<string | null>(null);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [isHydratingApiConfig, setIsHydratingApiConfig] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [apiProbeNonce, setApiProbeNonce] = useState(0);
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(null);
  const [activeRealization, setActiveRealization] = useState<MobileBootstrapRealization | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<ApiConnectionStatus>(() =>
    resolveApiBaseUrlCandidates().length > 0 ? "checking" : "config-missing",
  );
  const [apiConnectionTarget, setApiConnectionTarget] = useState<string | null>(() => {
    const candidates = resolveApiBaseUrlCandidates();
    return candidates.length > 0 ? candidates[0] : null;
  });

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
  const apiStatusIndicatorColor =
    apiConnectionStatus === "connected"
      ? "#34d399"
      : apiConnectionStatus === "checking"
        ? "#fbbf24"
        : apiConnectionStatus === "config-missing"
          ? "#71717a"
          : EXPEDITION_THEME.danger;

  useEffect(() => {
    let isActive = true;

    const hydrateApiBaseUrlConfig = async () => {
      try {
        const storedOverride = await AsyncStorage.getItem(API_BASE_URL_OVERRIDE_STORAGE_KEY);
        if (!isActive) {
          return;
        }

        const normalizedOverride = normalizeApiBaseUrl(storedOverride);
        setApiBaseUrlOverride(normalizedOverride);
        const initialCandidates = resolveApiBaseUrlCandidates(normalizedOverride);
        setApiBaseUrlDraft(normalizedOverride ?? initialCandidates[0] ?? "");
      } catch {
        if (!isActive) {
          return;
        }
        const initialCandidates = resolveApiBaseUrlCandidates(null);
        setApiBaseUrlDraft(initialCandidates[0] ?? "");
      } finally {
        if (isActive) {
          setIsHydratingApiConfig(false);
        }
      }
    };

    void hydrateApiBaseUrlConfig();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const hydrateDeviceId = async () => {
      try {
        const storedDeviceId = await AsyncStorage.getItem(MOBILE_DEVICE_ID_STORAGE_KEY);
        if (!isActive) {
          return;
        }

        const normalizedStoredDeviceId = storedDeviceId?.trim() || null;
        if (normalizedStoredDeviceId) {
          setDeviceId(normalizedStoredDeviceId);
          return;
        }

        const generatedDeviceId = `sq-${Platform.OS}-${Math.random().toString(36).slice(2, 10)}`;
        await AsyncStorage.setItem(MOBILE_DEVICE_ID_STORAGE_KEY, generatedDeviceId);

        if (isActive) {
          setDeviceId(generatedDeviceId);
        }
      } catch {
        if (!isActive) {
          return;
        }

        setDeviceId(`sq-${Platform.OS}-${Math.random().toString(36).slice(2, 10)}`);
      }
    };

    void hydrateDeviceId();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (isHydratingApiConfig) {
      return;
    }

    const baseUrlCandidates = resolveApiBaseUrlCandidates(apiBaseUrlOverride);

    if (baseUrlCandidates.length === 0) {
      setApiConnectionStatus("config-missing");
      setApiConnectionTarget(null);
      return;
    }

    let isCancelled = false;

    const probeConnection = async () => {
      setApiConnectionStatus("checking");
      setApiConnectionTarget(baseUrlCandidates[0]);

      for (const candidate of baseUrlCandidates) {
        if (isCancelled) {
          return;
        }

        setApiConnectionTarget(candidate);

        try {
          await requestMobileApi<MobileBootstrapResponse>(candidate, "/api/mobile/bootstrap");

          if (!isCancelled) {
            setApiConnectionStatus("connected");
          }
          return;
        } catch {
          // try next candidate
        }
      }

      if (!isCancelled) {
        setApiConnectionStatus("disconnected");
      }
    };

    void probeConnection();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrlOverride, apiProbeNonce, isHydratingApiConfig]);

  function completeOnboarding(nextSessionToken: string, nextTeamName: string) {
    onComplete?.({
      realizationId: activeRealization?.id ?? null,
      realizationCode,
      sessionToken: nextSessionToken,
      apiBaseUrl,
      realization: activeRealization
        ? {
            id: activeRealization.id,
            companyName: activeRealization.companyName,
            status: activeRealization.status,
            scheduledAt: activeRealization.scheduledAt,
            durationMinutes: normalizeDurationMinutes(activeRealization.durationMinutes),
            joinCode: activeRealization.joinCode,
            teamCount: activeRealization.teamCount,
            stationIds: activeRealization.stationIds,
            locationRequired: activeRealization.locationRequired,
          }
        : null,
      team: {
        slotNumber: selectedTeam,
        name: nextTeamName,
        colorKey: teamColor,
        colorLabel: selectedColor.label,
        colorHex: selectedColor.hex,
        icon: teamIcon,
      },
    });
  }

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

    if (!deviceId) {
      setSetupState("error");
      setSetupMessage("Trwa inicjalizacja urządzenia. Spróbuj ponownie za chwilę.");
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
      setScreen("team");
      return;
    }

    const baseUrlCandidates = resolveApiBaseUrlCandidates(apiBaseUrlOverride);

    if (baseUrlCandidates.length === 0) {
      setApiConnectionStatus("config-missing");
      setApiConnectionTarget(null);
      setSetupState("error");
      setSetupMessage("Brakuje konfiguracji API. Ustaw adres serwera w sekcji połączenia.");
      return;
    }

    try {
      let resolvedBaseUrl: string | null = null;
      let bootstrap: MobileBootstrapResponse | null = null;
      let bootstrapError: unknown = null;
      setApiConnectionStatus("checking");

      for (const candidate of baseUrlCandidates) {
        setApiConnectionTarget(candidate);

        try {
          bootstrap = await requestMobileApi<MobileBootstrapResponse>(candidate, "/api/mobile/bootstrap");
          resolvedBaseUrl = candidate;
          break;
        } catch (error) {
          bootstrapError = error;
        }
      }

      if (!resolvedBaseUrl || !bootstrap) {
        setApiConnectionStatus("disconnected");
        throw bootstrapError ?? new Error("Nie udało się połączyć z backendem.");
      }
      setApiConnectionStatus("connected");

      const join = await requestMobileApi<MobileJoinResponse>(resolvedBaseUrl, "/api/mobile/session/join", {
        method: "POST",
        body: JSON.stringify({
          joinCode: normalizedCode,
          deviceId,
          memberName: "Użytkownik mobilny",
        }),
      });

      const realization =
        bootstrap.realizations.find((item) => item.id === join.realizationId) ??
        bootstrap.realizations.find((item) => item.joinCode.trim().toUpperCase() === normalizedCode);

      if (!realization) {
        throw new Error("Nie znaleziono realizacji dla podanego kodu.");
      }

      const normalizedRealization = {
        ...realization,
        durationMinutes: normalizeDurationMinutes(realization.durationMinutes),
      };

      setApiBaseUrl(resolvedBaseUrl);
      setActiveRealization(normalizedRealization);
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
      setScreen("team");
    } catch (error) {
      setSetupState("error");
      setSetupMessage(getErrorMessage(error));
    }
  }

  function triggerApiProbe() {
    setApiProbeNonce((current) => current + 1);
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
      setTeamName(trimmedName);
      setSaveMessage(`Zapisano lokalnie ustawienia: ${trimmedName}.`);
      completeOnboarding(sessionToken, trimmedName);
      return;
    }

    if (!apiBaseUrl) {
      setSaveMessage("Brakuje konfiguracji API. Ustaw adres serwera.");
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    let completionTeamName: string | null = null;

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

      const normalizedResultName = result.name.trim() || trimmedName;
      setTeamName(normalizedResultName);
      setSaveMessage(`Zapisano ustawienia: ${normalizedResultName}.`);
      completionTeamName = normalizedResultName;
    } catch (error) {
      setSaveMessage(`Nie udało się zapisać: ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }

    if (completionTeamName) {
      completeOnboarding(sessionToken, completionTeamName);
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

  async function saveApiServerOverride() {
    const normalized = normalizeApiBaseUrl(apiBaseUrlDraft);
    if (!normalized) {
      setApiConfigMessage("Podaj poprawny adres serwera, np. http://192.168.18.11:3001.");
      return;
    }

    try {
      await AsyncStorage.setItem(API_BASE_URL_OVERRIDE_STORAGE_KEY, normalized);
      setApiBaseUrlOverride(normalized);
      setApiBaseUrlDraft(normalized);
      setApiConnectionTarget(normalized);
      setApiConnectionStatus("checking");
      triggerApiProbe();
      setApiConfigMessage("Zapisano adres serwera API.");
      setIsApiConfigOpen(false);
    } catch {
      setApiConfigMessage("Nie udało się zapisać adresu serwera.");
    }
  }

  async function resetApiServerOverride() {
    try {
      await AsyncStorage.removeItem(API_BASE_URL_OVERRIDE_STORAGE_KEY);
      const fallbackCandidates = resolveApiBaseUrlCandidates(null);
      setApiBaseUrlOverride(null);
      setApiBaseUrlDraft(fallbackCandidates[0] ?? "");
      setApiConnectionTarget(fallbackCandidates[0] ?? null);
      setApiConnectionStatus(fallbackCandidates.length > 0 ? "checking" : "config-missing");
      triggerApiProbe();
      setApiConfigMessage("Przywrócono domyślną konfigurację serwera.");
      setIsApiConfigOpen(false);
    } catch {
      setApiConfigMessage("Nie udało się przywrócić domyślnego serwera.");
    }
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
          <View
            className={`rounded-3xl border ${isTabletLayout ? "px-8 py-7" : "px-5 py-5"}`}
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
          >
            <Text className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
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

          {screen === "api" && (
            <View
              className={`rounded-3xl border ${isTabletLayout ? "p-7" : "p-5"}`}
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
            >
              <View className="gap-1.5">
                <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  Etap 1: potwierdzenie API
                </Text>
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  Upewnij się, że backend odpowiada, zanim przejdziesz do wpisywania kodu realizacji.
                </Text>
              </View>

              <View
                className="mt-4 rounded-2xl border px-4 py-3"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                    Połączenie API
                  </Text>
                  <Pressable
                    className={`border active:opacity-80 ${isTabletLayout ? "rounded-2xl px-4 py-2" : "rounded-xl px-2.5 py-1"}`}
                    style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
                    onPress={() => {
                      setIsApiConfigOpen((current) => {
                        const next = !current;

                        if (next) {
                          setApiBaseUrlDraft(apiConnectionTarget ?? "");
                        }

                        return next;
                      });
                      setApiConfigMessage(null);
                    }}
                  >
                    <Text className={`${isTabletLayout ? "text-sm" : "text-xs"} font-semibold`} style={{ color: EXPEDITION_THEME.textPrimary }}>
                      {isApiConfigOpen ? "Zamknij" : "Zmień"}
                    </Text>
                  </Pressable>
                </View>
                <Text className="mt-1 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  Serwer: {apiConnectionTarget ?? "Brak konfiguracji"}
                </Text>
                <View className="mt-1.5 flex-row items-center gap-2">
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: apiStatusIndicatorColor }} />
                  <Text className="text-sm font-medium" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    Status: {apiConnectionStatus}
                  </Text>
                </View>

                {isApiConfigOpen && (
                  <View className="mt-3 gap-2">
                    <TextInput
                      className="rounded-xl border px-3 py-2 text-sm"
                      style={{
                        borderColor: EXPEDITION_THEME.border,
                        backgroundColor: EXPEDITION_THEME.panel,
                        color: EXPEDITION_THEME.textPrimary,
                      }}
                      value={apiBaseUrlDraft}
                      onChangeText={(value) => {
                        setApiBaseUrlDraft(value);
                        setApiConfigMessage(null);
                      }}
                      placeholder="http://192.168.18.11:3001"
                      placeholderTextColor={EXPEDITION_THEME.textSubtle}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <View className="flex-row gap-2">
                      <Pressable
                        className={`flex-1 active:opacity-90 ${isTabletLayout ? "rounded-2xl px-4 py-3" : "rounded-xl px-3 py-2"}`}
                        style={{ backgroundColor: EXPEDITION_THEME.accent }}
                        onPress={() => void saveApiServerOverride()}
                      >
                        <Text className={`text-center ${isTabletLayout ? "text-base" : "text-sm"} font-semibold text-zinc-950`}>Zapisz</Text>
                      </Pressable>
                      <Pressable
                        className={`flex-1 border active:opacity-90 ${isTabletLayout ? "rounded-2xl px-4 py-3" : "rounded-xl px-3 py-2"}`}
                        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
                        onPress={() => void resetApiServerOverride()}
                      >
                        <Text className={`text-center ${isTabletLayout ? "text-base" : "text-sm"} font-semibold`} style={{ color: EXPEDITION_THEME.textPrimary }}>
                          Domyślny
                        </Text>
                      </Pressable>
                    </View>

                    {apiConfigMessage && (
                      <Text className="text-xs" style={{ color: apiConfigMessage.startsWith("Nie") ? EXPEDITION_THEME.danger : EXPEDITION_THEME.textMuted }}>
                        {apiConfigMessage}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              <View className="mt-4 flex-row gap-2">
                <Pressable
                  className="flex-1 rounded-2xl border px-3 py-3 active:opacity-90"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                  onPress={triggerApiProbe}
                >
                  <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    Sprawdź ponownie
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 rounded-2xl px-3 py-3 active:opacity-90"
                  style={{
                    backgroundColor: EXPEDITION_THEME.accent,
                    opacity: apiConnectionStatus === "connected" ? 1 : 0.6,
                  }}
                  onPress={() => setScreen("code")}
                  disabled={apiConnectionStatus !== "connected"}
                >
                  <Text className="text-center font-semibold text-zinc-950">Przejdź do etapu 2</Text>
                </Pressable>
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
                  Etap 2: kod realizacji
                </Text>
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  Wpisz kod przekazany przez administratora, aby przejść do przydziału drużyny.
                </Text>
              </View>

              <Text className="mt-3 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                Aktywne API: {apiConnectionTarget ?? "Brak konfiguracji"}
              </Text>

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
                  Etap 3: przydzielenie drużyny
                </Text>
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  System przypisuje drużynę na podstawie realizacji. Możesz ją zmienić przed startem aplikacji.
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
                {activeRealization && (
                  <>
                    <Text className="mt-2 text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                      {activeRealization.companyName}
                    </Text>
                    <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                      Kod: {realizationCode} • Termin: {formatScheduledAt(activeRealization.scheduledAt)}
                    </Text>
                  </>
                )}
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
                  style={{ backgroundColor: EXPEDITION_THEME.accent, opacity: selectedTeam && !isSaving ? 1 : 0.6 }}
                  onPress={() => void onSaveCustomization()}
                  disabled={!selectedTeam || isSaving}
                >
                  <Text className="text-center font-semibold text-zinc-950">
                    {isSaving ? "Uruchamianie..." : "Przejdź do startu aplikacji"}
                  </Text>
                </Pressable>
              </View>

              {saveMessage && (
                <View
                  className="mt-3 rounded-2xl border px-3 py-2"
                  style={{
                    borderColor: EXPEDITION_THEME.border,
                    backgroundColor: EXPEDITION_THEME.panelStrong,
                  }}
                >
                  <Text className="text-sm" style={{ color: saveMessage.startsWith("Nie") ? EXPEDITION_THEME.danger : EXPEDITION_THEME.accentStrong }}>
                    {saveMessage}
                  </Text>
                </View>
              )}
            </View>
          )}

          <Text className="px-2 text-center text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
            Etap 1 sprawdza API, etap 2 aktywuje realizację kodem, a etap 3 finalizuje przydział drużyny.
          </Text>
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
