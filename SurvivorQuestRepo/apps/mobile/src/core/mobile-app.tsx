import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ExpeditionStageScreen } from "../features/expedition-stage/ui/expedition-stage-screen";
import type { OnboardingSession } from "../features/onboarding/model/types";
import { RealizationOnboardingScreen } from "../features/onboarding/ui/realization-onboarding-screen";
import { EXPEDITION_THEME } from "../features/onboarding/model/constants";

const ONBOARDING_SESSION_STORAGE_KEY = "sq.mobile.onboarding-session.v1";

export function MobileApp() {
  const [onboardingSession, setOnboardingSession] = useState<OnboardingSession | null>(null);
  const [isHydratingSession, setIsHydratingSession] = useState(true);

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

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["left", "right"]} className="flex-1 bg-zinc-950">
        {isHydratingSession ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
          </View>
        ) : onboardingSession ? (
          <ExpeditionStageScreen session={onboardingSession} />
        ) : (
          <RealizationOnboardingScreen onComplete={(session) => void handleComplete(session)} />
        )}
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
