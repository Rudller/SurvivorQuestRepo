import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { EXPEDITION_THEME } from "../../features/onboarding/model/constants";
import { useReduceMotion } from "../a11y/use-reduce-motion";
import { useAdaptiveLayout } from "../layout/use-adaptive-layout";

type ChristmasGarlandProps = {
  isLightTheme: boolean;
};

/**
 * Sznur lampek wzdłuż górnej krawędzi ekranu. Drut jest statycznym SVG, a
 * żarówki to zwykłe View migające przez opacity na native driverze — jedna
 * pętla na całą girlandę, trzy grupy żarówek przesunięte w fazie, więc
 * światło „biegnie” wzdłuż sznura.
 *
 * Girlanda leży NAD panelami (zIndex 40, pod przyciskami z-50), ale jest niska i
 * nie łapie dotyku.
 */
const BLINK_CYCLE_MS = 1800;
const BULB_COLORS = ["#e05a55", "#f3d27a", "#4fd18b", "#bfe3ff"] as const;
const BULBS_PER_SWAG = 4;

// Każda grupa ma ten sam kształt jasności, przesunięty o trzecią część cyklu.
// Pierwsza i ostatnia wartość są równe, więc zawinięcie pętli nie mruga.
const GROUP_OPACITY: readonly (readonly number[])[] = [
  [1, 0.35, 0.6, 1],
  [0.6, 1, 0.35, 0.6],
  [0.35, 0.6, 1, 0.35],
];

export function ChristmasGarland({ isLightTheme }: ChristmasGarlandProps) {
  const { width: screenWidth } = useWindowDimensions();
  const adaptiveLayout = useAdaptiveLayout();
  const isReduceMotionEnabled = useReduceMotion();
  const driver = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (isReduceMotionEnabled) {
      return;
    }

    const loop = Animated.loop(
      Animated.timing(driver, {
        toValue: 1,
        duration: BLINK_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      driver.setValue(0);
    };
  }, [driver, isReduceMotionEnabled]);

  const isTablet = adaptiveLayout.isTablet;
  const swagWidth = isTablet ? 150 : 110;
  const sag = isTablet ? 8 : 7;
  const wireTop = 3;
  const bulbWidth = isTablet ? 7 : 6;
  const bulbHeight = isTablet ? 10 : 9;
  const glowSize = bulbWidth * 3.2;
  const height = wireTop + sag + bulbHeight + glowSize / 2;

  const { wirePath, bulbs } = useMemo(
    () => buildGarland(screenWidth, swagWidth, wireTop, sag),
    [screenWidth, swagWidth, sag],
  );

  const wireColor = isLightTheme ? EXPEDITION_THEME.textSubtle : EXPEDITION_THEME.mapNode;

  return (
    <View
      testID="christmas-garland"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: 0, left: 0, right: 0, height, zIndex: 40 }}
    >
      <Svg width={screenWidth} height={height} style={{ position: "absolute", top: 0, left: 0 }}>
        <Path d={wirePath} fill="none" stroke={wireColor} strokeWidth={1.4} />
      </Svg>
      {bulbs.map((bulb, index) => {
        const color = BULB_COLORS[index % BULB_COLORS.length];
        const opacity = isReduceMotionEnabled
          ? 1
          : driver.interpolate({
              inputRange: [0, 0.33, 0.66, 1],
              outputRange: [...GROUP_OPACITY[index % GROUP_OPACITY.length]],
            });
        return (
          <View
            key={index}
            style={{
              position: "absolute",
              left: bulb.x - glowSize / 2,
              top: bulb.y,
              width: glowSize,
              alignItems: "center",
            }}
          >
            {/* Oprawka. */}
            <View style={{ width: bulbWidth * 0.7, height: 3, backgroundColor: wireColor, borderRadius: 1 }} />
            <Animated.View style={{ alignItems: "center", opacity }}>
              {/* Poświata pod żarówką — Android nie ma kolorowego cienia, więc
                  świecenie udaje półprzezroczyste koło tego samego koloru. */}
              <View
                style={{
                  position: "absolute",
                  top: bulbHeight / 2 - glowSize / 2,
                  width: glowSize,
                  height: glowSize,
                  borderRadius: glowSize / 2,
                  backgroundColor: color,
                  opacity: isLightTheme ? 0.18 : 0.28,
                }}
              />
              <View
                style={{
                  width: bulbWidth,
                  height: bulbHeight,
                  borderRadius: bulbWidth / 2,
                  backgroundColor: color,
                }}
              />
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
}

/** Drut z łuków i punkty zawieszenia żarówek na krzywej każdego łuku. */
export function buildGarland(screenWidth: number, swagWidth: number, wireTop: number, sag: number) {
  const swagCount = Math.max(2, Math.round(screenWidth / swagWidth));
  const span = screenWidth / swagCount;
  const controlY = wireTop + sag * 2;

  let wirePath = `M0,${wireTop}`;
  const bulbs: { x: number; y: number }[] = [];

  for (let index = 0; index < swagCount; index += 1) {
    const x0 = index * span;
    const x1 = x0 + span;
    const cx = x0 + span / 2;
    wirePath += ` Q${cx},${controlY} ${x1},${wireTop}`;

    for (let bulb = 1; bulb <= BULBS_PER_SWAG; bulb += 1) {
      const t = bulb / (BULBS_PER_SWAG + 1);
      const inverse = 1 - t;
      bulbs.push({
        x: inverse * inverse * x0 + 2 * inverse * t * cx + t * t * x1,
        y: inverse * inverse * wireTop + 2 * inverse * t * controlY + t * t * wireTop,
      });
    }
  }

  return { wirePath, bulbs };
}
