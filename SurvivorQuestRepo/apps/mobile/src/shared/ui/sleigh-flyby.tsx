import { useEffect, useState } from "react";
import { Animated, Easing, useWindowDimensions, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { EXPEDITION_THEME } from "../../features/onboarding/model/constants";
import { useReduceMotion } from "../a11y/use-reduce-motion";
import { useAdaptiveLayout } from "../layout/use-adaptive-layout";

type SleighFlybyProps = {
  isLightTheme: boolean;
};

/**
 * Sanie Mikołaja z reniferami przelatujące przez niebo w tle mniej więcej raz
 * na minutę. Sylwetka jest statycznym SVG w Animated.View — rusza się tylko
 * transform na native driverze, więc rysunek nie rasteryzuje się co klatkę.
 *
 * Pierwszy przelot przychodzi szybko, żeby efekt w ogóle ktoś zobaczył, a
 * kolejne rzadko — to ma być niespodzianka, nie wygaszacz ekranu.
 */
const FIRST_DELAY_MS = 6000;
const FLIGHT_MS = 9000;
const PAUSE_MS = 55000;

const SLEIGH_VIEWBOX_WIDTH = 120;
const SLEIGH_VIEWBOX_HEIGHT = 40;

export function SleighFlyby({ isLightTheme }: SleighFlybyProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const adaptiveLayout = useAdaptiveLayout();
  const isReduceMotionEnabled = useReduceMotion();
  const progress = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (isReduceMotionEnabled) {
      return;
    }

    const loop = Animated.sequence([
      Animated.delay(FIRST_DELAY_MS),
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: FLIGHT_MS,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Powrót na start poza ekranem, niewidoczny.
          Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay(PAUSE_MS),
        ]),
      ),
    ]);
    loop.start();
    return () => {
      loop.stop();
      progress.setValue(0);
    };
  }, [progress, isReduceMotionEnabled]);

  // Przy „Ogranicz ruch” sań nie ma wcale — stojąca sylwetka na niebie
  // wyglądałaby jak błąd, a nie dekoracja.
  if (isReduceMotionEnabled) {
    return null;
  }

  const width = adaptiveLayout.isTablet ? 240 : 170;
  const height = (width * SLEIGH_VIEWBOX_HEIGHT) / SLEIGH_VIEWBOX_WIDTH;
  const top = screenHeight * 0.24;
  const color = isLightTheme ? EXPEDITION_THEME.textSubtle : EXPEDITION_THEME.accentStrong;

  return (
    <View
      testID="sleigh-flyby"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}
    >
      <Animated.View
        style={{
          position: "absolute",
          top,
          left: 0,
          width,
          height,
          opacity: isLightTheme ? 0.45 : 0.55,
          transform: [
            {
              // Z prawej do lewej — renifery prowadzą, sanie za nimi.
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [screenWidth + width * 0.2, -width * 1.2],
              }),
            },
            {
              // Łagodny łuk: wznoszą się, potem lekko opadają.
              translateY: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [height * 0.8, -height * 0.4, height * 0.2],
              }),
            },
          ],
        }}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${SLEIGH_VIEWBOX_WIDTH} ${SLEIGH_VIEWBOX_HEIGHT}`}>
          <SleighSilhouette color={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Reindeer({ x, color }: { x: number; color: string }) {
  return (
    <G transform={`translate(${x} 0)`}>
      {/* Tułów, szyja i głowa. */}
      <Path d="M4,18 Q10,14 18,16 Q20,17 19,20 Q12,22 5,21 Z" fill={color} />
      <Path d="M5,18 L2,12" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={2} cy={11} r={2.2} fill={color} />
      {/* Poroże. */}
      <Path d="M2,9 L1,5 M1,7 L-1,5 M3,9 L5,5 M4,7 L6,6" stroke={color} strokeWidth={0.9} strokeLinecap="round" />
      {/* Nogi w galopie. */}
      <Path d="M7,21 L4,27 M9,21 L10,27 M15,20 L13,26 M17,20 L20,25" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    </G>
  );
}

function SleighSilhouette({ color }: { color: string }) {
  return (
    <G>
      <Reindeer x={6} color={color} />
      <Reindeer x={30} color={color} />
      {/* Lejce od reniferów do sań. */}
      <Path d="M24,17 L34,17 M48,17 L74,20" stroke={color} strokeWidth={0.8} />
      {/* Mikołaj: głowa i tułów w saniach. */}
      <Circle cx={92} cy={10} r={3.2} fill={color} />
      <Path d="M86,24 L87,14 Q92,11 97,14 L99,24 Z" fill={color} />
      {/* Worek z prezentami. */}
      <Path d="M100,22 Q99,13 106,12 Q112,13 110,22 Z" fill={color} />
      {/* Kosz sań i płozy. */}
      <Path d="M74,20 L112,20 Q116,20 117,13 L119,13 Q119,28 108,29 L80,29 Q74,29 74,24 Z" fill={color} />
      <Path d="M70,33 L112,33 Q118,33 118,28" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M82,29 L80,33 M104,29 L106,33" stroke={color} strokeWidth={1.2} />
    </G>
  );
}
