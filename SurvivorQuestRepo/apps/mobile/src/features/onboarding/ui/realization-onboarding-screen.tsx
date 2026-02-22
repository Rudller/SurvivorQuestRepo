import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Circle, Defs, Filter, FeGaussianBlur, G } from "react-native-svg";
import {
  DEFAULT_REALIZATION_CODE,
  TEAM_COLORS,
  TEAM_ICONS,
  TEAM_SLOTS,
} from "../model/constants";
import type { Screen, TeamColor } from "../model/types";

export function RealizationOnboardingScreen() {
  const leftGlowProgress = useRef(new Animated.Value(0)).current;
  const rightGlowProgress = useRef(new Animated.Value(0)).current;

  const [screen, setScreen] = useState<Screen>("code");
  const [realizationCode, setRealizationCode] = useState(DEFAULT_REALIZATION_CODE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("Drużyna TEST");
  const [teamColor, setTeamColor] = useState<TeamColor>("amber");
  const [teamIcon, setTeamIcon] = useState("🦊");

  const selectedColor = useMemo(
    () => TEAM_COLORS.find((color) => color.key === teamColor) ?? TEAM_COLORS[0],
    [teamColor],
  );

  useEffect(() => {
    const leftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(leftGlowProgress, {
          toValue: 1,
          duration: 6500,
          useNativeDriver: true,
        }),
        Animated.timing(leftGlowProgress, {
          toValue: 0,
          duration: 6500,
          useNativeDriver: true,
        }),
      ]),
    );

    const rightAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rightGlowProgress, {
          toValue: 1,
          duration: 7500,
          useNativeDriver: true,
        }),
        Animated.timing(rightGlowProgress, {
          toValue: 0,
          duration: 7500,
          useNativeDriver: true,
        }),
      ]),
    );

    leftAnimation.start();
    rightAnimation.start();

    return () => {
      leftAnimation.stop();
      rightAnimation.stop();
    };
  }, [leftGlowProgress, rightGlowProgress]);

  const leftGlowAnimatedStyle = {
    opacity: leftGlowProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.34, 0.5],
    }),
    transform: [
      {
        translateX: leftGlowProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 14],
        }),
      },
      {
        translateY: leftGlowProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 12],
        }),
      },
      {
        scale: leftGlowProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.06],
        }),
      },
    ],
  };

  const rightGlowAnimatedStyle = {
    opacity: rightGlowProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.22, 0.36],
    }),
    transform: [
      {
        translateX: rightGlowProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -16],
        }),
      },
      {
        translateY: rightGlowProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -14],
        }),
      },
      {
        scale: rightGlowProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.07],
        }),
      },
    ],
  };

  function onSubmitCode() {
    if (realizationCode.trim().toUpperCase() !== DEFAULT_REALIZATION_CODE) {
      setErrorMessage("Na razie aktywny jest tylko kod TEST.");
      return;
    }

    setErrorMessage(null);
    setScreen("team");
  }

  function onSelectTeam(slot: number) {
    setSelectedTeam(slot);
    setTeamName(`Drużyna ${slot}`);
    setScreen("customize");
  }

  return (
    <View className="relative flex-1 overflow-hidden bg-zinc-950 px-4 py-10">
      <Animated.View
        pointerEvents="none"
        className="absolute -left-28 -top-20 h-72 w-72"
        style={leftGlowAnimatedStyle}
      >
        <Svg width="100%" height="100%" viewBox="0 0 288 288">
          <Defs>
            <Filter id="leftBlur" x="-50%" y="-50%" width="200%" height="200%">
              <FeGaussianBlur stdDeviation="36" />
            </Filter>
          </Defs>
          <G filter="url(#leftBlur)">
            <Circle cx="144" cy="144" r="108" fill="#f59e0b" opacity="0.95" />
          </G>
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        className="absolute -right-24 -bottom-24 h-80 w-80"
        style={rightGlowAnimatedStyle}
      >
        <Svg width="100%" height="100%" viewBox="0 0 320 320">
          <Defs>
            <Filter id="rightBlur" x="-50%" y="-50%" width="200%" height="200%">
              <FeGaussianBlur stdDeviation="40" />
            </Filter>
          </Defs>
          <G filter="url(#rightBlur)">
            <Circle cx="160" cy="160" r="118" fill="#fcd34d" opacity="0.9" />
          </G>
        </Svg>
      </Animated.View>
      <ScrollView contentContainerClassName="min-h-full items-center justify-center">
        <View className="w-full max-w-md gap-4">
          <View className="gap-1">
            <Text className="text-center text-3xl font-semibold tracking-tight text-zinc-100">SurvivorQuest Panel</Text>
            <Text className="text-center text-sm text-zinc-300">Zaloguj się, aby zarządzać użytkownikami i dostępem.</Text>
          </View>

          {screen === "code" && (
            <View className="gap-4 rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-6 shadow-2xl">
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-zinc-200">Kod realizacji</Text>
                <Text className="text-sm text-zinc-400">Wpisz kod i przejdź do wyboru drużyny.</Text>
              </View>
              <TextInput
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100"
                value={realizationCode}
                onChangeText={(value) => setRealizationCode(value.toUpperCase())}
                placeholder="Kod realizacji"
                placeholderTextColor="#71717a"
                autoCapitalize="characters"
              />

              {errorMessage && (
                <View className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2">
                  <Text className="text-sm text-red-300">{errorMessage}</Text>
                </View>
              )}

              <Pressable className="rounded-lg bg-amber-400 px-3 py-3 active:bg-amber-300" onPress={onSubmitCode}>
                <Text className="text-center font-medium text-zinc-950">Dalej</Text>
              </Pressable>
            </View>
          )}

          {screen === "team" && (
            <View className="gap-3 rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-6 shadow-2xl">
              <View className="gap-1">
                <Text className="text-base font-semibold text-zinc-100">Wybór drużyny</Text>
                <Text className="text-sm text-zinc-400">Kod {realizationCode.toUpperCase()} zaakceptowany. Wybierz drużynę.</Text>
              </View>
              <View className="mt-1 gap-2">
                {TEAM_SLOTS.map((slot) => (
                  <Pressable
                    key={slot}
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 active:border-amber-300"
                    onPress={() => onSelectTeam(slot)}
                  >
                    <Text className="font-semibold text-zinc-100">Drużyna {slot}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable className="mt-1 self-start" onPress={() => setScreen("code")}>
                <Text className="text-sm font-semibold text-amber-300">← Zmień kod</Text>
              </Pressable>
            </View>
          )}

          {screen === "customize" && (
            <View className="gap-3 rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-6 shadow-2xl">
              <View className="gap-1">
                <Text className="text-base font-semibold text-zinc-100">Personalizacja drużyny</Text>
                <Text className="text-sm text-zinc-400">Drużyna {selectedTeam}</Text>
              </View>

              <TextInput
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-zinc-100"
                value={teamName}
                onChangeText={setTeamName}
                placeholder="Nazwa drużyny"
                placeholderTextColor="#71717a"
              />

              <Text className="mt-1 text-sm font-semibold text-zinc-200">Kolor drużyny</Text>
              <View className="gap-2">
                {TEAM_COLORS.map((color) => (
                  <Pressable
                    key={color.key}
                    onPress={() => setTeamColor(color.key)}
                    className={`flex-row items-center gap-2 rounded-lg border bg-zinc-950 px-3 py-2 ${
                      teamColor === color.key ? "border-amber-300" : "border-zinc-700"
                    }`}
                  >
                    <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color.hex }} />
                    <Text className="text-zinc-100">{color.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text className="mt-1 text-sm font-semibold text-zinc-200">Ikonka drużyny</Text>
              <View className="flex-row flex-wrap gap-2">
                {TEAM_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    onPress={() => setTeamIcon(icon)}
                    className={`h-11 w-11 items-center justify-center rounded-lg border ${
                      teamIcon === icon ? "border-amber-300 bg-zinc-700" : "border-zinc-600 bg-zinc-950"
                    }`}
                  >
                    <Text className="text-xl">{icon}</Text>
                  </Pressable>
                ))}
              </View>

              <View className="mt-1 gap-1 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                <Text className="text-xs text-zinc-400">Podgląd</Text>
                <Text className="font-semibold text-zinc-100">
                  {teamIcon} {teamName}
                </Text>
                <Text style={{ color: selectedColor.hex }}>Kolor: {selectedColor.label}</Text>
              </View>

              <View className="mt-2 flex-row gap-2">
                <Pressable
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 active:bg-zinc-900"
                  onPress={() => setScreen("team")}
                >
                  <Text className="text-center font-semibold text-zinc-100">Wstecz</Text>
                </Pressable>
                <Pressable className="flex-1 rounded-lg bg-amber-400 px-3 py-3 active:bg-amber-300" onPress={() => {}}>
                  <Text className="text-center font-semibold text-zinc-950">Zapisz</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text className="px-4 text-center text-xs text-zinc-400">
            Dostęp wyłącznie dla administratorów i osób zarządzających użytkownikami. Nie udostępniaj swoich danych logowania.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
