import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  DEFAULT_REALIZATION_CODE,
  TEAM_COLORS,
  TEAM_ICONS,
  TEAM_SLOTS,
} from "../model/constants";
import type { Screen, TeamColor } from "../model/types";

export function RealizationOnboardingScreen() {
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
    <ScrollView contentContainerClassName="min-h-full justify-center px-4 py-8">
      <View className="relative overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-900/80 p-5">
        <View className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-amber-500/30 blur-3xl" />
        <View className="pointer-events-none absolute -right-16 -bottom-20 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />

        <View className="relative gap-2">
          <Text className="text-2xl font-semibold tracking-tight text-zinc-100">SurvivorQuest</Text>
          <Text className="text-sm text-zinc-300">Dołącz do realizacji i wybierz swoją drużynę.</Text>
        </View>

        {screen === "code" && (
          <View className="mt-5 gap-3">
            <View className="gap-1">
              <Text className="text-base font-semibold text-zinc-100">Kod realizacji</Text>
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
              <Text className="text-center font-semibold text-zinc-950">Dalej</Text>
            </Pressable>
          </View>
        )}

        {screen === "team" && (
          <View className="mt-5 gap-3">
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
          <View className="mt-5 gap-3">
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
      </View>
    </ScrollView>
  );
}
