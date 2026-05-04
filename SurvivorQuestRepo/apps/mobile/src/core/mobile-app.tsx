import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ExpeditionStageScreen } from "../features/expedition-stage/ui/expedition-stage-screen";
import type {
  OnboardingSession,
  RealizationLanguage,
} from "../features/onboarding/model/types";
import { RealizationOnboardingScreen } from "../features/onboarding/ui/realization-onboarding-screen";
import {
  EXPEDITION_THEME,
  getExpeditionThemeMode,
  getExpeditionThemePalette,
  setExpeditionThemeMode,
  type ExpeditionThemeMode,
} from "../features/onboarding/model/constants";
import { UiLanguageProvider, resolveUiLanguage, type UiLanguage } from "../features/i18n";
import {
  fetchMobileSessionState,
  isSessionTokenInvalidError,
} from "../features/expedition-stage/api/mobile-session.api";

const ONBOARDING_SESSION_STORAGE_KEY = "sq.mobile.onboarding-session.v1";
const MOBILE_THEME_PREFERENCE_STORAGE_KEY = "sq.mobile.theme.preference.v1";
const ADMIN_START_POLL_INTERVAL_MS = 3000;
const STALE_REALIZATION_AUTO_RESUME_GRACE_MS = 6 * 60 * 60 * 1000;
const TABLET_MIN_SHORT_EDGE = 700;
const TABLET_MIN_WIDTH = 900;

type MobileThemePreference = ExpeditionThemeMode;

type OnboardingRecoveryIntent = {
  realizationCode: string;
  apiBaseUrl: string | null;
  notice: string;
};

type RulesBlock = {
  kind: "paragraph" | "unordered" | "ordered";
  text: string;
  order?: number;
};

type InlineRulesPart = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

function parseRulesBlocks(rawText: string): RulesBlock[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  return lines.map((line) => {
    const unorderedMatch = /^[-*]\s+(.*)$/.exec(line);
    if (unorderedMatch) {
      return { kind: "unordered", text: unorderedMatch[1].trim() };
    }

    const orderedMatch = /^(\d+)\.\s+(.*)$/.exec(line);
    if (orderedMatch) {
      return {
        kind: "ordered",
        order: Number(orderedMatch[1]),
        text: orderedMatch[2].trim(),
      };
    }

    return { kind: "paragraph", text: line.trim() };
  });
}

function parseInlineRules(text: string): InlineRulesPart[] {
  const tokenPattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts: InlineRulesPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index) });
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push({ text: token.slice(1, -1), italic: true });
    } else {
      parts.push({ text: token });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts;
}

type GameRulesScreenProps = {
  rulesText: string;
  onClose: () => void;
  language: UiLanguage;
};

const MOBILE_APP_TEXT: Record<
  UiLanguage,
  {
    gameRulesTitle: string;
    noGameRules: string;
    close: string;
    introFallback: string;
    introTextLabel: string;
    waitForStart: string;
    sessionRefreshTitle: string;
    sessionResetNotice: string;
    mobileSessionReset: string;
    serverReconnect: string;
    themeLabel: string;
    themeLight: string;
    themeDark: string;
  }
> = {
  polish: {
    gameRulesTitle: "Zasady gry",
    noGameRules: "Brak zasad gry dla tej realizacji.",
    close: "Zamknij",
    introFallback: "Przygotujcie się do gry. Czekajcie na globalny start aplikacji od administratora.",
    introTextLabel: "Tekst wstępu",
    waitForStart: "Czekamy na zatwierdzenie startu aplikacji...",
    sessionRefreshTitle: "Sesja wymaga odświeżenia",
    sessionResetNotice:
      "Wykryto reset realizacji lub wygaśnięcie sesji{reasonSuffix}. Przekierowaliśmy do Etapu 3, aby ponownie potwierdzić drużynę.",
    mobileSessionReset: "Sesja mobilna została zresetowana ({reason}).",
    serverReconnect: "Brak połączenia z serwerem. Ponawiam sprawdzenie startu...",
    themeLabel: "Motyw",
    themeLight: "Jasny",
    themeDark: "Ciemny",
  },
  english: {
    gameRulesTitle: "Game rules",
    noGameRules: "No game rules available for this realization.",
    close: "Close",
    introFallback: "Get ready for the game. Wait for the global app start approval from the administrator.",
    introTextLabel: "Intro text",
    waitForStart: "Waiting for app start approval...",
    sessionRefreshTitle: "Session needs refresh",
    sessionResetNotice:
      "A realization reset or session expiration was detected{reasonSuffix}. We redirected you to Step 3 to confirm the team again.",
    mobileSessionReset: "Mobile session was reset ({reason}).",
    serverReconnect: "No connection to the server. Retrying start check...",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
  },
  ukrainian: {
    gameRulesTitle: "Правила гри",
    noGameRules: "Для цієї реалізації немає правил гри.",
    close: "Закрити",
    introFallback: "Підготуйтеся до гри. Дочекайтеся глобального старту застосунку від адміністратора.",
    introTextLabel: "Вступний текст",
    waitForStart: "Очікуємо підтвердження старту застосунку...",
    sessionRefreshTitle: "Сесію потрібно оновити",
    sessionResetNotice:
      "Виявлено скидання реалізації або завершення сесії{reasonSuffix}. Вас перенаправлено до кроку 3 для повторного підтвердження команди.",
    mobileSessionReset: "Мобільну сесію скинуто ({reason}).",
    serverReconnect: "Немає з'єднання із сервером. Повторюємо перевірку старту...",
    themeLabel: "Тема",
    themeLight: "Світла",
    themeDark: "Темна",
  },
  russian: {
    gameRulesTitle: "Правила игры",
    noGameRules: "Для этой реализации нет правил игры.",
    close: "Закрыть",
    introFallback: "Подготовьтесь к игре. Дождитесь глобального старта приложения от администратора.",
    introTextLabel: "Вступительный текст",
    waitForStart: "Ожидаем подтверждение старта приложения...",
    sessionRefreshTitle: "Сессию нужно обновить",
    sessionResetNotice:
      "Обнаружен сброс реализации или истечение сессии{reasonSuffix}. Вас перенаправили на шаг 3 для повторного подтверждения команды.",
    mobileSessionReset: "Мобильная сессия была сброшена ({reason}).",
    serverReconnect: "Нет соединения с сервером. Повторяем проверку старта...",
    themeLabel: "Тема",
    themeLight: "Светлая",
    themeDark: "Тёмная",
  },
};

function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function getNextThemePreference(preference: MobileThemePreference): MobileThemePreference {
  if (preference === "dark") {
    return "light";
  }

  return "dark";
}

function resolveRealizationDeadlineTimestamp(
  realization: Partial<NonNullable<OnboardingSession["realization"]>> | null | undefined,
) {
  if (!realization) {
    return null;
  }

  const scheduledAt = typeof realization.scheduledAt === "string" ? realization.scheduledAt.trim() : "";
  if (!scheduledAt) {
    return null;
  }

  const scheduledTimestamp = new Date(scheduledAt).getTime();
  if (!Number.isFinite(scheduledTimestamp)) {
    return null;
  }

  const rawDurationMinutes = typeof realization.durationMinutes === "number" ? realization.durationMinutes : NaN;
  if (!Number.isFinite(rawDurationMinutes)) {
    return null;
  }

  const durationMinutes = Math.max(1, Math.round(rawDurationMinutes));
  return scheduledTimestamp + durationMinutes * 60 * 1000;
}

function isPersistedSessionStale(session: Partial<OnboardingSession>, nowTimestamp = Date.now()) {
  const deadlineTimestamp = resolveRealizationDeadlineTimestamp(session.realization);
  if (deadlineTimestamp === null) {
    return false;
  }

  return nowTimestamp > deadlineTimestamp + STALE_REALIZATION_AUTO_RESUME_GRACE_MS;
}

function ThemeModeIcon({ mode, color }: { mode: ExpeditionThemeMode; color: string }) {
  if (mode === "light") {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="2" />
        <Path d="M12 2.5V5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M12 19V21.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M4.9 4.9L6.7 6.7" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M17.3 17.3L19.1 19.1" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M2.5 12H5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M19 12H21.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M4.9 19.1L6.7 17.3" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M17.3 6.7L19.1 4.9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.7 15.2A8.7 8.7 0 1 1 8.8 3.3a7 7 0 1 0 11.9 11.9Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GameRulesPopup({ rulesText, onClose, language }: GameRulesScreenProps) {
  const text = MOBILE_APP_TEXT[language];
  const blocks = parseRulesBlocks(rulesText);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isLightTheme = getExpeditionThemeMode() === "light";
  const shortestEdge = Math.min(windowWidth, windowHeight);
  const isTablet = windowWidth >= TABLET_MIN_WIDTH || shortestEdge >= TABLET_MIN_SHORT_EDGE;
  const panelHeight = isTablet
    ? Math.min(Math.max(windowHeight * 0.84, 560), 980)
    : Math.min(Math.max(windowHeight * 0.78, 420), 760);
  const panelMaxWidth = isTablet ? 920 : 560;
  const panelPadding = isTablet ? 24 : 20;
  const titleFontSize = isTablet ? 13 : 11;
  const rulesFontSize = isTablet ? 16 : 12;
  const rulesLineHeight = isTablet ? 28 : 20;
  const closeFontSize = isTablet ? 17 : 14;
  const closePaddingVertical = isTablet ? 14 : 10;

  return (
    <View
      className="absolute inset-0 items-center justify-center"
      style={{
        backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(5, 10, 8, 0.58)",
        paddingHorizontal: isTablet ? 28 : 24,
      }}
    >
      <View
        className="w-full rounded-3xl border"
        style={{
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panel,
          height: panelHeight,
          maxWidth: panelMaxWidth,
          padding: panelPadding,
        }}
      >
        <Text className="uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong, fontSize: titleFontSize }}>
          {text.gameRulesTitle}
        </Text>

        <ScrollView
          className="mt-3 flex-1 rounded-2xl border"
          contentContainerStyle={{
            paddingHorizontal: isTablet ? 18 : 12,
            paddingTop: isTablet ? 16 : 12,
            paddingBottom: isTablet ? 28 : 20,
          }}
          scrollIndicatorInsets={{ top: 8, bottom: 8 }}
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelMuted,
          }}
        >
          {blocks.length === 0 ? (
            <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: rulesFontSize, lineHeight: rulesLineHeight }}>
              {text.noGameRules}
            </Text>
          ) : (
            blocks.map((block, blockIndex) => {
              const parts = parseInlineRules(block.text);
              const prefix = block.kind === "unordered" ? "• " : block.kind === "ordered" ? `${block.order ?? 1}. ` : "";

              return (
                <Text
                  key={`${block.kind}-${blockIndex}`}
                  className="mb-1.5"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: rulesFontSize, lineHeight: rulesLineHeight }}
                >
                  {prefix ? (
                    <Text className="font-semibold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                      {prefix}
                    </Text>
                  ) : null}
                  {parts.map((part, partIndex) => (
                    <Text
                      key={`${blockIndex}-${partIndex}`}
                      style={{
                        fontWeight: part.bold ? "700" : "400",
                        fontStyle: part.italic ? "italic" : "normal",
                      }}
                    >
                      {part.text}
                    </Text>
                  ))}
                </Text>
              );
            })
          )}
        </ScrollView>

        <Pressable
          className="mt-4 rounded-2xl border px-4"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            paddingVertical: closePaddingVertical,
            minHeight: isTablet ? 56 : 44,
          }}
          onPress={onClose}
        >
          <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: closeFontSize }}>
            {text.close}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function IntroTextPreview({ text, language }: { text: string; language: UiLanguage }) {
  const uiText = MOBILE_APP_TEXT[language];
  const blocks = parseRulesBlocks(text);

  if (blocks.length === 0) {
    return (
      <Text className="mt-3 text-base leading-6" style={{ color: EXPEDITION_THEME.textPrimary }}>
        {uiText.introFallback}
      </Text>
    );
  }

  return (
    <View className="mt-3">
      {blocks.map((block, blockIndex) => {
        const parts = parseInlineRules(block.text);
        const prefix = block.kind === "unordered" ? "• " : block.kind === "ordered" ? `${block.order ?? 1}. ` : "";

        return (
          <Text
            key={`intro-${block.kind}-${blockIndex}`}
            className="mb-1 text-base leading-6"
            style={{ color: EXPEDITION_THEME.textPrimary }}
          >
            {prefix ? (
              <Text className="font-semibold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                {prefix}
              </Text>
            ) : null}
            {parts.map((part, partIndex) => (
              <Text
                key={`intro-${blockIndex}-${partIndex}`}
                style={{
                  fontWeight: part.bold ? "700" : "400",
                  fontStyle: part.italic ? "italic" : "normal",
                }}
              >
                {part.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </View>
  );
}

export function MobileApp() {
  const [onboardingSession, setOnboardingSession] = useState<OnboardingSession | null>(null);
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const [isWaitingForAdminStart, setIsWaitingForAdminStart] = useState(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const [recoveryIntent, setRecoveryIntent] = useState<OnboardingRecoveryIntent | null>(null);
  const [themePreference, setThemePreference] = useState<MobileThemePreference>("dark");
  const activeThemeMode = themePreference;
  setExpeditionThemeMode(activeThemeMode);
  const activeThemePalette = getExpeditionThemePalette(activeThemeMode);
  const uiLanguage = resolveUiLanguage(
    onboardingSession?.selectedLanguage ??
      onboardingSession?.realization?.selectedLanguage ??
      onboardingSession?.realization?.language,
  );
  const text = MOBILE_APP_TEXT[uiLanguage];
  const statusBarStyle: "light" | "dark" = activeThemeMode === "dark" ? "light" : "dark";

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    let isActive = true;
    const applyImmersiveMode = async () => {
      if (!isActive) {
        return;
      }

      try {
        await NavigationBar.setButtonStyleAsync(activeThemeMode === "dark" ? "light" : "dark");
        await NavigationBar.setVisibilityAsync("hidden");
      } catch {
        // ignore - immersive mode is best effort on Android devices
      }
    };

    void applyImmersiveMode();
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void applyImmersiveMode();
      }
    });

    return () => {
      isActive = false;
      appStateSubscription.remove();
    };
  }, [activeThemeMode]);

  useEffect(() => {
    let isActive = true;

    const hydrateSessionAndTheme = async () => {
      try {
        const [storedSession, storedThemePreference] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_SESSION_STORAGE_KEY),
          AsyncStorage.getItem(MOBILE_THEME_PREFERENCE_STORAGE_KEY),
        ]);

        if (!isActive) {
          return;
        }

        if (storedThemePreference === "light" || storedThemePreference === "dark") {
          setThemePreference(storedThemePreference);
        }

        if (!storedSession) {
          return;
        }

        const parsed = JSON.parse(storedSession) as Partial<OnboardingSession>;
        if (typeof parsed?.sessionToken === "string" && parsed.sessionToken.trim().length > 0) {
          if (isPersistedSessionStale(parsed)) {
            await AsyncStorage.removeItem(ONBOARDING_SESSION_STORAGE_KEY);
            return;
          }
          setOnboardingSession(parsed as OnboardingSession);
        }
      } catch {
        // keep onboarding as fallback
      } finally {
        if (isActive) {
          setIsHydratingSession(false);
        }
      }
    };

    void hydrateSessionAndTheme();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleThemePreferenceToggle() {
    const nextPreference = getNextThemePreference(themePreference);
    setThemePreference(nextPreference);
    await AsyncStorage.setItem(MOBILE_THEME_PREFERENCE_STORAGE_KEY, nextPreference);
  }

  const shouldShowGlobalThemeButton = !onboardingSession || isWaitingForAdminStart;
  const themeSwitchButton = (
    <Pressable
      className="absolute right-4 z-50 rounded-full p-2.5 active:opacity-90"
      style={{
        top: 14,
        backgroundColor: activeThemePalette.panelStrong,
      }}
      onPress={() => void handleThemePreferenceToggle()}
    >
      <ThemeModeIcon mode={activeThemeMode} color={activeThemePalette.textPrimary} />
    </Pressable>
  );

  async function handleComplete(nextSession: OnboardingSession) {
    setOnboardingSession(nextSession);
    await AsyncStorage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  }

  async function handleSelectedLanguageChange(nextLanguage: RealizationLanguage) {
    setOnboardingSession((current) => {
      if (!current) {
        return current;
      }

      const nextSession: OnboardingSession = {
        ...current,
        selectedLanguage: nextLanguage,
        realization: current.realization
          ? {
              ...current.realization,
              selectedLanguage: nextLanguage,
            }
          : null,
      };

      void AsyncStorage.setItem(
        ONBOARDING_SESSION_STORAGE_KEY,
        JSON.stringify(nextSession),
      );
      return nextSession;
    });
  }

  function resolveSessionInvalidReason(error: unknown) {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message.trim();
    }

    return "nieprawidłowa sesja";
  }

  async function resetToOnboardingWithMessage(reason?: string) {
    const realizationCode = onboardingSession?.realizationCode?.trim().toUpperCase() ?? "";
    const apiBaseUrl = onboardingSession?.apiBaseUrl?.trim() || null;
    const reasonSuffix = reason && reason.trim().length > 0 ? ` (${reason.trim()})` : "";
    const notice = interpolate(text.sessionResetNotice, { reasonSuffix });

    if (realizationCode) {
      setRecoveryIntent({
        realizationCode,
        apiBaseUrl,
        notice,
      });
    } else {
      setRecoveryIntent(null);
    }

    Alert.alert(text.sessionRefreshTitle, notice);
    setIsWaitingForAdminStart(false);
    setWaitingError(null);
    setOnboardingSession(null);
    await AsyncStorage.removeItem(ONBOARDING_SESSION_STORAGE_KEY);
  }

  useEffect(() => {
    const shouldWaitForAdminStart = Boolean(
      onboardingSession?.awaitingAdminStart &&
        onboardingSession?.apiBaseUrl &&
        onboardingSession?.sessionToken &&
        onboardingSession.sessionToken.trim().length > 0,
    );
    setIsWaitingForAdminStart(shouldWaitForAdminStart);
    setWaitingError(null);
  }, [onboardingSession]);

  useEffect(() => {
    if (!isWaitingForAdminStart || !onboardingSession?.apiBaseUrl || !onboardingSession.sessionToken) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollUntilStarted = async () => {
      try {
        const nextState = await fetchMobileSessionState(
          onboardingSession.apiBaseUrl as string,
          onboardingSession.sessionToken,
          onboardingSession.selectedLanguage,
        );
        if (cancelled) {
          return;
        }

        if (nextState.realization.status === "in-progress") {
          const nextGameRules =
            nextState.realization.gameRules ?? onboardingSession.realization?.gameRules;
          const nextSelectedLanguage =
            nextState.realization.selectedLanguage ??
            onboardingSession.selectedLanguage ??
            onboardingSession.realization?.selectedLanguage ??
            onboardingSession.realization?.language;
          const nextSession: OnboardingSession = {
            ...onboardingSession,
            selectedLanguage: nextSelectedLanguage,
            awaitingAdminStart: false,
            showGameRulesAfterStart: Boolean(nextGameRules?.trim()),
            realization: onboardingSession.realization
              ? {
                  ...onboardingSession.realization,
                  language:
                    nextState.realization.language ??
                    onboardingSession.realization.language,
                  customLanguage:
                    nextState.realization.customLanguage ??
                    onboardingSession.realization.customLanguage,
                  selectedLanguage:
                    nextState.realization.selectedLanguage ??
                    nextSelectedLanguage ??
                    onboardingSession.realization.selectedLanguage,
                  availableLanguages:
                    nextState.realization.availableLanguages &&
                    nextState.realization.availableLanguages.length > 0
                      ? nextState.realization.availableLanguages
                      : onboardingSession.realization.availableLanguages,
                  status: "in-progress",
                  introText: nextState.realization.introText ?? onboardingSession.realization.introText,
                  gameRules: nextGameRules,
                }
              : null,
          };
          setIsWaitingForAdminStart(false);
          setWaitingError(null);
          setOnboardingSession(nextSession);
          await AsyncStorage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
          return;
        }

        timeoutId = setTimeout(() => {
          void pollUntilStarted();
        }, ADMIN_START_POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isSessionTokenInvalidError(error)) {
          const reason = resolveSessionInvalidReason(error);
          setWaitingError(interpolate(text.mobileSessionReset, { reason }));
          await resetToOnboardingWithMessage(reason);
          return;
        }

        setWaitingError(text.serverReconnect);
        timeoutId = setTimeout(() => {
          void pollUntilStarted();
        }, ADMIN_START_POLL_INTERVAL_MS);
      }
    };

    void pollUntilStarted();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isWaitingForAdminStart, onboardingSession, text.mobileSessionReset, text.serverReconnect]);

  if (isHydratingSession) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          edges={["left", "right"]}
          className="flex-1"
          style={{ backgroundColor: activeThemePalette.background }}
        >
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
          </View>
          {themeSwitchButton}
          <StatusBar style={statusBarStyle} hidden />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (onboardingSession && isWaitingForAdminStart) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          edges={["left", "right"]}
          className="flex-1"
          style={{ backgroundColor: activeThemePalette.background }}
        >
          <View className="flex-1 items-center justify-center px-6">
            <View
              className="w-full rounded-3xl border p-5"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
            >
              <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
                {text.introTextLabel}
              </Text>
              <IntroTextPreview text={onboardingSession.realization?.introText?.trim() || ""} language={uiLanguage} />
              <View className="mt-5 flex-row items-center gap-2">
                <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {waitingError ?? text.waitForStart}
                </Text>
              </View>
            </View>
          </View>
          {themeSwitchButton}
          <StatusBar style={statusBarStyle} hidden />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const shouldShowRulesPopup = Boolean(
    onboardingSession &&
      !isWaitingForAdminStart &&
      onboardingSession.showGameRulesAfterStart &&
      onboardingSession.realization?.gameRules?.trim(),
  );

  return (
    <SafeAreaProvider>
      <UiLanguageProvider language={uiLanguage}>
        <SafeAreaView
          edges={["left", "right"]}
          className="flex-1"
          style={{ backgroundColor: activeThemePalette.background }}
        >
          {onboardingSession ? (
            <ExpeditionStageScreen
              session={onboardingSession}
              onSessionInvalid={(reason) => {
                void resetToOnboardingWithMessage(reason);
              }}
              onSelectedLanguageChange={(language) => {
                void handleSelectedLanguageChange(language);
              }}
              themeMode={activeThemeMode}
              onToggleTheme={() => {
                void handleThemePreferenceToggle();
              }}
            />
          ) : (
            <RealizationOnboardingScreen
              onComplete={(session) => void handleComplete(session)}
              recoveryIntent={recoveryIntent}
              onRecoveryConsumed={() => setRecoveryIntent(null)}
            />
          )}
          {shouldShowGlobalThemeButton ? themeSwitchButton : null}
          {onboardingSession && shouldShowRulesPopup ? (
            <GameRulesPopup
              rulesText={onboardingSession.realization?.gameRules?.trim() || ""}
              language={uiLanguage}
              onClose={() => {
                const nextSession: OnboardingSession = {
                  ...onboardingSession,
                  showGameRulesAfterStart: false,
                };
                setOnboardingSession(nextSession);
                void AsyncStorage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
              }}
            />
          ) : null}
          <StatusBar style={statusBarStyle} hidden />
        </SafeAreaView>
      </UiLanguageProvider>
    </SafeAreaProvider>
  );
}
