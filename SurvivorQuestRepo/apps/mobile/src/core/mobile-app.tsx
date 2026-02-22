import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { RealizationOnboardingScreen } from "../features/onboarding/ui/realization-onboarding-screen";

export function MobileApp() {
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-zinc-950">
        <RealizationOnboardingScreen />
        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
