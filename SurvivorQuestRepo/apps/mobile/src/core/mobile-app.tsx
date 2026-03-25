import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ExpeditionStageScreen } from "../features/expedition-stage/ui/expedition-stage-screen";
import type { OnboardingSession } from "../features/onboarding/model/types";
import { RealizationOnboardingScreen } from "../features/onboarding/ui/realization-onboarding-screen";
import { EXPEDITION_THEME } from "../features/onboarding/model/constants";
import {
  fetchMobileSessionState,
  isSessionTokenInvalidError,
} from "../features/expedition-stage/api/mobile-session.api";

const ONBOARDING_SESSION_STORAGE_KEY = "sq.mobile.onboarding-session.v1";
const ADMIN_START_POLL_INTERVAL_MS = 3000;

type OnboardingRecoveryIntent = {
  realizationCode: string;
  apiBaseUrl: string | null;
  notice: string;
};

export function MobileApp() {
  const [onboardingSession, setOnboardingSession] = useState<OnboardingSession | null>(null);
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const [isWaitingForAdminStart, setIsWaitingForAdminStart] = useState(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);
  const [recoveryIntent, setRecoveryIntent] = useState<OnboardingRecoveryIntent | null>(null);

  useEffect(() => {
    let isActive = true;

    const hydrateSession = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(ONBOARDING_SESSION_STORAGE_KEY);
        if (!isActive || !storedValue) {
          return;
        }

        const parsed = JSON.parse(storedValue) as Partial<OnboardingSession>;
        if (typeof parsed?.sessionToken === "string" && parsed.sessionToken.trim().length > 0) {
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

    void hydrateSession();

    return () => {
      isActive = false;
    };
  }, []);

  async function handleComplete(nextSession: OnboardingSession) {
    setOnboardingSession(nextSession);
    await AsyncStorage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
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
    const notice =
      `Wykryto reset realizacji lub wygaśnięcie sesji${reasonSuffix}. Przekierowaliśmy do Etapu 3, aby ponownie potwierdzić drużynę.`;

    if (realizationCode) {
      setRecoveryIntent({
        realizationCode,
        apiBaseUrl,
        notice,
      });
    } else {
      setRecoveryIntent(null);
    }

    Alert.alert("Sesja wymaga odświeżenia", notice);
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
        );
        if (cancelled) {
          return;
        }

        if (nextState.realization.status === "in-progress") {
          const nextSession: OnboardingSession = {
            ...onboardingSession,
            awaitingAdminStart: false,
            realization: onboardingSession.realization
              ? {
                  ...onboardingSession.realization,
                  status: "in-progress",
                  introText: nextState.realization.introText ?? onboardingSession.realization.introText,
                }
              : onboardingSession.realization,
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
          setWaitingError(`Sesja mobilna została zresetowana (${reason}).`);
          await resetToOnboardingWithMessage(reason);
          return;
        }

        setWaitingError("Brak połączenia z serwerem. Ponawiam sprawdzenie startu...");
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
  }, [isWaitingForAdminStart, onboardingSession]);

  if (isHydratingSession) {
    return (
      <SafeAreaProvider>
        <SafeAreaView edges={["left", "right"]} className="flex-1 bg-zinc-950">
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
          </View>
          <StatusBar style="light" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (onboardingSession && isWaitingForAdminStart) {
    return (
      <SafeAreaProvider>
        <SafeAreaView edges={["left", "right"]} className="flex-1 bg-zinc-950">
          <View className="flex-1 items-center justify-center px-6">
            <View
              className="w-full rounded-3xl border p-5"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
            >
              <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
                Tekst wstępu
              </Text>
              <Text className="mt-3 text-base leading-6" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {onboardingSession.realization?.introText?.trim() ||
                  "Przygotujcie się do gry. Czekajcie na globalny start aplikacji od administratora."}
              </Text>
              <View className="mt-5 flex-row items-center gap-2">
                <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {waitingError ?? "Czekamy na zatwierdzenie startu aplikacji..."}
                </Text>
              </View>
            </View>
          </View>
          <StatusBar style="light" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["left", "right"]} className="flex-1 bg-zinc-950">
        {onboardingSession ? (
          <ExpeditionStageScreen
            session={onboardingSession}
            onSessionInvalid={(reason) => {
              void resetToOnboardingWithMessage(reason);
            }}
          />
        ) : (
          <RealizationOnboardingScreen
            onComplete={(session) => void handleComplete(session)}
            recoveryIntent={recoveryIntent}
            onRecoveryConsumed={() => setRecoveryIntent(null)}
          />
        )}
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
