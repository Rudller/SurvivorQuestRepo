import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { EXPEDITION_THEME, TEAM_COLORS, TEAM_ICONS } from "../model/constants";
import {
  getRealizationLanguageFlag,
  getRealizationLanguageLabel,
  isRealizationLanguage,
  type OnboardingSession,
  type RealizationLanguage,
  type RealizationLanguageOption,
  type Screen,
  type TeamColor,
} from "../model/types";
import { TeamCustomizationStep } from "./team-customization-step";

type SetupState = "idle" | "loading" | "ready" | "error";
type ApiConnectionStatus = "checking" | "connected" | "disconnected" | "config-missing";
type ApiServerPreset = "local" | "production" | "custom";

type MobileBootstrapRealization = {
  id: string;
  companyName: string;
  language?: RealizationLanguage;
  customLanguage?: string;
  selectedLanguage?: RealizationLanguage;
  availableLanguages?: RealizationLanguageOption[];
  introText?: string;
  gameRules?: string;
  status: "planned" | "in-progress" | "done";
  scheduledAt: string;
  durationMinutes: number;
  joinCode: string;
  locationRequired: boolean;
  showLeaderboard?: boolean;
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
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
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
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
};

type MobileUpdateCustomizationResponse = {
  teamId: string;
  color: string | null;
  badgeKey: string | null;
  changedFields: string[];
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
};

type MobileSelectTeamResponse = {
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
  team: {
    id: string;
    slotNumber: number;
    name: string | null;
    color: string | null;
    badgeKey: string | null;
    points: number;
  };
  reassignment?: {
    replacedExistingAssignment: boolean;
    replacedAssignments: number;
    message?: string;
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

const MOBILE_API_REQUEST_TIMEOUT_MS = 7000;

type MobileSessionStateResponse = {
  customizationOccupancy?: {
    colors?: Record<string, number>;
    icons?: Record<string, number>;
  };
  team?: {
    slotNumber: number;
    color: string | null;
    badgeKey: string | null;
  };
};

const API_BASE_URL_OVERRIDE_STORAGE_KEY = "sq.mobile.api-base-url-override.v1";
const MOBILE_DEVICE_ID_STORAGE_KEY = "sq.mobile.device-id.v1";
const CUSTOMIZATION_OCCUPANCY_POLL_INTERVAL_MS = 2500;
const LOCAL_DEFAULT_API_BASE_URL = "http://192.168.18.2:3001";
const PRODUCTION_API_BASE_URL_CANDIDATES = [
  "https://survivorquest.pl/api",
  "https://www.survivorquest.pl/api",
] as const;
const PRODUCTION_API_BASE_URL = PRODUCTION_API_BASE_URL_CANDIDATES[0];

const TOP_PANEL_STEP_ORDER: Screen[] = ["api", "code", "team", "customization"];

const STEP_LABEL: Record<Screen, string> = {
  api: "Połączenie API",
  code: "Kod realizacji",
  team: "Przydzielenie drużyny",
  customization: "Customizacja drużyny",
};

const STEP_HINT: Record<Screen, string> = {
  api: "Etap 1 potwierdza połączenie z backendem i gotowość API.",
  code: "Etap 2 wymaga wpisania kodu realizacji od administratora.",
  team: "Etap 3 pokazuje przydział drużyny przed konfiguracją baneru.",
  customization: "Skonfiguruj baner drużyny i przejdź do ekranu startu aplikacji.",
};

type RealizationOnboardingScreenProps = {
  onComplete?: (session: OnboardingSession) => void;
  recoveryIntent?: {
    realizationCode: string;
    apiBaseUrl: string | null;
    notice: string;
  } | null;
  onRecoveryConsumed?: () => void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    const rawMessage = error.message.trim();
    const statusMatch = rawMessage.match(/\bHTTP\s+(\d{3})\b/i);
    const statusCode = statusMatch ? Number(statusMatch[1]) : null;

    if (statusCode === 401) {
      return `HTTP 401: brak autoryzacji lub wygasła sesja. ${rawMessage}`;
    }
    if (statusCode === 403) {
      return `HTTP 403: dostęp zabroniony. ${rawMessage}`;
    }
    if (statusCode === 404) {
      return `HTTP 404: endpoint API nie istnieje (sprawdź bazowy URL i prefiks /api). ${rawMessage}`;
    }
    if (statusCode === 409) {
      return `HTTP 409: konflikt danych po stronie serwera. ${rawMessage}`;
    }
    if (statusCode === 429) {
      return `HTTP 429: limit zapytań został przekroczony. ${rawMessage}`;
    }
    if (statusCode !== null && statusCode >= 500) {
      return `HTTP ${statusCode}: błąd serwera backend. ${rawMessage}`;
    }

    if (rawMessage.includes("Network request failed") || rawMessage.includes("Failed to fetch")) {
      return `Brak połączenia z API (network failure). Sprawdź HTTPS/certyfikat, DNS i dostępność serwera. ${rawMessage}`;
    }

    return rawMessage;
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

function normalizeRealizationStatus(value: unknown): "planned" | "in-progress" | "done" {
  if (value === "in-progress" || value === "done") {
    return value;
  }

  return "planned";
}

function normalizeLanguageOption(
  value: unknown,
  customLanguage?: string,
): RealizationLanguageOption | null {
  const source = typeof value === "string" ? { value } : (value as Record<string, unknown> | null);
  if (!source || typeof source !== "object") {
    return null;
  }

  const languageValue =
    typeof source.value === "string" && isRealizationLanguage(source.value.toLowerCase())
      ? (source.value.toLowerCase() as RealizationLanguage)
      : typeof source.language === "string" && isRealizationLanguage(source.language.toLowerCase())
        ? (source.language.toLowerCase() as RealizationLanguage)
        : null;

  if (!languageValue) {
    return null;
  }

  const label =
    typeof source.label === "string" && source.label.trim().length > 0
      ? source.label.trim()
      : languageValue === "other"
        ? customLanguage?.trim() || getRealizationLanguageLabel(languageValue)
        : getRealizationLanguageLabel(languageValue);

  return {
    value: languageValue,
    label,
  };
}

function normalizeLanguageOptions(
  options: unknown,
  fallbackLanguage?: RealizationLanguage,
  customLanguage?: string,
) {
  const parsed = Array.isArray(options)
    ? options
        .map((item) => normalizeLanguageOption(item, customLanguage))
        .filter((item): item is RealizationLanguageOption => Boolean(item))
    : [];
  const deduplicated = parsed.filter(
    (item, index, list) =>
      list.findIndex((candidate) => candidate.value === item.value) === index,
  );

  if (deduplicated.length > 0) {
    return deduplicated;
  }

  if (!fallbackLanguage) {
    return [] as RealizationLanguageOption[];
  }

  return [
    {
      value: fallbackLanguage,
      label:
        fallbackLanguage === "other"
          ? customLanguage?.trim() || getRealizationLanguageLabel(fallbackLanguage)
          : getRealizationLanguageLabel(fallbackLanguage),
    },
  ] satisfies RealizationLanguageOption[];
}

function resolveBannerTextColor(hexColor: string) {
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

function normalizeApiBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  const hasExplicitProtocol = /^https?:\/\//i.test(trimmed);
  const hostCandidate = hasExplicitProtocol
    ? (() => {
        try {
          return new URL(trimmed).hostname.toLowerCase();
        } catch {
          return "";
        }
      })()
    : trimmed.split("/")[0]?.split(":")[0]?.trim().toLowerCase() ?? "";
  const shouldUseHttpByDefault =
    hostCandidate === "localhost" ||
    hostCandidate === "10.0.2.2" ||
    hostCandidate === "127.0.0.1" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostCandidate) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostCandidate) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostCandidate) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostCandidate);
  const inferredProtocol = shouldUseHttpByDefault ? "http" : "https";
  const candidate = hasExplicitProtocol ? trimmed : `${inferredProtocol}://${trimmed}`;
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

function resolveProductionApiBaseUrlCandidates(preferredBaseUrl?: string | null) {
  const candidates: string[] = [];

  addBaseUrlCandidate(candidates, normalizeApiBaseUrl(preferredBaseUrl));
  for (const candidate of PRODUCTION_API_BASE_URL_CANDIDATES) {
    addBaseUrlCandidate(candidates, normalizeApiBaseUrl(candidate));
  }

  return candidates;
}

function isProductionApiBaseUrl(baseUrl: string | null) {
  if (!baseUrl) {
    return false;
  }

  return resolveProductionApiBaseUrlCandidates().includes(baseUrl);
}

function resolveLocalApiBaseUrlCandidates() {
  const candidates: string[] = [];
  addBaseUrlCandidate(candidates, normalizeApiBaseUrl(LOCAL_DEFAULT_API_BASE_URL));
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

function resolveApiBaseUrlCandidates(overrideBaseUrl?: string | null) {
  const normalizedOverride = normalizeApiBaseUrl(overrideBaseUrl);
  if (normalizedOverride) {
    if (isProductionApiBaseUrl(normalizedOverride)) {
      return resolveProductionApiBaseUrlCandidates(normalizedOverride);
    }

    return [normalizedOverride];
  }

  return resolveLocalApiBaseUrlCandidates();
}

function resolveApiServerPreset(baseUrl: string | null): ApiServerPreset {
  if (isProductionApiBaseUrl(baseUrl)) {
    return "production";
  }

  if (!baseUrl) {
    return "local";
  }

  return "custom";
}

async function requestMobileApi<T>(baseUrl: string, path: string, init?: RequestInit) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseHasApiSuffix = normalizedBaseUrl.endsWith("/api");
  const requestPath = baseHasApiSuffix
    ? normalizedPath === "/api"
      ? ""
      : normalizedPath.startsWith("/api/")
        ? normalizedPath.slice(4)
        : normalizedPath
    : normalizedPath;
  const requestUrl = `${normalizedBaseUrl}${requestPath}`;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, MOBILE_API_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      ...init,
      signal: timeoutController.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Timeout przy połączeniu z API (${baseUrl}). Sprawdź adres i sieć.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = (await response.json().catch(() => ({}))) as T & MobileApiError;

  if (!response.ok) {
    const errorMessage =
      (typeof data.message === "string" && data.message.trim()) ||
      (typeof data.error?.message === "string" && data.error.message.trim()) ||
      (typeof data.data?.error?.message === "string" && data.data.error.message.trim()) ||
      null;
    throw new Error(
      `HTTP ${response.status} [${requestUrl}]${errorMessage ? ` ${errorMessage}` : ""}`,
    );
  }

  return data as T;
}

function isTeamColor(value: string | null): value is TeamColor {
  return TEAM_COLORS.some((color) => color.key === value);
}

function normalizeOccupancyMap(
  value: Record<string, number> | undefined,
): Record<string, number> {
  if (!value) {
    return {};
  }

  const normalized: Record<string, number> = {};
  for (const [key, slot] of Object.entries(value)) {
    if (typeof key !== "string" || !key.trim()) {
      continue;
    }
    if (!Number.isInteger(slot) || slot < 1) {
      continue;
    }
    normalized[key] = slot;
  }

  return normalized;
}

function normalizeCustomizationOccupancy(value: {
  colors?: Record<string, number>;
  icons?: Record<string, number>;
} | null | undefined) {
  return {
    colors: normalizeOccupancyMap(value?.colors),
    icons: normalizeOccupancyMap(value?.icons),
  };
}

export function RealizationOnboardingScreen({
  onComplete,
  recoveryIntent,
  onRecoveryConsumed,
}: RealizationOnboardingScreenProps) {
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
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [teamPickerError, setTeamPickerError] = useState<string | null>(null);

  const [realizationCode, setRealizationCode] = useState("");
  const [apiBaseUrlOverride, setApiBaseUrlOverride] = useState<string | null>(null);
  const [apiServerPreset, setApiServerPreset] = useState<ApiServerPreset>("local");
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
  const [selectedLanguage, setSelectedLanguage] = useState<RealizationLanguage>("polish");

  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("Drużyna");
  const [teamColor, setTeamColor] = useState<TeamColor>("amber");
  const [teamIcon, setTeamIcon] = useState("🦊");
  const [customizationBlockMessage, setCustomizationBlockMessage] =
    useState<string | null>(null);
  const [customizationOccupancy, setCustomizationOccupancy] = useState(() =>
    normalizeCustomizationOccupancy(null),
  );
  const liveCustomizationRequestRef = useRef(0);

  const selectedColor = useMemo(
    () => TEAM_COLORS.find((color) => color.key === teamColor) ?? TEAM_COLORS[0],
    [teamColor],
  );
  const bannerTextColor = resolveBannerTextColor(selectedColor.hex);
  const bannerMutedTextColor =
    bannerTextColor === "#0f172a" ? "rgba(15, 23, 42, 0.72)" : "rgba(248, 250, 252, 0.86)";
  const bannerIconBackground =
    bannerTextColor === "#0f172a" ? "rgba(255, 255, 255, 0.52)" : "rgba(15, 23, 42, 0.22)";
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

  const activeLanguageOptions = useMemo(
    () => activeRealization?.availableLanguages ?? [],
    [activeRealization?.availableLanguages],
  );
  const hasMultipleLanguageOptions = activeLanguageOptions.length > 1;
  const currentLanguageFlag = getRealizationLanguageFlag(
    activeLanguageOptions.find((option) => option.value === selectedLanguage)?.value ?? selectedLanguage,
  );

  const selectedLanguageLabel =
    activeLanguageOptions.find((option) => option.value === selectedLanguage)?.label ??
    (selectedLanguage === "other"
      ? activeRealization?.customLanguage?.trim() || getRealizationLanguageLabel(selectedLanguage)
      : getRealizationLanguageLabel(selectedLanguage));

  useEffect(() => {
    if (!hasMultipleLanguageOptions && isLanguagePickerOpen) {
      setIsLanguagePickerOpen(false);
    }
  }, [hasMultipleLanguageOptions, isLanguagePickerOpen]);

  const buildSessionStatePath = useCallback(
    (token: string) => {
      const encodedToken = encodeURIComponent(token);
      const languageSuffix =
        selectedLanguage && isRealizationLanguage(selectedLanguage)
          ? `&selectedLanguage=${encodeURIComponent(selectedLanguage)}`
          : "";
      return `/api/mobile/session/state?sessionToken=${encodedToken}${languageSuffix}`;
    },
    [selectedLanguage],
  );

  const refreshCustomizationState = useCallback(async () => {
    if (!apiBaseUrl || !sessionToken) {
      return;
    }

    const state = await requestMobileApi<MobileSessionStateResponse>(
      apiBaseUrl,
      buildSessionStatePath(sessionToken),
    );

    setCustomizationOccupancy(
      normalizeCustomizationOccupancy(state.customizationOccupancy),
    );

    if (state.team?.slotNumber === selectedTeam) {
      if (isTeamColor(state.team.color)) {
        setTeamColor(state.team.color);
      }

      if (
        typeof state.team.badgeKey === "string" &&
        TEAM_ICONS.includes(state.team.badgeKey)
      ) {
        setTeamIcon(state.team.badgeKey);
      }
    }
  }, [apiBaseUrl, buildSessionStatePath, selectedTeam, sessionToken]);

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
        setApiServerPreset(resolveApiServerPreset(normalizedOverride));
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
    if (!recoveryIntent) {
      return;
    }

    setRealizationCode(recoveryIntent.realizationCode);
    if (typeof recoveryIntent.apiBaseUrl === "string") {
      const normalizedRecoveryApiBaseUrl = normalizeApiBaseUrl(recoveryIntent.apiBaseUrl);
      setApiBaseUrlOverride(normalizedRecoveryApiBaseUrl);
      setApiServerPreset(resolveApiServerPreset(normalizedRecoveryApiBaseUrl));
    }
    setSetupMessage(recoveryIntent.notice);
    setSetupState("loading");
    setScreen("code");
    if (!deviceId) {
      return;
    }

    void onSubmitCode(recoveryIntent.realizationCode, recoveryIntent.apiBaseUrl).finally(() => {
      onRecoveryConsumed?.();
    });
  }, [deviceId, onRecoveryConsumed, recoveryIntent]);

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
      let lastProbeError: unknown = null;

      for (const candidate of baseUrlCandidates) {
        if (isCancelled) {
          return;
        }

        setApiConnectionTarget(candidate);

        try {
          await requestMobileApi<MobileBootstrapResponse>(candidate, "/api/mobile/bootstrap");

          if (!isCancelled) {
            setApiConnectionStatus("connected");
            setApiConfigMessage(null);
          }
          return;
        } catch (error) {
          lastProbeError = error;
          // try next candidate
        }
      }

      if (!isCancelled) {
        setApiConnectionStatus("disconnected");
        if (lastProbeError) {
          setApiConfigMessage(getErrorMessage(lastProbeError));
        }
      }
    };

    void probeConnection();

    return () => {
      isCancelled = true;
    };
  }, [apiBaseUrlOverride, apiProbeNonce, isHydratingApiConfig]);

  useEffect(() => {
    if (screen !== "customization" || !apiBaseUrl || !sessionToken) {
      return;
    }

    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollCustomizationOccupancy = async () => {
      try {
        await refreshCustomizationState();
      } catch {
        // Keep current occupancy; next poll will retry.
      } finally {
        if (!isCancelled) {
          timeoutId = setTimeout(
            () => void pollCustomizationOccupancy(),
            CUSTOMIZATION_OCCUPANCY_POLL_INTERVAL_MS,
          );
        }
      }
    };

    void pollCustomizationOccupancy();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [refreshCustomizationState, screen]);

  function completeOnboarding(nextSessionToken: string, nextTeamName: string) {
    const normalizedStatus = normalizeRealizationStatus(activeRealization?.status);
    const awaitingAdminStart = normalizedStatus === "planned" && Boolean(apiBaseUrl);
    const effectiveSelectedLanguage =
      selectedLanguage ??
      activeRealization?.selectedLanguage ??
      activeRealization?.language ??
      "polish";

    onComplete?.({
      realizationId: activeRealization?.id ?? null,
      realizationCode,
      sessionToken: nextSessionToken,
      apiBaseUrl,
      selectedLanguage: effectiveSelectedLanguage,
      realization: activeRealization
        ? {
            id: activeRealization.id,
            companyName: activeRealization.companyName,
            language: activeRealization.language,
            customLanguage: activeRealization.customLanguage?.trim() || undefined,
            selectedLanguage: effectiveSelectedLanguage,
            availableLanguages: activeRealization.availableLanguages ?? [],
            status: normalizedStatus,
            scheduledAt: activeRealization.scheduledAt,
            durationMinutes: normalizeDurationMinutes(activeRealization.durationMinutes),
            joinCode: activeRealization.joinCode,
            teamCount: activeRealization.teamCount,
            stationIds: activeRealization.stationIds,
            locationRequired: activeRealization.locationRequired,
            showLeaderboard: activeRealization.showLeaderboard !== false,
            introText: activeRealization.introText?.trim() || undefined,
            gameRules: activeRealization.gameRules?.trim() || undefined,
          }
        : null,
      awaitingAdminStart,
      showGameRulesAfterStart:
        !awaitingAdminStart && Boolean(activeRealization?.gameRules?.trim()),
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

  async function onSubmitCode(
    overrideCode?: string,
    preferredApiBaseUrl?: string | null,
  ) {
    const normalizedCode = (overrideCode ?? realizationCode).trim().toUpperCase();

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
    setSelectedLanguage("polish");
    setApiBaseUrl(null);
    setSessionToken(null);
    setSelectedTeam(null);
    setCustomizationBlockMessage(null);
    setCustomizationOccupancy(normalizeCustomizationOccupancy(null));
    setTeamPickerError(null);
    setIsTeamPickerOpen(false);

    const baseUrlCandidates = resolveApiBaseUrlCandidates(
      preferredApiBaseUrl ?? apiBaseUrlOverride,
    );

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

      const normalizedLanguage =
        typeof realization.language === "string" && isRealizationLanguage(realization.language.toLowerCase())
          ? (realization.language.toLowerCase() as RealizationLanguage)
          : undefined;
      const normalizedCustomLanguage = realization.customLanguage?.trim() || undefined;
      const normalizedAvailableLanguages = normalizeLanguageOptions(
        realization.availableLanguages,
        normalizedLanguage,
        normalizedCustomLanguage,
      );
      const normalizedSelectedLanguage =
        (typeof realization.selectedLanguage === "string" &&
        isRealizationLanguage(realization.selectedLanguage.toLowerCase())
          ? (realization.selectedLanguage.toLowerCase() as RealizationLanguage)
          : undefined) ??
        normalizedLanguage ??
        normalizedAvailableLanguages[0]?.value ??
        "polish";

      const normalizedRealization = {
        ...realization,
        language: normalizedLanguage,
        customLanguage: normalizedCustomLanguage,
        selectedLanguage: normalizedSelectedLanguage,
        availableLanguages: normalizedAvailableLanguages,
        status: normalizeRealizationStatus(realization.status),
        introText: realization.introText?.trim() || undefined,
        gameRules: realization.gameRules?.trim() || undefined,
        durationMinutes: normalizeDurationMinutes(realization.durationMinutes),
        showLeaderboard: realization.showLeaderboard !== false,
      };

      setApiBaseUrl(resolvedBaseUrl);
      setActiveRealization(normalizedRealization);
      setSelectedLanguage(normalizedRealization.selectedLanguage);
      setSessionToken(join.sessionToken);
      setSelectedTeam(join.team.slotNumber);
      setTeamName(join.team.name?.trim() || `Drużyna ${join.team.slotNumber}`);
      setCustomizationBlockMessage(null);
      setCustomizationOccupancy(
        normalizeCustomizationOccupancy(join.customizationOccupancy),
      );

      if (isTeamColor(join.team.color)) {
        setTeamColor(join.team.color);
      } else {
        setTeamColor("amber");
      }

      if (typeof join.team.badgeKey === "string" && TEAM_ICONS.includes(join.team.badgeKey)) {
        setTeamIcon(join.team.badgeKey);
      } else {
        setTeamIcon("🦊");
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
      setCustomizationBlockMessage(null);
      setCustomizationOccupancy(
        normalizeCustomizationOccupancy(result.customizationOccupancy),
      );

      if (isTeamColor(result.team.color)) {
        setTeamColor(result.team.color);
      } else {
        setTeamColor("amber");
      }

      if (typeof result.team.badgeKey === "string" && TEAM_ICONS.includes(result.team.badgeKey)) {
        setTeamIcon(result.team.badgeKey);
      } else {
        setTeamIcon("🦊");
      }

      const reassignmentMessage =
        result.reassignment?.replacedExistingAssignment === true
          ? result.reassignment.message ?? "Drużyna była już zajęta na innym urządzeniu. Przypisanie zostało przełączone."
          : null;
      setSetupMessage(
        reassignmentMessage ??
          `Przydzielono ręcznie: Drużyna ${result.team.slotNumber}.`,
      );
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
      setCustomizationBlockMessage(null);
      setCustomizationOccupancy(
        normalizeCustomizationOccupancy(result.customizationOccupancy),
      );
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

  const handleTeamNameChange = useCallback((value: string) => {
    setTeamName(value);
    setCustomizationBlockMessage(null);
    setSaveMessage(null);
  }, []);

  const persistLiveCustomization = useCallback(
    async (input: {
      nextColor?: TeamColor;
      nextIcon?: string;
      previousColor: TeamColor;
      previousIcon: string;
    }) => {
      if (!sessionToken || !apiBaseUrl) {
        return;
      }

      const requestId = liveCustomizationRequestRef.current + 1;
      liveCustomizationRequestRef.current = requestId;

      try {
        const result = await requestMobileApi<MobileUpdateCustomizationResponse>(
          apiBaseUrl,
          "/api/mobile/team/customization",
          {
            method: "POST",
            body: JSON.stringify({
              sessionToken,
              ...(typeof input.nextColor !== "undefined"
                ? { color: input.nextColor }
                : {}),
              ...(typeof input.nextIcon !== "undefined"
                ? { badgeKey: input.nextIcon }
                : {}),
            }),
          },
        );

        if (liveCustomizationRequestRef.current !== requestId) {
          return;
        }

        setCustomizationOccupancy(
          normalizeCustomizationOccupancy(result.customizationOccupancy),
        );
        setCustomizationBlockMessage(null);
      } catch (error) {
        if (liveCustomizationRequestRef.current !== requestId) {
          return;
        }

        setTeamColor(input.previousColor);
        setTeamIcon(input.previousIcon);
        setSaveMessage(`Nie udało się zapisać zmian na żywo: ${getErrorMessage(error)}`);
        await refreshCustomizationState().catch(() => undefined);
      }
    },
    [apiBaseUrl, refreshCustomizationState, sessionToken],
  );

  const handleTeamColorChange = useCallback((value: TeamColor) => {
    const previousColor = teamColor;
    const previousIcon = teamIcon;
    const occupiedBy = customizationOccupancy.colors[value];
    if (
      typeof occupiedBy === "number" &&
      (!selectedTeam || occupiedBy !== selectedTeam)
    ) {
      setCustomizationBlockMessage(
        `Ten kolor jest już wybrany przez Drużynę ${occupiedBy}. Wybierz inny.`,
      );
      return;
    }

    setTeamColor(value);
    setCustomizationBlockMessage(null);
    setSaveMessage(null);
    void persistLiveCustomization({
      nextColor: value,
      previousColor,
      previousIcon,
    });
  }, [
    customizationOccupancy.colors,
    persistLiveCustomization,
    selectedTeam,
    teamColor,
    teamIcon,
  ]);

  const handleTeamIconChange = useCallback((value: string) => {
    const previousColor = teamColor;
    const previousIcon = teamIcon;
    const occupiedBy = customizationOccupancy.icons[value];
    if (
      typeof occupiedBy === "number" &&
      (!selectedTeam || occupiedBy !== selectedTeam)
    ) {
      setCustomizationBlockMessage(
        `Ta emotikona jest już wybrana przez Drużynę ${occupiedBy}. Wybierz inną.`,
      );
      return;
    }

    setTeamIcon(value);
    setCustomizationBlockMessage(null);
    setSaveMessage(null);
    void persistLiveCustomization({
      nextIcon: value,
      previousColor,
      previousIcon,
    });
  }, [
    customizationOccupancy.icons,
    persistLiveCustomization,
    selectedTeam,
    teamColor,
    teamIcon,
  ]);

  const canSaveCustomization = Boolean(selectedTeam) && !isSaving;

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
      setApiConfigMessage("Podaj poprawny adres serwera, np. http://192.168.18.2:3001.");
      return;
    }

    setApiBaseUrlOverride(normalized);
    setApiServerPreset(resolveApiServerPreset(normalized));
    setApiBaseUrlDraft(normalized);
    setApiConnectionTarget(normalized);
    setApiConnectionStatus("checking");
    triggerApiProbe();
    setIsApiConfigOpen(false);

    try {
      await AsyncStorage.setItem(API_BASE_URL_OVERRIDE_STORAGE_KEY, normalized);
      setApiConfigMessage("Zapisano adres serwera API.");
    } catch {
      setApiConfigMessage(
        "Adres ustawiony dla bieżącej sesji, ale nie udało się zapisać go na stałe.",
      );
    }
  }

  async function applyApiServerPreset(preset: "local" | "production") {
    if (preset === "production") {
      const normalizedProductionBaseUrl = normalizeApiBaseUrl(PRODUCTION_API_BASE_URL);
      if (!normalizedProductionBaseUrl) {
        setApiConfigMessage("Nie udało się ustawić serwera produkcyjnego.");
        return;
      }

      setApiServerPreset("production");
      setApiBaseUrlOverride(normalizedProductionBaseUrl);
      setApiBaseUrlDraft(normalizedProductionBaseUrl);
      setApiConnectionTarget(normalizedProductionBaseUrl);
      setApiConnectionStatus("checking");
      triggerApiProbe();
      setIsApiConfigOpen(false);

      try {
        await AsyncStorage.setItem(API_BASE_URL_OVERRIDE_STORAGE_KEY, normalizedProductionBaseUrl);
        setApiConfigMessage("Wybrano serwer produkcyjny API.");
      } catch {
        setApiConfigMessage(
          "Serwer produkcyjny ustawiony dla bieżącej sesji, ale nie udało się zapisać go na stałe.",
        );
      }
      return;
    }

    await resetApiServerOverride();
  }

  async function resetApiServerOverride() {
    const fallbackCandidates = resolveLocalApiBaseUrlCandidates();
    setApiServerPreset("local");
    setApiBaseUrlOverride(null);
    setApiBaseUrlDraft(fallbackCandidates[0] ?? "");
    setApiConnectionTarget(fallbackCandidates[0] ?? null);
    setApiConnectionStatus(fallbackCandidates.length > 0 ? "checking" : "config-missing");
    triggerApiProbe();
    setIsApiConfigOpen(false);

    try {
      await AsyncStorage.removeItem(API_BASE_URL_OVERRIDE_STORAGE_KEY);
      setApiConfigMessage("Przywrócono domyślną konfigurację serwera.");
    } catch {
      setApiConfigMessage(
        "Przywrócono domyślną konfigurację dla tej sesji, ale nie udało się zapisać jej na stałe.",
      );
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
          {screen !== "customization" && (
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
          )}

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
                {apiConfigMessage ? (
                  <Text
                    className="mt-2 text-xs"
                    style={{
                      color:
                        apiConnectionStatus === "disconnected" ||
                        /^HTTP\s+\d{3}/i.test(apiConfigMessage) ||
                        apiConfigMessage.startsWith("Nie") ||
                        apiConfigMessage.startsWith("Brak połączenia")
                          ? EXPEDITION_THEME.danger
                          : EXPEDITION_THEME.textMuted,
                    }}
                  >
                    {apiConfigMessage}
                  </Text>
                ) : null}

                {isApiConfigOpen && (
                  <View className="mt-3 gap-2">
                    <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                      Szybki wybór
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        className={`flex-1 border active:opacity-90 ${isTabletLayout ? "rounded-2xl px-3 py-2.5" : "rounded-xl px-3 py-2"}`}
                        style={{
                          borderColor: apiServerPreset === "local" ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                          backgroundColor: apiServerPreset === "local" ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panel,
                        }}
                        onPress={() => void applyApiServerPreset("local")}
                      >
                        <Text className="text-center text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          Lokalna baza testowa
                        </Text>
                      </Pressable>
                      <Pressable
                        className={`flex-1 border active:opacity-90 ${isTabletLayout ? "rounded-2xl px-3 py-2.5" : "rounded-xl px-3 py-2"}`}
                        style={{
                          borderColor: apiServerPreset === "production" ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                          backgroundColor: apiServerPreset === "production" ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panel,
                        }}
                        onPress={() => void applyApiServerPreset("production")}
                      >
                        <Text className="text-center text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          Produkcja
                        </Text>
                      </Pressable>
                    </View>

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
                      placeholder="http://192.168.18.2:3001"
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

              <Pressable
                className="mt-2 rounded-2xl border px-4 py-3 active:opacity-90"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
                onPress={() => setScreen("api")}
              >
                <Text className="text-center text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  Cofnij do etapu 1
                </Text>
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

              {hasMultipleLanguageOptions && (
                <View className="mt-3 items-end">
                  <Pressable
                    className="h-11 w-11 items-center justify-center rounded-full border active:opacity-90"
                    style={{
                      borderColor: EXPEDITION_THEME.border,
                      backgroundColor: EXPEDITION_THEME.panelMuted,
                    }}
                    onPress={() => setIsLanguagePickerOpen(true)}
                  >
                    <Text className="text-xl">{currentLanguageFlag}</Text>
                  </Pressable>
                </View>
              )}

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
                  onPress={() => setScreen("customization")}
                  disabled={!selectedTeam}
                >
                  <Text className="text-center font-semibold text-zinc-950">
                    Przejdź do edytora banera
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {screen === "customization" && (
            <TeamCustomizationStep
              isTabletLayout={isTabletLayout}
              selectedTeam={selectedTeam}
              teamName={teamName}
              teamColor={teamColor}
              teamIcon={teamIcon}
              selectedColor={selectedColor}
              bannerTextColor={bannerTextColor}
              bannerMutedTextColor={bannerMutedTextColor}
              bannerIconBackground={bannerIconBackground}
              saveMessage={saveMessage}
              isSaving={isSaving}
              canSave={canSaveCustomization}
              occupiedColors={customizationOccupancy.colors}
              occupiedIcons={customizationOccupancy.icons}
              blockMessage={customizationBlockMessage}
              onTeamNameChange={handleTeamNameChange}
              onTeamColorChange={handleTeamColorChange}
              onTeamIconChange={handleTeamIconChange}
              onSave={onSaveCustomization}
            />
          )}

          {screen !== "customization" && (
            <Text className="px-2 text-center text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
              Etap 1 sprawdza API, etap 2 aktywuje realizację kodem, etap 3 finalizuje przydział, a potem konfigurujesz baner drużyny.
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isLanguagePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguagePickerOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center px-4"
          style={{ backgroundColor: "rgba(12, 18, 15, 0.72)" }}
          onPress={() => setIsLanguagePickerOpen(false)}
        >
          <Pressable
            className={`w-full rounded-3xl border ${isTabletLayout ? "p-6" : "p-4"}`}
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
              maxWidth: isTabletLayout ? 760 : 640,
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              Wybierz język treści gry
            </Text>
            <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
              Wybrany: {selectedLanguageLabel}
            </Text>

            <View className="mt-3 gap-2">
              {activeLanguageOptions.map((option) => {
                const isActive = option.value === selectedLanguage;

                return (
                  <Pressable
                    key={`language-option-${option.value}`}
                    className="rounded-2xl border px-3 py-3 active:opacity-90"
                    style={{
                      borderColor: isActive ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                      backgroundColor: isActive ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                    }}
                    onPress={() => {
                      setSelectedLanguage(option.value);
                      setIsLanguagePickerOpen(false);
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-lg">{getRealizationLanguageFlag(option.value)}</Text>
                        <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                          {option.label}
                        </Text>
                      </View>
                      {isActive ? (
                        <Text className="text-sm font-bold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                          ✓
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              className="mt-4 rounded-2xl border px-3 py-3 active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={() => setIsLanguagePickerOpen(false)}
            >
              <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                Zamknij
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
