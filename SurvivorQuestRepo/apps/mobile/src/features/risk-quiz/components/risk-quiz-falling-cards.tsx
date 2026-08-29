import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, useWindowDimensions, View } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";

type RiskQuizFallingCardsProps = {
  isLightTheme: boolean;
};

// Every card is driven off one looping value instead of its own animation, so
// the whole layer costs a single timer. A card's fall is a whole-number
// multiple of that driver's cycle, which is what keeps the loop seamless: when
// the driver wraps 1 -> 0, `progress * speed` wraps from an integer to zero and
// the modulo below lands on exactly the same phase.
const DRIVER_CYCLE_MS = 34000;
const FALL_SPEEDS = [2, 3, 4];
const PHONE_CARD_COUNT = 9;
const TABLET_CARD_COUNT = 14;

// Deterministic stand-in for Math.random: the scatter has to survive re-renders
// (otherwise every state change reshuffles the sky) and stay stable in tests.
function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function RiskQuizFallingCards({ isLightTheme }: RiskQuizFallingCardsProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
  const driver = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, [driver]);

  const baseCardWidth = adaptiveLayout.s(isTabletLayout ? 76 : 54, 44, 88);
  const cardCount = isTabletLayout ? TABLET_CARD_COUNT : PHONE_CARD_COUNT;
  const layerOpacity = isLightTheme ? 0.24 : 0.32;

  const cards = useMemo(
    () =>
      Array.from({ length: cardCount }, (_, index) => {
        const scale = 0.7 + pseudoRandom(index + 1) * 0.6;
        const cardWidth = baseCardWidth * scale;
        const cardHeight = cardWidth * 1.4;
        const speed = FALL_SPEEDS[index % FALL_SPEEDS.length];
        return {
          key: index,
          cardWidth,
          cardHeight,
          speed,
          // Spread the start across the whole column so the sky is already full
          // on the first frame rather than filling in from the top.
          phase: pseudoRandom(index + 11),
          left: -cardWidth * 0.3 + pseudoRandom(index + 23) * (screenWidth + cardWidth * 0.6 - cardWidth * 0.4),
          drift: (pseudoRandom(index + 37) - 0.5) * cardWidth * 1.6,
          spin: (pseudoRandom(index + 53) - 0.5) * 720,
          // Smaller cards read as further away, so they sit fainter.
          opacity: layerOpacity * (0.55 + scale * 0.45),
        };
      }),
    [cardCount, baseCardWidth, screenWidth, layerOpacity],
  );

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      {cards.map((card) => {
        const progress = Animated.modulo(Animated.add(Animated.multiply(driver, card.speed), card.phase), 1);
        return (
          <Animated.View
            key={card.key}
            style={{
              position: "absolute",
              top: 0,
              left: card.left,
              width: card.cardWidth,
              height: card.cardHeight,
              opacity: card.opacity,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-card.cardHeight, screenHeight + card.cardHeight],
                  }),
                },
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, card.drift, 0],
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", `${card.spin}deg`],
                  }),
                },
              ],
            }}
          >
            <View
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: card.cardWidth * 0.16,
                borderWidth: 2,
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panelStrong,
              }}
            >
              <View
                style={{
                  width: "68%",
                  height: "68%",
                  borderRadius: card.cardWidth * 0.1,
                  borderWidth: 1.5,
                  borderColor: EXPEDITION_THEME.accent,
                }}
              />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
