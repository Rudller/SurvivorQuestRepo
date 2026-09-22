import { useEffect } from "react";
import { Animated, Easing, Image, View, useAnimatedValue } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { useReduceMotion } from "../../../shared/a11y/use-reduce-motion";

const RYZYKANCI_LOGO = require("../../../../assets/ryzykanci-logo.png");
// Intrinsic 1599x984 of that file — used to size the box the logo is drawn
// into, since the <Image> itself is stretched to fill that box.
const RYZYKANCI_LOGO_ASPECT_RATIO = 1599 / 984;
const GLOW_COLOR = "#f59e0b";
// One half-breath. Slow enough to read as ambient rather than as a pulse
// demanding attention.
const GLOW_BREATH_MS = 2800;

type RyzykanciLogoHeaderProps = {
  /** Ceiling as a share of screen height; landscape would otherwise hand the
   *  logo the whole viewport. */
  maxHeightRatio?: number;
  /** Horizontal padding of the column this sits in, so the halo can bleed back
   *  out to the screen edges the logo itself no longer touches. */
  contentPadding?: number;
};

/**
 * The Ryzykanci wordmark with its breathing halo — the header both the waiting
 * screen and the end screen open with.
 *
 * Shared rather than copied because the halo is the fiddly part: it has to
 * bleed past the logo box on every side so the gradient reaches zero off-frame
 * instead of ending on a visible rectangle edge.
 */
export function RyzykanciLogoHeader({ maxHeightRatio = 0.33, contentPadding = 24 }: RyzykanciLogoHeaderProps) {
  const adaptiveLayout = useAdaptiveLayout();
  // Fixed box, `contain` inside it. `aspectRatio` on the <Image> itself cropped
  // the logo on device, so the height is computed here instead. A safe-area
  // inset would make the real box narrower still, which only adds letter-boxing
  // — `contain` never crops, so an over-estimate here is harmless.
  const boxHeight = Math.min(
    (adaptiveLayout.width - contentPadding * 2) / RYZYKANCI_LOGO_ASPECT_RATIO,
    adaptiveLayout.height * maxHeightRatio,
  );

  return (
    <View style={{ width: "100%", height: boxHeight }}>
      <BreathingLogoGlow boxHeight={boxHeight} contentPadding={contentPadding} />
      <Image
        source={RYZYKANCI_LOGO}
        accessibilityRole="image"
        accessibilityLabel="Ryzykanci"
        resizeMode="contain"
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}

function BreathingLogoGlow({ boxHeight, contentPadding }: { boxHeight: number; contentPadding: number }) {
  const breath = useAnimatedValue(0);
  const isReduceMotionEnabled = useReduceMotion();

  useEffect(() => {
    if (isReduceMotionEnabled) {
      // Park it mid-breath: the halo still reads as a deliberate glow rather
      // than vanishing, it just stops pulsing.
      breath.setValue(0.5);
      return;
    }

    const halfBreath = (toValue: number) =>
      Animated.timing(breath, {
        toValue,
        duration: GLOW_BREATH_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([halfBreath(1), halfBreath(0)]));
    loop.start();

    return () => loop.stop();
  }, [breath, isReduceMotionEnabled]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -boxHeight * 0.22,
        bottom: -boxHeight * 0.22,
        left: -contentPadding,
        right: -contentPadding,
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.95] }),
        transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }],
      }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="ryzykanciLogoGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={GLOW_COLOR} stopOpacity={0.42} />
            <Stop offset="45%" stopColor={GLOW_COLOR} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={GLOW_COLOR} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#ryzykanciLogoGlow)" />
      </Svg>
    </Animated.View>
  );
}
