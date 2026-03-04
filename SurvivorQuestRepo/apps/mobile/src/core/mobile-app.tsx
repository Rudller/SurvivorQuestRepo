import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ExpeditionStageScreen } from "../features/expedition-stage/ui/expedition-stage-screen";
import type { OnboardingSession } from "../features/onboarding/model/types";
import { RealizationOnboardingScreen } from "../features/onboarding/ui/realization-onboarding-screen";

export function MobileApp() {
  const [onboardingSession, setOnboardingSession] = useState<OnboardingSession | null>(null);

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-zinc-950">
        {onboardingSession ? (
          <ExpeditionStageScreen session={onboardingSession} onRestart={() => setOnboardingSession(null)} />
        ) : (
          <RealizationOnboardingScreen onComplete={setOnboardingSession} />
        )}
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
