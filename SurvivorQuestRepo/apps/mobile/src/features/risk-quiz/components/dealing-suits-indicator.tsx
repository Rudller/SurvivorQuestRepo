import { useEffect, useState } from "react";
import { Animated, Easing, View } from "react-native";
import Svg from "react-native-svg";

import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useReduceMotion } from "../../../shared/a11y/use-reduce-motion";
import { CARD_SUIT_ORDER, CardSuitShape } from "./card-suits";

// Half-width of one suit's brightness ramp, in cycle units (1 unit = one suit's
// beat). Below 0.5 the suits would go fully dark between beats and the row
// would strobe; this leaves the light crossfading from one suit to the next.
const SUIT_RAMP = 0.55;
const SUIT_DIM_OPACITY = 0.22;
const SUIT_GAP_RATIO = 0.5;

/**
 * Interpolation for one suit in the dealing cycle: dim everywhere except a
 * ramp peaking on its own beat.
 *
 * The driving value runs 0 → count and is then reset straight back to 0 by
 * Animated.loop, so suit 0's beat is split across that seam — it peaks at both
 * ends of the range rather than sitting in the middle like the others. Built
 * here rather than inline because Animated.interpolate throws on an unsorted
 * inputRange, and `index - SUIT_RAMP` goes negative exactly for that suit.
 */
export function buildSuitOpacityRange(index: number, count: number, dim: number) {
  if (index === 0) {
    return {
      inputRange: [0, SUIT_RAMP, count - SUIT_RAMP, count],
      outputRange: [1, dim, dim, 1],
    };
  }

  return {
    inputRange: [0, index - SUIT_RAMP, index, index + SUIT_RAMP, count],
    outputRange: [dim, dim, 1, dim, dim],
  };
}

/**
 * Waiting indicator for the Ryzykanci hold screen: the four card suits lighting
 * up one after another in gold, the way a dealer counts before a hand. Replaces
 * the stock ActivityIndicator, which is the one thing on that screen that could
 * belong to any app at all.
 *
 * `cycleDurationMs` is one full pass over all four suits — pass the logo glow's
 * breath so the two ambient motions on the screen share a pulse.
 */
export function DealingSuitsIndicator({
  size,
  cycleDurationMs,
}: {
  size: number;
  cycleDurationMs: number;
}) {
  const cycle = useState(() => new Animated.Value(0))[0];
  const isReduceMotionEnabled = useReduceMotion();

  useEffect(() => {
    if (isReduceMotionEnabled) return;

    const loop = Animated.loop(
      Animated.timing(cycle, {
        toValue: CARD_SUIT_ORDER.length,
        duration: cycleDurationMs,
        // Linear on purpose: a dealer's count is even, and easing would make
        // the light hesitate over the first and last suit of every pass.
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();

    return () => loop.stop();
  }, [cycle, cycleDurationMs, isReduceMotionEnabled]);

  return (
    <View
      // The status text beside this row already says what is happening, so the
      // suits are decoration as far as a screen reader is concerned.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ flexDirection: "row", alignItems: "center", columnGap: size * SUIT_GAP_RATIO }}
    >
      {CARD_SUIT_ORDER.map((suit, index) => (
        <Animated.View
          key={suit}
          style={{
            // Stilled: all four suits sit lit. A dimmed row would read as
            // "disabled" when nothing is left to animate it back up.
            opacity: isReduceMotionEnabled
              ? 1
              : cycle.interpolate(
                  buildSuitOpacityRange(index, CARD_SUIT_ORDER.length, SUIT_DIM_OPACITY),
                ),
          }}
        >
          <Svg width={size} height={size} viewBox="0 0 24 24" fill={EXPEDITION_THEME.accentStrong}>
            <CardSuitShape suit={suit} />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}
