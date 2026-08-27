import { type ReactNode, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpeditionStageScreen } from "../features/expedition-stage/ui/expedition-stage-screen";
import { RiskQuizScreen } from "../features/risk-quiz/ui/risk-quiz-screen";
import { DealingSuitsIndicator } from "../features/risk-quiz/components/dealing-suits-indicator";
import {
  getRealizationLanguageFlag,
  getRealizationLanguageLabel,
  type OnboardingSession,
  type RealizationLanguage,
  type RealizationLanguageOption,
} from "../features/onboarding/model/types";
import { RealizationOnboardingScreen } from "../features/onboarding/ui/realization-onboarding-screen";
import { shouldShowGameRulesPopup } from "../features/onboarding/model/game-rules";
import { applyLiveIntroText } from "../features/onboarding/model/waiting-session";
import { resolveStartCountdown } from "../features/onboarding/model/start-countdown";
import { StartCountdownPanel } from "../features/risk-quiz/components/start-countdown-panel";
import {
  EXPEDITION_THEME,
  getExpeditionThemeMode,
  getExpeditionThemePalette,
  setExpeditionThemeMode,
  type ExpeditionThemeFamily,
  type ExpeditionThemeMode,
} from "../features/onboarding/model/constants";
import { UiLanguageProvider, resolveUiLanguage, type UiLanguage } from "../features/i18n";
import {
  fetchMobileSessionState,
  getMobileApiErrorCode,
  getMobileApiErrorStatusCode,
  isSessionTokenInvalidError,
} from "../features/expedition-stage/api/mobile-session.api";
import { useAdaptiveLayout } from "../shared/layout/use-adaptive-layout";
import { AutoScrollingIntroBox, parseInlineRules, parseRulesBlocks } from "../shared/ui/intro-text-preview";
import { LanguagePickerModal } from "../shared/ui/language-picker-modal";
import { HiddenResetOnHold } from "../shared/ui/hidden-reset-on-hold";
import { useReduceMotion } from "../shared/a11y/use-reduce-motion";

const RYZYKANCI_LOGO = require("../../assets/ryzykanci-logo.png");
// Intrinsic 1599x984 of that file — used to size the box the logo is drawn
// into, since the <Image> itself is stretched to fill that box.
const RYZYKANCI_LOGO_ASPECT_RATIO = 1599 / 984;
const RYZYKANCI_GLOW_COLOR = "#f59e0b";
// One half-breath. Slow enough to read as ambient rather than as a pulse
// demanding attention — the screen it sits on is pure waiting.
const RYZYKANCI_GLOW_BREATH_MS = 2800;
// Matches the `px-6` the waiting column uses, so the halo bleeds back out to
// the screen edges the logo itself no longer touches.
const WAITING_CONTENT_PADDING = 24;

const ONBOARDING_SESSION_STORAGE_KEY = "sq.mobile.onboarding-session.v1";
const MOBILE_THEME_PREFERENCE_STORAGE_KEY = "sq.mobile.theme.preference.v1";
const ADMIN_START_POLL_INTERVAL_MS = 3000;
const ADMIN_START_POLL_TIMEOUT_MS = 8000;
const ADMIN_START_POLL_ERROR_THRESHOLD = 2;
const STALE_REALIZATION_AUTO_RESUME_GRACE_MS = 6 * 60 * 60 * 1000;

type MobileThemePreference = ExpeditionThemeMode;

type HorizontalSafeAreaProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

function HorizontalSafeArea({ children, className, style }: HorizontalSafeAreaProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className={className} style={[style, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      {children}
    </View>
  );
}

// Amber halo behind the Ryzykanci logo, breathing in and out. Drawn as an SVG
// radial gradient rather than a shadow: `shadowColor` is iOS-only for a blurred
// halo and Android's `elevation` can't be tinted, so a coloured soft falloff
// has to be painted by hand.
function BreathingLogoGlow({ boxHeight }: { boxHeight: number }) {
  const breath = useRef(new Animated.Value(0)).current;
  const isReduceMotionEnabled = useReduceMotion();

  useEffect(() => {
    if (isReduceMotionEnabled) {
      // Park it mid-breath: the halo still reads as a deliberate glow rather
      // than vanishing, it just stops pulsing.
      breath.setValue(0.5);
      return;
    }

    const halfBreath = (toValue: number) =>
      Animated.timing(breath, {
        toValue,
        duration: RYZYKANCI_GLOW_BREATH_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([halfBreath(1), halfBreath(0)]));
    loop.start();

    return () => loop.stop();
  }, [breath, isReduceMotionEnabled]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        // Bleeds past the logo box on every side so the gradient reaches zero
        // off-frame instead of ending on a visible rectangle edge.
        top: -boxHeight * 0.22,
        bottom: -boxHeight * 0.22,
        left: -WAITING_CONTENT_PADDING,
        right: -WAITING_CONTENT_PADDING,
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.95] }),
        transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }],
      }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="ryzykanciLogoGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={RYZYKANCI_GLOW_COLOR} stopOpacity={0.42} />
            <Stop offset="45%" stopColor={RYZYKANCI_GLOW_COLOR} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={RYZYKANCI_GLOW_COLOR} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#ryzykanciLogoGlow)" />
      </Svg>
    </Animated.View>
  );
}

type OnboardingRecoveryIntent = {
  realizationCode: string;
  apiBaseUrl: string | null;
  notice: string;
};

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
    retryNowAction: string;
    countdownGo: string;
    themeLabel: string;
    themeLight: string;
    themeDark: string;
    realizationExitTitle: string;
    realizationExitNotice: string;
  }
> = {
  polish: {
    gameRulesTitle: "Zasady gry",
    noGameRules: "Brak zasad gry dla tej realizacji.",
    close: "Zamknij",
    introFallback: "Przygotujcie się do gry. Czekajcie na globalny start aplikacji od administratora.",
    introTextLabel: "Fabuła",
    waitForStart: "Czekamy na zatwierdzenie startu aplikacji...",
    sessionRefreshTitle: "Sesja wymaga odświeżenia",
    sessionResetNotice:
      "Wykryto reset realizacji lub wygaśnięcie sesji{reasonSuffix}. Przekierowaliśmy do Etapu 3, aby ponownie potwierdzić drużynę.",
    mobileSessionReset: "Sesja mobilna została zresetowana ({reason}).",
    serverReconnect: "Brak połączenia z serwerem. Ponawiam sprawdzenie startu...",
    retryNowAction: "Spróbuj ponownie",
    countdownGo: "START",
    themeLabel: "Motyw",
    themeLight: "Jasny",
    themeDark: "Ciemny",
    realizationExitTitle: "Opuszczono realizację",
    realizationExitNotice: "Możesz teraz wybrać lub potwierdzić realizację ponownie.",
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
    retryNowAction: "Try again",
    countdownGo: "START",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    realizationExitTitle: "Realization exited",
    realizationExitNotice: "You can now choose or confirm the realization again.",
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
    retryNowAction: "Спробувати ще раз",
    countdownGo: "СТАРТ",
    themeLabel: "Тема",
    themeLight: "Світла",
    themeDark: "Темна",
    realizationExitTitle: "Реалізацію залишено",
    realizationExitNotice: "Тепер можна знову обрати або підтвердити реалізацію.",
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
    retryNowAction: "Попробовать снова",
    countdownGo: "СТАРТ",
    themeLabel: "Тема",
    themeLight: "Светлая",
    themeDark: "Тёмная",
    realizationExitTitle: "Реализация покинута",
    realizationExitNotice: "Теперь можно снова выбрать или подтвердить реализацию.",
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
  const adaptiveLayout = useAdaptiveLayout();
  const { height: windowHeight } = adaptiveLayout;
  const isLightTheme = getExpeditionThemeMode() === "light";
  const isTablet = adaptiveLayout.isTablet;
  const panelHeight = isTablet
    ? Math.min(Math.max(windowHeight * 0.84, 560), 980)
    : Math.min(Math.max(windowHeight * 0.78, 420), 760);
  const panelMaxWidth = adaptiveLayout.s(isTablet ? 920 : 560, 520, 1080);
  const panelPadding = adaptiveLayout.s(isTablet ? 24 : 20, 16, 32);
  const titleFontSize = adaptiveLayout.fs(isTablet ? 13 : 11, 10, 16);
  const rulesFontSize = adaptiveLayout.fs(isTablet ? 16 : 12, 11, 20);
  const rulesLineHeight = adaptiveLayout.s(isTablet ? 28 : 20, 18, 34);
  const closeFontSize = adaptiveLayout.fs(isTablet ? 17 : 14, 13, 20);
  const closePaddingVertical = adaptiveLayout.s(isTablet ? 14 : 10, 8, 18);

  return (
    <View
      className="absolute inset-0 items-center justify-center"
      style={{
        backgroundColor: isLightTheme ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)` : `rgba(${EXPEDITION_THEME.scrimAbyssRgb}, 0.58)`,
        paddingHorizontal: adaptiveLayout.s(isTablet ? 28 : 24, 20, 34),
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
            paddingHorizontal: adaptiveLayout.s(isTablet ? 18 : 12, 10, 24),
            paddingTop: adaptiveLayout.s(isTablet ? 16 : 12, 10, 22),
            paddingBottom: adaptiveLayout.s(isTablet ? 28 : 20, 16, 34),
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
            minHeight: adaptiveLayout.hit(isTablet ? 56 : 44),
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

function resolvePollErrorDetail(error: unknown): string {
  const statusCode = getMobileApiErrorStatusCode(error);
  const code = getMobileApiErrorCode(error);
  const timeLabel = new Date().toLocaleTimeString();

  if (statusCode !== null) {
    return `HTTP ${statusCode}${code ? ` • ${code}` : ""} • ${timeLabel}`;
  }

  const message = error instanceof Error ? error.message.trim() : String(error);
  return `${message || "Unknown error"} • ${timeLabel}`;
}

export function MobileApp() {
  const [onboardingSession, setOnboardingSession] = useState<OnboardingSession | null>(null);
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const [isWaitingForAdminStart, setIsWaitingForAdminStart] = useState(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const [waitingErrorDetail, setWaitingErrorDetail] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  // The pre-game countdown, armed by the poll that first sees the game open.
  // `remainingMs` is the server's figure and `anchorMs` is this device's clock
  // when that figure arrived, so the count ticks locally without ever trusting
  // the tablet's wall clock to agree with the server's. The session the poll
  // built waits in a ref until the count runs out.
  const [startCountdown, setStartCountdown] = useState<{
    remainingMs: number;
    anchorMs: number;
  } | null>(null);
  const [countdownElapsedMs, setCountdownElapsedMs] = useState(0);
  const pendingStartSessionRef = useRef<OnboardingSession | null>(null);
  const [isWaitingLanguagePickerOpen, setIsWaitingLanguagePickerOpen] = useState(false);
  const consecutivePollFailuresRef = useRef(0);
  const [recoveryIntent, setRecoveryIntent] = useState<OnboardingRecoveryIntent | null>(null);
  const [themePreference, setThemePreference] = useState<MobileThemePreference>("dark");
  const activeThemeMode = themePreference;
  // Risk-quiz ("Ryzykanci") realizations run on their own navy/gold palette; every
  // other realization keeps the green expedition one. The family is global state
  // rather than a prop because station panels, the QR scanner and the top bar are
  // shared between both screens and read colours straight off EXPEDITION_THEME.
  const activeThemeFamily: ExpeditionThemeFamily =
    onboardingSession?.realization?.type === "risk-quiz" ? "risk" : "expedition";
  setExpeditionThemeMode(activeThemeMode, activeThemeFamily);
  const activeThemePalette = getExpeditionThemePalette(activeThemeMode, activeThemeFamily);
  const uiLanguage = resolveUiLanguage(
    onboardingSession?.selectedLanguage ??
      onboardingSession?.realization?.selectedLanguage ??
      onboardingSession?.realization?.language,
  );
  const text = MOBILE_APP_TEXT[uiLanguage];
  const statusBarStyle: "light" | "dark" = activeThemeMode === "dark" ? "light" : "dark";
  const adaptiveLayout = useAdaptiveLayout();
  const introLabelFontSize = adaptiveLayout.fs(adaptiveLayout.isTablet ? 13 : 11, 10, 16);

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

  async function handleExitRealization() {
    setRecoveryIntent(null);
    setIsWaitingForAdminStart(false);
    setWaitingError(null);
    setOnboardingSession(null);
    await AsyncStorage.removeItem(ONBOARDING_SESSION_STORAGE_KEY);
    Alert.alert(text.realizationExitTitle, text.realizationExitNotice);
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

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isWaitingForAdminStart || !onboardingSession?.apiBaseUrl || !onboardingSession.sessionToken) {
      return;
    }

    // The game is already open and the tablet is just counting it in — another
    // poll can only tell us what we already know.
    if (startCountdown) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollUntilStarted = async () => {
      const abortController = new AbortController();
      const abortTimeoutId = setTimeout(() => abortController.abort(), ADMIN_START_POLL_TIMEOUT_MS);

      try {
        const nextState = await fetchMobileSessionState(
          onboardingSession.apiBaseUrl as string,
          onboardingSession.sessionToken,
          onboardingSession.selectedLanguage,
          { signal: abortController.signal },
        );
        clearTimeout(abortTimeoutId);
        if (cancelled) {
          return;
        }

        consecutivePollFailuresRef.current = 0;
        setWaitingErrorDetail(null);

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
          setWaitingError(null);

          // Ryzykanci hold on a countdown before the game opens. Everyone else
          // goes straight in, as does a device that arrives after the count has
          // already run out.
          const countdownMs =
            onboardingSession.realization?.type === "risk-quiz"
              ? (nextState.realization.startsInMs ?? 0)
              : 0;

          if (countdownMs > 0) {
            // Park the built session and stop polling: this effect is not
            // rescheduled here, and the countdown's own timer takes over.
            pendingStartSessionRef.current = nextSession;
            setCountdownElapsedMs(0);
            setStartCountdown({ remainingMs: countdownMs, anchorMs: Date.now() });
            return;
          }

          setIsWaitingForAdminStart(false);
          setOnboardingSession(nextSession);
          await AsyncStorage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
          return;
        }

        // Still waiting — but the instructor may have rewritten the intro text
        // since this device joined, and that text is the whole screen here.
        // Writing the session restarts this effect, which polls again straight
        // away; applyLiveIntroText answers null on an unchanged poll so that
        // only ever happens on a real edit.
        const refreshedSession = applyLiveIntroText(
          onboardingSession,
          nextState.realization.introText,
        );
        if (refreshedSession) {
          setOnboardingSession(refreshedSession);
          await AsyncStorage.setItem(
            ONBOARDING_SESSION_STORAGE_KEY,
            JSON.stringify(refreshedSession),
          );
          return;
        }

        timeoutId = setTimeout(() => {
          void pollUntilStarted();
        }, ADMIN_START_POLL_INTERVAL_MS);
      } catch (error) {
        clearTimeout(abortTimeoutId);
        if (cancelled) {
          return;
        }

        console.error(
          "[MobileApp] admin-start poll failed",
          error,
          {
            statusCode: getMobileApiErrorStatusCode(error),
            code: getMobileApiErrorCode(error),
            apiBaseUrl: onboardingSession.apiBaseUrl,
          },
        );

        if (isSessionTokenInvalidError(error)) {
          const reason = resolveSessionInvalidReason(error);
          setWaitingError(interpolate(text.mobileSessionReset, { reason }));
          await resetToOnboardingWithMessage(reason);
          return;
        }

        consecutivePollFailuresRef.current += 1;
        setWaitingErrorDetail(resolvePollErrorDetail(error));
        if (consecutivePollFailuresRef.current >= ADMIN_START_POLL_ERROR_THRESHOLD) {
          setWaitingError(text.serverReconnect);
        }

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
  }, [
    isWaitingForAdminStart,
    onboardingSession,
    retryNonce,
    startCountdown,
    text.mobileSessionReset,
    text.serverReconnect,
  ]);

  // Ticks the countdown and, when it finishes, releases the session the poll
  // parked. Deliberately faster than once a second: the number itself only
  // changes on the second, but START has to land within a frame or two of zero.
  useEffect(() => {
    if (!startCountdown) return;

    const interval = setInterval(() => {
      setCountdownElapsedMs(Date.now() - startCountdown.anchorMs);
    }, 100);

    return () => clearInterval(interval);
  }, [startCountdown]);

  useEffect(() => {
    if (!startCountdown) return;

    const state = resolveStartCountdown(startCountdown.remainingMs, countdownElapsedMs);
    if (state.phase !== "done") return;

    const nextSession = pendingStartSessionRef.current;
    pendingStartSessionRef.current = null;
    setStartCountdown(null);
    setIsWaitingForAdminStart(false);

    if (nextSession) {
      setOnboardingSession(nextSession);
      void AsyncStorage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    }
  }, [startCountdown, countdownElapsedMs]);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (isHydratingSession) {
    return (
      <SafeAreaProvider>
        <HorizontalSafeArea
          className="flex-1"
          style={{ backgroundColor: activeThemePalette.background }}
        >
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
          </View>
          {themeSwitchButton}
          <StatusBar style={statusBarStyle} hidden />
        </HorizontalSafeArea>
      </SafeAreaProvider>
    );
  }

  if (onboardingSession && isWaitingForAdminStart) {
    const isTabletLayout = adaptiveLayout.isTablet;
    const introPanelMaxHeight = isTabletLayout
      ? Math.min(Math.max(adaptiveLayout.height * 0.8, 480), 900)
      : Math.min(Math.max(adaptiveLayout.height * 0.72, 360), 680);
    const waitingFontSize = adaptiveLayout.fs(isTabletLayout ? 17 : 14, 13, 22);
    const waitingDetailFontSize = adaptiveLayout.fs(isTabletLayout ? 13 : 11, 10, 15);
    const waitingSelectedLanguage: RealizationLanguage =
      onboardingSession.selectedLanguage ??
      onboardingSession.realization?.selectedLanguage ??
      onboardingSession.realization?.language ??
      "polish";
    const waitingAvailableLanguageOptions: RealizationLanguageOption[] =
      onboardingSession.realization?.availableLanguages && onboardingSession.realization.availableLanguages.length > 0
        ? onboardingSession.realization.availableLanguages
        : [
            {
              value: waitingSelectedLanguage,
              label: getRealizationLanguageLabel(waitingSelectedLanguage),
            },
          ];
    const hasMultipleWaitingLanguageOptions = waitingAvailableLanguageOptions.length > 1;
    const waitingLanguageFlag = getRealizationLanguageFlag(waitingSelectedLanguage);
    const isRiskQuizWaiting = onboardingSession.realization?.type === "risk-quiz";
    const waitingCountdownState = startCountdown
      ? resolveStartCountdown(startCountdown.remainingMs, countdownElapsedMs)
      : null;
    // Window width minus the `px-6` padding on both sides. A safe-area inset
    // would make the real box narrower still, which only adds letter-boxing —
    // `contain` never crops, so an over-estimate here is harmless.
    const waitingLogoHeight = Math.min(
      (adaptiveLayout.width - 48) / RYZYKANCI_LOGO_ASPECT_RATIO,
      adaptiveLayout.height * 0.33,
    );
    const waitingStatusRow = (
      <HiddenResetOnHold
        language={uiLanguage}
        onReset={() => void resetToOnboardingWithMessage()}
      >
        <View className="mt-5 flex-row items-center gap-2">
          {isRiskQuizWaiting ? (
            <DealingSuitsIndicator
              size={adaptiveLayout.s(isTabletLayout ? 18 : 14, 13, 24)}
              cycleDurationMs={RYZYKANCI_GLOW_BREATH_MS}
            />
          ) : (
            <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
          )}
          <View className="flex-1">
            <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: waitingFontSize }}>
              {waitingError ?? text.waitForStart}
            </Text>
            {waitingError && waitingErrorDetail ? (
              <Text className="mt-1" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: waitingDetailFontSize }}>
                {waitingErrorDetail}
              </Text>
            ) : null}
          </View>
        </View>
      </HiddenResetOnHold>
    );
    const waitingRetryButton = waitingError ? (
      <Pressable
        className={
          isRiskQuizWaiting
            ? "mt-3 px-4 py-3 active:opacity-85"
            : "mt-3 rounded-2xl border px-4 py-3 active:opacity-85"
        }
        style={
          isRiskQuizWaiting
            ? undefined
            : { borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }
        }
        onPress={() => setRetryNonce((current) => current + 1)}
      >
        <Text
          className="text-center text-sm font-semibold"
          style={{ color: isRiskQuizWaiting ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.textPrimary }}
        >
          {text.retryNowAction}
        </Text>
      </Pressable>
    ) : null;

    return (
      <SafeAreaProvider>
        <HorizontalSafeArea
          className="flex-1"
          style={{ backgroundColor: activeThemePalette.background }}
        >
          {isRiskQuizWaiting ? (
            // Ryzykanci get the logo as the header instead of a labelled card:
            // no panel, no borders, content straight on the palette background.
            <View
              className="flex-1 px-6"
              style={{ paddingBottom: adaptiveLayout.s(isTabletLayout ? 28 : 18, 14, 36), minHeight: 0 }}
            >
              {/* Fixed box, `contain` inside it. `aspectRatio` on the <Image>
                  itself cropped the logo on device, so the height is computed
                  here instead: the box never exceeds the content width or a
                  third of the screen (landscape would otherwise hand the logo
                  the whole viewport), and `contain` letter-boxes within it. */}
              <View style={{ width: "100%", height: waitingLogoHeight }}>
                <BreathingLogoGlow boxHeight={waitingLogoHeight} />
                <Image
                  source={RYZYKANCI_LOGO}
                  accessibilityRole="image"
                  accessibilityLabel="Ryzykanci"
                  resizeMode="contain"
                  style={{ width: "100%", height: "100%" }}
                />
              </View>
              {waitingCountdownState ? (
                // The briefing has had its time; what matters now is the count.
                // Logo and halo stay put, so the screen reads as the same one
                // finally doing something rather than a new screen appearing.
                <StartCountdownPanel
                  state={waitingCountdownState}
                  numberFontSize={adaptiveLayout.fs(isTabletLayout ? 168 : 104, 88, 240)}
                  labelFontSize={adaptiveLayout.fs(isTabletLayout ? 72 : 46, 40, 104)}
                  goLabel={text.countdownGo}
                />
              ) : (
                <>
                  <AutoScrollingIntroBox
                    chromeless
                    // Takes whatever height is left between the logo and the
                    // status row, so the auto-scroll has something to scroll.
                    // Spelled out rather than `flex: 1` because the box's own
                    // base style sets flexGrow/flexShrink, and an explicit key
                    // beats the shorthand.
                    style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 }}
                    text={onboardingSession.realization?.introText?.trim() || ""}
                    fallbackText={text.introFallback}
                  />
                  {waitingStatusRow}
                  {waitingRetryButton}
                </>
              )}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-6">
              <View
                className="w-full rounded-3xl border p-5"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panel,
                  maxHeight: introPanelMaxHeight,
                }}
              >
                <Text className="uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong, fontSize: introLabelFontSize }}>
                  {text.introTextLabel}
                </Text>
                <AutoScrollingIntroBox
                  text={onboardingSession.realization?.introText?.trim() || ""}
                  fallbackText={text.introFallback}
                />
                {waitingStatusRow}
                {waitingRetryButton}
              </View>
            </View>
          )}
          {hasMultipleWaitingLanguageOptions ? (
            <Pressable
              className="absolute right-16 z-50 rounded-full p-2.5 active:opacity-90"
              style={{
                top: 14,
                backgroundColor: activeThemePalette.panelStrong,
              }}
              onPress={() => setIsWaitingLanguagePickerOpen(true)}
            >
              <Text style={{ fontSize: 18 }}>{waitingLanguageFlag}</Text>
            </Pressable>
          ) : null}
          {themeSwitchButton}
          <LanguagePickerModal
            visible={isWaitingLanguagePickerOpen}
            uiLanguage={uiLanguage}
            options={waitingAvailableLanguageOptions}
            selectedLanguage={waitingSelectedLanguage}
            onSelect={(language) => void handleSelectedLanguageChange(language)}
            onClose={() => setIsWaitingLanguagePickerOpen(false)}
          />
          <StatusBar style={statusBarStyle} hidden />
        </HorizontalSafeArea>
      </SafeAreaProvider>
    );
  }

  const shouldShowRulesPopup = shouldShowGameRulesPopup(onboardingSession, isWaitingForAdminStart);

  return (
    <SafeAreaProvider>
      <UiLanguageProvider language={uiLanguage}>
        <HorizontalSafeArea
          className="flex-1"
          style={{ backgroundColor: activeThemePalette.background }}
        >
          {onboardingSession && onboardingSession.realization?.type === "risk-quiz" ? (
            <RiskQuizScreen
              session={onboardingSession}
              onSessionInvalid={(reason) => {
                void resetToOnboardingWithMessage(reason);
              }}
              onExitRealization={() => {
                void handleExitRealization();
              }}
              onSelectedLanguageChange={(language) => {
                void handleSelectedLanguageChange(language);
              }}
              themeMode={activeThemeMode}
              onToggleTheme={() => {
                void handleThemePreferenceToggle();
              }}
            />
          ) : onboardingSession ? (
            <ExpeditionStageScreen
              session={onboardingSession}
              onSessionInvalid={(reason) => {
                void resetToOnboardingWithMessage(reason);
              }}
              onExitRealization={() => {
                void handleExitRealization();
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
        </HorizontalSafeArea>
      </UiLanguageProvider>
    </SafeAreaProvider>
  );
}
