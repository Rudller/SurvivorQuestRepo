import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, useWindowDimensions, View } from "react-native";

import { useReduceMotion } from "../a11y/use-reduce-motion";
import { useAdaptiveLayout } from "../layout/use-adaptive-layout";
import { pseudoRandom } from "../math/pseudo-random";

type SnowfallProps = {
  isLightTheme: boolean;
};

/**
 * Padający śnieg oprawy świątecznej. Ten sam silnik co
 * features/risk-quiz/components/risk-quiz-falling-cards.tsx: jedna pętla na
 * całą warstwę, a nie animacja na płatek. Prędkość płatka to całkowita
 * wielokrotność cyklu, więc gdy driver przeskakuje 1 -> 0, `progress * speed`
 * wraca dokładnie do tej samej fazy i pętla nie ma szwu.
 *
 * Płatki to zwykłe kółka z View, a ruch idzie wyłącznie przez transform na
 * native driverze. Żadnego SVG w ruchu — pełnoekranowe SVG, które się
 * przemalowuje, rasteryzuje się od nowa w każdej klatce (patrz
 * hidden-map-backdrop.tsx).
 */
const DRIVER_CYCLE_MS = 48000;

/**
 * Trzy warstwy głębi: daleka (mała, wolna, blada), środkowa i bliska. Tylko
 * kilka bliskich płatków, bo to one najbardziej przyciągają oko.
 */
const SNOW_LAYERS = [
  { share: 0.5, size: 3, speed: 2, opacity: 0.45, sway: 10 },
  { share: 0.35, size: 5, speed: 3, opacity: 0.65, sway: 18 },
  { share: 0.15, size: 8, speed: 4, opacity: 0.85, sway: 28 },
] as const;

export const SNOWFLAKE_COUNT_PHONE = 24;
export const SNOWFLAKE_COUNT_TABLET = 40;

/**
 * Biały płatek na jasnym, śnieżnym wariancie palety po prostu znika, więc jasny
 * motyw dostaje chłodną szarość z nutą błękitu.
 */
const SNOW_COLOR_DARK = "#ffffff";
const SNOW_COLOR_LIGHT = "#8aa3b8";

function resolveLayer(index: number, count: number) {
  const position = index / count;
  let threshold = 0;
  for (const layer of SNOW_LAYERS) {
    threshold += layer.share;
    if (position < threshold) {
      return layer;
    }
  }
  return SNOW_LAYERS[SNOW_LAYERS.length - 1];
}

export function Snowfall({ isLightTheme }: SnowfallProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const adaptiveLayout = useAdaptiveLayout();
  const isReduceMotionEnabled = useReduceMotion();
  const driver = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    // Przy „Ogranicz ruch” płatki stoją w swoim rozrzucie — śnieg zostaje
    // widoczny jako dekoracja, ale nic się nie przesuwa.
    if (isReduceMotionEnabled) {
      return;
    }

    const fallLoop = Animated.loop(
      Animated.timing(driver, {
        toValue: 1,
        duration: DRIVER_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    fallLoop.start();
    return () => {
      fallLoop.stop();
      driver.setValue(0);
    };
  }, [driver, isReduceMotionEnabled]);

  const flakeCount = adaptiveLayout.isTablet ? SNOWFLAKE_COUNT_TABLET : SNOWFLAKE_COUNT_PHONE;
  const sizeScale = adaptiveLayout.isTablet ? 1.3 : 1;
  const color = isLightTheme ? SNOW_COLOR_LIGHT : SNOW_COLOR_DARK;

  const flakes = useMemo(
    () =>
      Array.from({ length: flakeCount }, (_, index) => {
        const layer = resolveLayer(index, flakeCount);
        const size = layer.size * sizeScale * (0.8 + pseudoRandom(index + 3) * 0.4);
        return {
          key: index,
          size,
          speed: layer.speed,
          // Faza rozłożona na całą wysokość, żeby niebo było pełne od pierwszej
          // klatki, a nie zapełniało się od góry.
          phase: pseudoRandom(index + 11),
          left: pseudoRandom(index + 23) * screenWidth,
          sway: (pseudoRandom(index + 37) < 0.5 ? -1 : 1) * layer.sway * sizeScale,
          opacity: layer.opacity * (isLightTheme ? 0.8 : 1),
        };
      }),
    [flakeCount, sizeScale, screenWidth, isLightTheme],
  );

  return (
    <View
      testID="snowfall"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}
    >
      {flakes.map((flake) => {
        const progress = Animated.modulo(Animated.add(Animated.multiply(driver, flake.speed), flake.phase), 1);
        return (
          <Animated.View
            key={flake.key}
            testID="snowflake"
            style={{
              position: "absolute",
              top: 0,
              left: flake.left,
              width: flake.size,
              height: flake.size,
              borderRadius: flake.size / 2,
              backgroundColor: color,
              opacity: flake.opacity,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-flake.size * 2, screenHeight + flake.size * 2],
                  }),
                },
                {
                  // Dwa pełne kołysania na przelot ekranu, zamknięte w zerze na
                  // obu końcach, żeby zawinięcie fazy nie szarpnęło płatkiem.
                  translateX: progress.interpolate({
                    inputRange: [0, 0.25, 0.5, 0.75, 1],
                    outputRange: [0, flake.sway, 0, -flake.sway, 0],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
