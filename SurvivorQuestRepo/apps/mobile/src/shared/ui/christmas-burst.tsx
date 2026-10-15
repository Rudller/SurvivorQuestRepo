import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg from "react-native-svg";

import { getExpeditionThemeFamily } from "../../features/onboarding/model/constants";
import { useReduceMotion } from "../a11y/use-reduce-motion";
import { useAdaptiveLayout } from "../layout/use-adaptive-layout";
import { pseudoRandom } from "../math/pseudo-random";
import { ChristmasShape } from "./christmas-shapes";

/**
 * Jednorazowy wybuch złotych gwiazdek i płatków śniegu ze środka ekranu —
 * nagroda za zaliczone stanowisko w oprawie świątecznej. Rysuje się tylko w tej
 * oprawie i nie przy „Ogranicz ruch”; poza tym zwraca null.
 *
 * Odpala się przy montażu, więc żeby powtórzyć efekt, wywołujący zmienia `key`.
 */
const BURST_MS = 1500;
export const BURST_PARTICLE_COUNT = 20;

const PARTICLE_COLORS = ["#f3d27a", "#ffffff", "#e05a55", "#f3d27a"] as const;

export function ChristmasBurst() {
  const adaptiveLayout = useAdaptiveLayout();
  const isReduceMotionEnabled = useReduceMotion();
  const progress = useState(() => new Animated.Value(0))[0];
  const isChristmas = getExpeditionThemeFamily() === "christmas";
  const isActive = isChristmas && !isReduceMotionEnabled;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: BURST_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, isActive]);

  const isTablet = adaptiveLayout.isTablet;
  const particles = useMemo(
    () =>
      Array.from({ length: BURST_PARTICLE_COUNT }, (_, index) => {
        const angle = ((index / BURST_PARTICLE_COUNT) * 360 + pseudoRandom(index + 5) * 14) * (Math.PI / 180);
        const distance = (isTablet ? 260 : 170) * (0.6 + pseudoRandom(index + 9) * 0.5);
        return {
          key: index,
          kind: index % 2 === 0 ? ("star" as const) : ("snowflake" as const),
          color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
          size: (isTablet ? 22 : 16) * (0.7 + pseudoRandom(index + 13) * 0.6),
          dx: Math.cos(angle) * distance,
          // Lekko w dół na końcu — iskry opadają, a nie lecą po prostych.
          dy: Math.sin(angle) * distance,
          spin: (pseudoRandom(index + 17) - 0.5) * 540,
        };
      }),
    [isTablet],
  );

  if (!isActive) {
    return null;
  }

  return (
    <View
      testID="christmas-burst"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 90,
      }}
    >
      {particles.map((particle) => (
        <Animated.View
          key={particle.key}
          style={{
            position: "absolute",
            width: particle.size,
            height: particle.size,
            opacity: progress.interpolate({
              inputRange: [0, 0.08, 0.65, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.dx] }) },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [0, particle.dy * 0.9, particle.dy + 30],
                }),
              },
              { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${particle.spin}deg`] }) },
              { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.1, 0.7] }) },
            ],
          }}
        >
          <Svg width={particle.size} height={particle.size} viewBox="0 0 24 24">
            <ChristmasShape kind={particle.kind} color={particle.color} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}
