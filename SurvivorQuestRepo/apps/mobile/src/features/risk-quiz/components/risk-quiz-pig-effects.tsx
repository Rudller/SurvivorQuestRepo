import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { ChamferedPanel } from "../../../shared/ui/chamfered-panel";
import { PigIcon } from "./risk-quiz-icons";
import type { RiskPigType } from "../api/risk-quiz.api";

// Loaded lazily and defensively rather than imported at the top of the file.
// Pigs are handed out by the server from a pool, so a tablet still running a
// build from before expo-sensors was added can be sent OVERHEAD — and a hard
// import would take the whole screen down with it instead of just that one
// effect. Undefined here simply means "this device cannot do tilt".
// Loaded lazily and defensively rather than imported at the top of the file.
// Pigs are handed out by the server from a pool, so a tablet still running a
// build from before expo-sensors was added can be sent OVERHEAD — and a hard
// import would take the whole screen down with it instead of just that one
// effect. Null here simply means "this build has no sensors".
function loadAccelerometer(): typeof import("expo-sensors").Accelerometer | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-sensors").Accelerometer ?? null;
  } catch {
    return null;
  }
}

// Polish names for every pig, mirroring RISK_PIG_LABELS in the backend's
// risk-quiz.constants.ts.
export const RISK_PIG_LABELS: Record<RiskPigType, string> = {
  FLASHLIGHT: "Latarka",
  UPSIDE_DOWN: "Do góry nogami",
  SHAKE: "Trzęsienie",
  FOG: "Mgła",
  SQUEAL: "Kwik",
  HASTE: "Pośpiech",
  OVERHEAD: "Nad głową",
};

export const RISK_PIG_DESCRIPTIONS: Record<RiskPigType, string> = {
  FLASHLIGHT: "Ekran gaśnie — świeć sobie palcem.",
  UPSIDE_DOWN: "Wszystko do góry nogami.",
  SHAKE: "Ekran się trzęsie.",
  FOG: "Mgła na ekranie — dotknij, żeby przetrzeć.",
  SQUEAL: "Tablet kwiczy.",
  HASTE: "Czas leci dwa razy szybciej.",
  OVERHEAD: "Ekran świeci tylko trzymany nad głową.",
};

type PigEffectLayerProps = {
  type: RiskPigType | null;
  children: ReactNode;
};

/**
 * Wraps the whole screen and applies whatever pig is currently landing.
 *
 * Every effect here is deliberately *universal* — it works whether or not the
 * team has a card open. Pigs land on a timer and can arrive while a team is
 * sitting idle between cards, so an effect that only makes sense on a card (say,
 * shuffling the answers) would silently do nothing.
 */
export function RiskQuizPigEffectLayer({ type, children }: PigEffectLayerProps) {
  if (!type) {
    return <>{children}</>;
  }

  switch (type) {
    case "UPSIDE_DOWN":
      return <View style={{ flex: 1, transform: [{ rotate: "180deg" }] }}>{children}</View>;
    case "SHAKE":
      return <ShakeEffect>{children}</ShakeEffect>;
    case "FLASHLIGHT":
      return <FlashlightEffect>{children}</FlashlightEffect>;
    case "FOG":
      return <FogEffect>{children}</FogEffect>;
    case "OVERHEAD":
      return <OverheadEffect>{children}</OverheadEffect>;
    // SQUEAL plays a sound and HASTE speeds the card timer up; neither changes
    // how the screen is drawn, so they pass the tree through untouched and are
    // handled by the screen itself.
    case "SQUEAL":
    case "HASTE":
    default:
      return <>{children}</>;
  }
}

function ShakeEffect({ children }: { children: ReactNode }) {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(offset, { toValue: 1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(offset, { toValue: -1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [offset]);

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [
          { translateX: offset.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) },
          { translateY: offset.interpolate({ inputRange: [-1, 1], outputRange: [4, -4] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// The screen goes black and only a small moving hole shows what is underneath.
// This is the no-sensor sibling of OVERHEAD: same "you cannot just read it"
// feeling, no native dependency.
function FlashlightEffect({ children }: { children: ReactNode }) {
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);
  const radius = 90;

  return (
    <View style={{ flex: 1 }}>
      {children}
      <View
        style={{ position: "absolute", inset: 0 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderMove={(event) =>
          setSpot({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY })
        }
        onResponderGrant={(event) =>
          setSpot({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY })
        }
      >
        {/* Four black panes around the hole rather than a real mask: React
            Native has no cheap cut-out, and four Views cost nothing. */}
        {spot ? (
          <>
            <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: Math.max(0, spot.y - radius), backgroundColor: "#000" }} />
            <View style={{ position: "absolute", left: 0, right: 0, top: spot.y + radius, bottom: 0, backgroundColor: "#000" }} />
            <View style={{ position: "absolute", left: 0, width: Math.max(0, spot.x - radius), top: Math.max(0, spot.y - radius), height: radius * 2, backgroundColor: "#000" }} />
            <View style={{ position: "absolute", left: spot.x + radius, right: 0, top: Math.max(0, spot.y - radius), height: radius * 2, backgroundColor: "#000" }} />
          </>
        ) : (
          <View style={{ position: "absolute", inset: 0, backgroundColor: "#000" }} />
        )}
      </View>
    </View>
  );
}

// A dark veil that clears briefly wherever the screen is touched.
function FogEffect({ children }: { children: ReactNode }) {
  const clarity = useRef(new Animated.Value(0)).current;

  const clear = () => {
    clarity.setValue(1);
    Animated.timing(clarity, {
      toValue: 0,
      duration: 1400,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Animated.View
        pointerEvents="box-only"
        onStartShouldSetResponder={() => true}
        onResponderGrant={clear}
        onResponderMove={clear}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: EXPEDITION_THEME.background,
          opacity: clarity.interpolate({ inputRange: [0, 1], outputRange: [0.93, 0.15] }),
        }}
      />
    </View>
  );
}

// The original pig: the screen is dark until the tablet is turned face down,
// which in practice means holding it above your head to read anything.
// The original pig: the screen is dark until the tablet is turned face down,
// which in practice means holding it above your head to read anything.
//
// Reads the accelerometer rather than DeviceMotion.rotation. Rotation is only
// populated when the device exposes a rotation-vector sensor, which plenty do
// not, whereas raw acceleration is near-universal — and its Z axis answers this
// exact question directly: +1g with the screen up, -1g with the screen down.
function OverheadEffect({ children }: { children: ReactNode }) {
  const [isFaceDown, setIsFaceDown] = useState(false);
  // "checking" until the sensor has actually confirmed itself. Rendering the
  // dark overlay before that would look identical to a broken effect on a
  // device that turns out to have no accelerometer at all.
  const [status, setStatus] = useState<"checking" | "ready" | "unavailable">(
    "checking",
  );

  useEffect(() => {
    const accelerometer = loadAccelerometer();
    if (!accelerometer) {
      setStatus("unavailable");
      return;
    }

    let cancelled = false;
    let subscription: { remove: () => void } | null = null;

    // The module can be present while the hardware is not — Expo's own docs
    // say to ask before subscribing.
    void accelerometer
      .isAvailableAsync()
      .then((isAvailable) => {
        if (cancelled) {
          return;
        }
        if (!isAvailable) {
          setStatus("unavailable");
          return;
        }

        accelerometer.setUpdateInterval(150);
        subscription = accelerometer.addListener(({ z }) => {
          if (!cancelled) {
            // Well past vertical rather than merely leaning back: at the -0.6g
            // mark the screen genuinely faces the floor, so propping the tablet
            // up on the table is not enough to read it.
            setIsFaceDown(z < -0.6);
          }
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("unavailable");
        }
      });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  // No accelerometer on this device or build: fall back to the flashlight, the
  // same "you cannot just read it" nuisance without needing one. Silently
  // leaving the screen black instead would be indistinguishable from a bug.
  if (status === "unavailable") {
    return <FlashlightEffect>{children}</FlashlightEffect>;
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {isFaceDown ? null : (
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#000",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: EXPEDITION_THEME.textSubtle,
              fontSize: 15,
              textAlign: "center",
              paddingHorizontal: 24,
            }}
          >
            Podnieś tablet nad głowę ekranem w dół
          </Text>
        </View>
      )}
    </View>
  );
}

type PigBannerProps = {
  type: RiskPigType;
  /** Null when the realization hides the thrower — the banner then says only what hit. */
  fromName: string | null;
  secondsLeft: number;
};

// Sits above the effect so the team knows what hit them and how long it lasts —
// without it a darkened screen reads as a broken tablet, not as a prank.
export function RiskQuizPigBanner({ type, fromName, secondsLeft }: PigBannerProps) {
  return (
    <View
      testID="risk-pig-banner"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        zIndex: 50,
        alignItems: "center",
        paddingVertical: 6,
        backgroundColor: EXPEDITION_THEME.accent,
      }}
      pointerEvents="none"
    >
      <Text className="font-extrabold uppercase tracking-widest" style={{ color: EXPEDITION_THEME.background, fontSize: 12 }}>
        {fromName
          ? `Świnia od ${fromName}: ${RISK_PIG_LABELS[type]} · ${secondsLeft}s`
          : `Świnia: ${RISK_PIG_LABELS[type]} · ${secondsLeft}s`}
      </Text>
    </View>
  );
}

type PigThrowButtonProps = {
  type: RiskPigType;
  onPress: () => void;
};

// A small square tile, sized on its own rather than stretched to the height of
// anything: matching the bottom bar's height made it wide enough to shove the
// bar off centre, and the bar is the anchor the rest of the screen is read
// against. It sits above the bar, hard against the right edge of the screen.
//
// Which pig is held is left to the target picker this opens — a square this size
// has no room for the name, and the picker shows it before anything is thrown.
export function RiskQuizPigButton({ type, onPress }: PigThrowButtonProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
  const buttonSize = adaptiveLayout.hit(isTabletLayout ? 62 : 54);
  // Same 45-degree cut as RiskQuizBottomPanel, scaled down with the tile so the
  // corners read as the same shape rather than the same absolute size.
  const panelCut = adaptiveLayout.s(isTabletLayout ? 15 : 13, 10, 18);
  const panelBorderWidth = adaptiveLayout.s(isTabletLayout ? 3 : 2, 2, 4);
  const iconSize = adaptiveLayout.s(isTabletLayout ? 32 : 27, 22, 36);

  return (
    <Pressable
      testID="risk-pig-button"
      accessibilityRole="button"
      accessibilityLabel={`Rzuć świnię: ${RISK_PIG_LABELS[type]}`}
      onPress={onPress}
      className="active:opacity-90"
      style={{ width: buttonSize, height: buttonSize }}
    >
      <ChamferedPanel
        cut={panelCut}
        backgroundColor={EXPEDITION_THEME.panel}
        borderColor={EXPEDITION_THEME.accent}
        borderWidth={panelBorderWidth}
        texture="cross-hatch"
        textureColor={EXPEDITION_THEME.accent}
        textureOpacity={0.08}
        textureScale={1.3}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <PigIcon size={iconSize} color={EXPEDITION_THEME.accent} />
      </ChamferedPanel>
    </Pressable>
  );
}
