import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, AppState, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ExpeditionStageScreen } from "../features/expedition-stage/ui/expedition-stage-screen";
import type {
  OnboardingSession,
  RealizationLanguage,
} from "../features/onboarding/model/types";
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
};

function GameRulesPopup({ rulesText, onClose }: GameRulesScreenProps) {
  const blocks = parseRulesBlocks(rulesText);

  return (
    <View
      className="absolute inset-0 items-center justify-center px-5"
      style={{ backgroundColor: "rgba(5, 10, 8, 0.58)" }}
    >
      <View
        className="w-full max-w-[380px] rounded-3xl border px-4 py-4"
        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
      >
        <Text className="text-[11px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
          Zasady gry
        </Text>

        <ScrollView
          className="mt-2 rounded-2xl border px-3 py-3"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelMuted,
            maxHeight: 280,
          }}
        >
          {blocks.length === 0 ? (
            <Text className="text-xs leading-5" style={{ color: EXPEDITION_THEME.textMuted }}>
              Brak zasad gry dla tej realizacji.
            </Text>
          ) : (
            blocks.map((block, blockIndex) => {
              const parts = parseInlineRules(block.text);
              const prefix = block.kind === "unordered" ? "• " : block.kind === "ordered" ? `${block.order ?? 1}. ` : "";

              return (
                <Text
                  key={`${block.kind}-${blockIndex}`}
                  className="mb-1.5 text-xs leading-5"
                  style={{ color: EXPEDITION_THEME.textPrimary }}
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
          className="mt-3 rounded-2xl border px-4 py-2.5"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
          onPress={onClose}
        >
          <Text className="text-center text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            Zamknij
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function IntroTextPreview({ text }: { text: string }) {
  const blocks = parseRulesBlocks(text);

  if (blocks.length === 0) {
    return (
      <Text className="mt-3 text-base leading-6" style={{ color: EXPEDITION_THEME.textPrimary }}>
        Przygotujcie się do gry. Czekajcie na globalny start aplikacji od administratora.
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
        await NavigationBar.setButtonStyleAsync("light");
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
  }, []);

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
          <StatusBar style="light" hidden />
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
              <IntroTextPreview text={onboardingSession.realization?.introText?.trim() || ""} />
              <View className="mt-5 flex-row items-center gap-2">
                <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
                <Text className="text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
                  {waitingError ?? "Czekamy na zatwierdzenie startu aplikacji..."}
                </Text>
              </View>
            </View>
          </View>
          <StatusBar style="light" hidden />
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
      <SafeAreaView edges={["left", "right"]} className="flex-1 bg-zinc-950">
        {onboardingSession ? (
          <ExpeditionStageScreen
            session={onboardingSession}
            onSessionInvalid={(reason) => {
              void resetToOnboardingWithMessage(reason);
            }}
            onSelectedLanguageChange={(language) => {
              void handleSelectedLanguageChange(language);
            }}
          />
        ) : (
          <RealizationOnboardingScreen
            onComplete={(session) => void handleComplete(session)}
            recoveryIntent={recoveryIntent}
            onRecoveryConsumed={() => setRecoveryIntent(null)}
          />
        )}
        {onboardingSession && shouldShowRulesPopup ? (
          <GameRulesPopup
            rulesText={onboardingSession.realization?.gameRules?.trim() || ""}
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
        <StatusBar style="light" hidden />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
