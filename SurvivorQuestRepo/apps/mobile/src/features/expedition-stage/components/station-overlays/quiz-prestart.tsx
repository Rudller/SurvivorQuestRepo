import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../../onboarding/model/constants";
import type { QuizPrestartOverlayProps } from "./types";

export function QuizPrestartOverlay({
  visible,
  stationName,
  stationType = "quiz",
  isStarting = false,
  onStart,
  onClose,
}: QuizPrestartOverlayProps) {
  const slideAnimation = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [isMounted, setIsMounted] = useState(visible);
  const [displayStationName, setDisplayStationName] = useState(stationName);

  useEffect(() => {
    if (visible) {
      setDisplayStationName(stationName);
      setIsMounted(true);
      slideAnimation.stopAnimation();
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
      return;
    }

    slideAnimation.stopAnimation();
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [slideAnimation, stationName, visible]);

  if (!isMounted) {
    return null;
  }

  const backdropStyle = {
    opacity: slideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  } as const;
  const panelStyle = {
    opacity: slideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [140, 0],
        }),
      },
    ],
  } as const;
  const isLogicChallenge =
    stationType === "mastermind" ||
    stationType === "anagram" ||
    stationType === "caesar-cipher" ||
    stationType === "memory" ||
    stationType === "simon" ||
    stationType === "rebus" ||
    stationType === "boggle" ||
    stationType === "mini-sudoku" ||
    stationType === "matching";
  const prestartBadge =
    stationType === "time"
      ? "Na czas"
      : stationType === "audio-quiz"
        ? "Quiz audio"
      : stationType === "wordle"
        ? "Wordle"
      : stationType === "hangman"
          ? "Wisielec"
          : isLogicChallenge
            ? "Wyzwanie logiczne"
          : "Quiz";
  const prestartTitle =
    stationType === "time"
      ? "Za chwilę zostanie uruchomione zadanie czasowe"
      : stationType === "audio-quiz"
        ? "Za chwilę zostanie uruchomiony quiz audio"
      : stationType === "wordle"
        ? "Za chwilę zostanie uruchomiony Wordle"
      : stationType === "hangman"
          ? "Za chwilę zostanie uruchomiony Wisielec"
          : isLogicChallenge
            ? "Za chwilę zostanie uruchomione wyzwanie"
          : "Za chwilę zostanie uruchomiony quiz";
  const prestartDescription =
    stationType === "time"
      ? "Przygotuj się. Po starcie od razu ruszy licznik czasu."
      : stationType === "audio-quiz"
        ? "Przygotuj się na odsłuchanie nagrania i wybór poprawnej odpowiedzi."
      : stationType === "wordle"
        ? "Przygotuj się na odgadnięcie słowa."
      : stationType === "hangman"
          ? "Przygotuj się na odgadnięcie hasła."
          : isLogicChallenge
            ? "Przygotuj się na krótkie zadanie interaktywne."
          : "Przygotuj się na odpowiedzenie na pytania.";

  return (
    <Animated.View className="absolute inset-0 z-50 items-center justify-center px-3" style={[{ backgroundColor: "rgba(15, 25, 20, 0.88)" }, backdropStyle]}>
      <Animated.View
        className="w-full max-w-[560px] rounded-3xl border px-4 py-4"
        style={[{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }, panelStyle]}
      >
        <Text className="text-center text-[11px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
          {prestartBadge}
        </Text>
        <Text className="mt-2 text-center text-lg font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
          {prestartTitle}
        </Text>
        <Text className="mt-2 text-center text-sm leading-5" style={{ color: EXPEDITION_THEME.textMuted }}>
          {prestartDescription}
          {displayStationName ? ` Stanowisko: ${displayStationName}.` : ""}
        </Text>

        <View className="mt-4 flex-row gap-2">
          <Pressable
            className="flex-1 items-center rounded-xl border px-3 py-2.5 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
            disabled={isStarting}
          >
            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textMuted }}>
              Zamknij
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center rounded-xl px-3 py-2.5 active:opacity-90"
            style={{ backgroundColor: EXPEDITION_THEME.accent, opacity: isStarting ? 0.7 : 1 }}
            onPress={onStart}
            disabled={isStarting}
          >
            <Text className="text-sm font-semibold text-zinc-950">{isStarting ? "Uruchamianie..." : "Start"}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
