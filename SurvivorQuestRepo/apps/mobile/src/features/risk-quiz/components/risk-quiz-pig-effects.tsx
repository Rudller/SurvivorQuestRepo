import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";
import { ChamferedPanel } from "../../../shared/ui/chamfered-panel";
import { useReduceMotion } from "../../../shared/a11y/use-reduce-motion";
import { pseudoRandom } from "../../../shared/math/pseudo-random";
import { PigIcon } from "./risk-quiz-icons";
import type { RiskPigType } from "../api/risk-quiz.api";

// Both sensors are loaded lazily and defensively rather than imported at the
// top of the file. Pigs are handed out by the server from a pool, so a tablet
// still running a build from before expo-sensors was added can be sent OVERHEAD
// or DARKNESS — and a hard import would take the whole screen down with it
// instead of just that one effect. Null here simply means "this build has no
// sensors", which each effect below turns into a harmless no-op.
function loadAccelerometer(): typeof import("expo-sensors").Accelerometer | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-sensors").Accelerometer ?? null;
  } catch {
    return null;
  }
}

function loadLightSensor(): typeof import("expo-sensors").LightSensor | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-sensors").LightSensor ?? null;
  } catch {
    return null;
  }
}

// Required lazily for a different reason than the sensors above: expo-audio
// throws on import under jest-expo, so pulling it in at the top of this file
// would take every unrelated test suite down with it. Loading it only once a
// SILENCE pig has landed keeps the rest of the app — and the tests — clear of it.
function loadSilenceEffect() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./risk-quiz-pig-silence").SilenceEffect ?? null;
  } catch {
    return null;
  }
}

// Anything at or below this reads as "they have genuinely hidden the tablet":
// a couple of lux is cupped hands, a coat, or a properly dark room.
const DARKNESS_FULLY_REVEALED_LUX = 2;
// ...and anything at or above it is already too bright to read. Deliberately
// set below a normally lit room (~150-300 lx) rather than at office light:
// pitched at 400 the screen still showed through indoors, which is exactly
// where the game is played.
const DARKNESS_FULLY_HIDDEN_LUX = 150;

/**
 * Maps an ambient light reading to how much of the screen shows through, from
 * 1 (fully readable) down to 0 (fully blacked out).
 *
 * The curve is logarithmic because lux is: the step from a lit room to cupped
 * hands is a couple of hundred lux, while the step from cupped hands to a coat
 * pocket is a couple of lux — and on a linear ramp that second step, the one
 * the team is actually working for, would be invisible.
 */
export function darknessRevealAmount(illuminance: number): number {
  // A dead or wedged sensor must not black the screen out with no way back.
  if (!Number.isFinite(illuminance)) {
    return 1;
  }

  const lux = Math.max(0, illuminance);
  const darkest = Math.log10(DARKNESS_FULLY_REVEALED_LUX + 1);
  const brightest = Math.log10(DARKNESS_FULLY_HIDDEN_LUX + 1);
  const position = (Math.log10(lux + 1) - darkest) / (brightest - darkest);

  return Math.min(1, Math.max(0, 1 - position));
}

// Low enough that a flickering tube or someone's torch sweeping past cannot
// flash the screen, high enough that covering the tablet still feels immediate.
const DARKNESS_SMOOTHING = 0.3;

/**
 * Exponential moving average over the raw sensor feed. Pass the previous
 * smoothed value, or null for the first reading.
 */
export function smoothIlluminance(previous: number | null, sample: number): number {
  if (!Number.isFinite(sample)) {
    return previous ?? 0;
  }

  const lux = Math.max(0, sample);
  if (previous === null) {
    return lux;
  }

  return previous + (lux - previous) * DARKNESS_SMOOTHING;
}

// Polish names for every pig, mirroring RISK_PIG_LABELS in the backend's
// risk-quiz.constants.ts.
export const RISK_PIG_LABELS: Record<RiskPigType, string> = {
  FLASHLIGHT: "Latarka",
  UPSIDE_DOWN: "Do góry nogami",
  SHAKE: "Trzęsienie",
  FOG: "Mgła",
  DARKNESS: "Ciemność",
  OVERHEAD: "Nad głową",
  MIRROR: "Lustro",
  SLIDE: "Ślizg",
  SILENCE: "Cisza",
};

// Doubles as the text on the briefing card, so each one says what is happening
// *and* what to do about it — a team reading "Mgła na ekranie" and nothing else
// would just wait for it to pass.
export const RISK_PIG_DESCRIPTIONS: Record<RiskPigType, string> = {
  FLASHLIGHT: "Ekran gaśnie. Przesuwaj palcem — świeci tylko krąg pod palcem.",
  UPSIDE_DOWN: "Ekran staje na głowie. Obróćcie tablet.",
  SHAKE: "Ekran się trzęsie. Celujcie uważniej.",
  FOG: "Ekran zachodzi mgłą. Przecierajcie go palcem na boki tam, gdzie chcecie widzieć — przetarte miejsce powoli zachodzi z powrotem.",
  DARKNESS: "Ekran widać tylko w ciemności — im ciemniej, tym wyraźniej. Schowajcie tablet przed światłem.",
  OVERHEAD: "Ekran świeci tylko trzymany nad głową, ekranem w dół.",
  MIRROR: "Ekran w lustrze. Wszystko jest odbite — czytajcie i celujcie na odwrót.",
  SLIDE: "Ekran ucieka po tablecie. Celujcie z wyprzedzeniem.",
  SILENCE: "Ekran widać tylko w ciszy. Im głośniej mówicie, tym ciemniej — tablet was słyszy.",
};

type PigEffectLayerProps = {
  type: RiskPigType | null;
  // Only the fog needs it, but it has to come from the screen: EXPEDITION_THEME
  // resolves per property read rather than through a context, so a component
  // deep in the tree cannot notice the mode changing on its own.
  isLightTheme: boolean;
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
// How long the "here is what just hit you" card covers the screen before the
// effect is revealed underneath.
const PIG_BRIEFING_MS = 2600;

function renderPigEffect(type: RiskPigType, isLightTheme: boolean, children: ReactNode) {
  switch (type) {
    case "UPSIDE_DOWN":
      return <View style={{ flex: 1, transform: [{ rotate: "180deg" }] }}>{children}</View>;
    case "SHAKE":
      return <ShakeEffect>{children}</ShakeEffect>;
    case "FLASHLIGHT":
      return <FlashlightEffect>{children}</FlashlightEffect>;
    case "FOG":
      return <FogEffect isLightTheme={isLightTheme}>{children}</FogEffect>;
    case "OVERHEAD":
      return <OverheadEffect>{children}</OverheadEffect>;
    case "DARKNESS":
      return <DarknessEffect>{children}</DarknessEffect>;
    // Mirrored rather than rotated: taps still land where they look like they
    // land, because the transform carries the hit area with it. What breaks is
    // reading, and every reflex about which side a button is on.
    case "MIRROR":
      return (
        <View testID="risk-pig-mirror-layer" style={{ flex: 1, transform: [{ scaleX: -1 }] }}>
          {children}
        </View>
      );
    case "SLIDE":
      return <SlideEffect>{children}</SlideEffect>;
    case "SILENCE": {
      const SilenceEffect = loadSilenceEffect();
      const fallback = <FlashlightEffect>{children}</FlashlightEffect>;
      return SilenceEffect ? (
        <SilenceEffect fallback={fallback}>{children}</SilenceEffect>
      ) : (
        fallback
      );
    }
    // Every pig now draws something. The default stays as the guard for a type
    // a newer server knows about and this build does not — passing the tree
    // through untouched beats crashing the screen on an unknown value.
    default:
      return <>{children}</>;
  }
}

export function RiskQuizPigEffectLayer({ type, isLightTheme, children }: PigEffectLayerProps) {
  const [isBriefingVisible, setIsBriefingVisible] = useState(false);

  useEffect(() => {
    if (!type) {
      setIsBriefingVisible(false);
      return;
    }

    setIsBriefingVisible(true);
    const timeout = setTimeout(() => setIsBriefingVisible(false), PIG_BRIEFING_MS);
    return () => clearTimeout(timeout);
  }, [type]);

  if (!type) {
    return <>{children}</>;
  }

  return (
    // The effect is already running underneath and the card simply covers it.
    // Swapping the tree instead — plain children first, effect after — would
    // unmount and rebuild the whole screen at the hand-off, taking the open
    // card and any typed answer with it.
    <View style={{ flex: 1 }}>
      {renderPigEffect(type, isLightTheme, children)}
      {isBriefingVisible ? <PigBriefing type={type} /> : null}
    </View>
  );
}

// Shown for a beat before the effect is revealed. A screen that just goes dark
// reads as a broken tablet; a team that has been told what is happening and
// what to do about it reads it as the prank it is.
function PigBriefing({ type }: { type: RiskPigType }) {
  return (
    <View
      testID="risk-pig-briefing"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        backgroundColor: EXPEDITION_THEME.background,
      }}
    >
      <Text
        className="uppercase tracking-widest"
        style={{ color: EXPEDITION_THEME.textSubtle, fontSize: 13, marginBottom: 10 }}
      >
        Dostajesz świnię
      </Text>
      <Text
        className="font-extrabold uppercase tracking-widest text-center"
        style={{ color: EXPEDITION_THEME.accent, fontSize: 34, marginBottom: 14 }}
      >
        {RISK_PIG_LABELS[type]}
      </Text>
      <Text
        className="text-center"
        style={{ color: EXPEDITION_THEME.textPrimary, fontSize: 17, lineHeight: 24 }}
      >
        {RISK_PIG_DESCRIPTIONS[type]}
      </Text>
    </View>
  );
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

// The screen goes black except for a soft round pool of light the team drags
// around with a finger. This is the no-sensor sibling of OVERHEAD: same "you
// cannot just read it" feeling, no native dependency.
function FlashlightEffect({ children }: { children: ReactNode }) {
  const gradientId = `pig-flashlight-${useId()}`;
  const containerRef = useRef<View>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);

  const radius = Math.max(145, Math.round(Math.min(size.width, size.height) * 0.26));
  // Centred until the first touch, so the pig never opens on a dead black
  // rectangle that reads as a broken tablet.
  const centreX = spot?.x ?? size.width / 2;
  const centreY = spot?.y ?? size.height / 2;

  // Page coordinates rather than locationX/Y: these handlers fire for touches
  // anywhere in the subtree, including ones a button underneath goes on to
  // handle, and locationX would then be relative to that button.
  const track = (event: GestureResponderEvent) => {
    const x = event.nativeEvent.pageX - originRef.current.x;
    const y = event.nativeEvent.pageY - originRef.current.y;
    setSpot((previous) => {
      // A drag fires an event every few pixels and each one that changes state
      // redraws the gradient. Below this the pool would not visibly move.
      if (previous && Math.abs(previous.x - x) < 3 && Math.abs(previous.y - y) < 3) {
        return previous;
      }
      return { x, y };
    });
  };

  return (
    <View
      ref={containerRef}
      style={{ flex: 1 }}
      // Plain touch handlers, deliberately not the responder props this used to
      // claim. Winning the responder meant the dark layer swallowed every tap,
      // so a team could light up an answer and then not press it — the pig went
      // from a nuisance to a wall.
      onTouchStart={track}
      onTouchMove={track}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
        containerRef.current?.measureInWindow((x, y) => {
          originRef.current = { x, y };
        });
      }}
    >
      {children}
      {size.width > 0 && size.height > 0 ? (
        <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
          <Svg width={size.width} height={size.height}>
            <Defs>
              {/* A real radial fade instead of the four black panes this used to
                  cut a square hole with. Past the last stop the fill pads with
                  it, so everything outside the pool is solid black. */}
              <RadialGradient
                id={gradientId}
                cx={centreX}
                cy={centreY}
                r={radius}
                gradientUnits="userSpaceOnUse"
              >
                {/* The clear core runs most of the way out before the falloff
                    bites — a tighter ramp left a readable disc barely wider than
                    a fingertip, which is a puzzle rather than a nuisance. */}
                <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                <Stop offset="0.6" stopColor="#000000" stopOpacity="0.08" />
                <Stop offset="0.85" stopColor="#000000" stopOpacity="0.6" />
                <Stop offset="1" stopColor="#000000" stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${gradientId})`} />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}

// The fog is a field of overlapping soft puffs rather than one flat pane, and
// each puff carries its own opacity, so rubbing opens a hole where the finger
// actually is instead of lifting the whole screen at once.
const FOG_PHONE_COLUMNS = 3;
const FOG_PHONE_ROWS = 5;
const FOG_TABLET_COLUMNS = 4;
const FOG_TABLET_ROWS = 6;
// Each puff spans well over one cell so neighbours overlap and no lattice of
// thin spots shows through where cells meet.
const FOG_PUFF_SPREAD = 1.7;
// How far a rub reaches, as a fraction of a puff's diameter. This has to clear
// the puff under the finger *and* its diagonal neighbours, which in this packing
// sit about 0.41 diameters away: a narrower rub left those neighbours untouched
// and they ringed every hole with a bright rim that read as a bug.
const FOG_WIPE_RADIUS_RATIO = 0.55;
// How much of a puff one credited rub removes at the very centre of the wipe.
// Nearly all of it: at 0.35 a whole swipe across the screen moved the composited
// haze only from 0.86 to 0.65 and it was back at 0.75 half a second later, which
// read as the pig ignoring the finger altogether.
const FOG_WIPE_STRENGTH = 0.85;
// How long a fully wiped puff takes to close over again. Long enough that a
// team can clear a patch, look up at each other, and still read it.
const FOG_REGROW_MS = 6000;
// A rub only counts once the finger has travelled this far since the last one,
// so resting a thumb on the glass clears nothing. Travel accumulates across
// skipped events — the last credited point is what the next one is measured
// against — so a slow drag still counts, it just counts less often.
const FOG_MIN_TRAVEL_PX = 12;
// How far sideways a finger has to go before the fog takes the gesture off the
// ScrollView underneath it. Small enough that a real rub is caught immediately,
// large enough that the wobble in a tap is not.
const FOG_RUB_CLAIM_PX = 8;
// A puff grazed at the very edge of the rub changes by a fraction of a percent,
// which nobody can see but which still costs a write to the native thread on
// every single drag event. Below this the change is dropped.
const FOG_RUB_EPSILON = 0.02;
// The puffs sit on a thin even haze. It never clears completely, which is what
// keeps a scrubbed screen merely hard to read rather than fully readable — and
// it stops a gap between puffs from ever looking like a clean window.
const FOG_BASE_MAX_OPACITY = 0.52;
const FOG_BASE_MIN_OPACITY = 0.18;
const FOG_BASE_DECAY_MS = 3200;
const FOG_BASE_RUB_GAIN = 0.22;
// Puffs overlap three or four deep, so this is nowhere near the density the
// screen ends up at: composited, the field rests around 0.98 where it is
// thickest and 0.69 in its thin spots, averaging 0.93. The spread is the point —
// a flat wall of haze is what the first version of this pig looked like, and a
// field that thins out in places reads as weather instead. A scrubbed patch
// bottoms out at the base haze.
const FOG_PUFF_OPACITY = 0.82;
// Cool pale grey over the dark theme, near-white over the light one.
const FOG_COLOR_DARK = "rgb(176, 196, 208)";
const FOG_COLOR_LIGHT = "rgb(246, 248, 250)";
// One shared driver moves every puff, so the whole field costs a single timer.
// Speeds are whole numbers so the modulo below wraps seamlessly.
const FOG_DRIFT_CYCLE_MS = 26000;
const FOG_DRIFT_SPEEDS = [1, 2];
const FOG_DRIFT_AMPLITUDE_PX = 14;
// Puffs of one size on an even grid read as a field of circles rather than as
// weather, so each one is grown by up to this fraction and nudged off its cell
// by this fraction of a step. Both stay small enough that the field still
// covers the corners.
const FOG_PUFF_SIZE_JITTER = 0.28;
const FOG_PUFF_OFFSET_JITTER = 0.06;

export type FogPuff = {
  key: number;
  centreX: number;
  centreY: number;
  diameter: number;
  driftX: number;
  driftY: number;
  phase: number;
  speed: number;
};

/**
 * Lays the puffs out over the screen.
 *
 * Rows are offset by half a step in alternation rather than sitting on a square
 * lattice: four circles meeting at a corner leave a thin diamond between them,
 * and a screenful of those reads as a grid pattern instead of as weather.
 */
export function buildFogPuffs(width: number, height: number, isTablet: boolean): FogPuff[] {
  if (width <= 0 || height <= 0) {
    return [];
  }

  const columns = isTablet ? FOG_TABLET_COLUMNS : FOG_PHONE_COLUMNS;
  const rows = isTablet ? FOG_TABLET_ROWS : FOG_PHONE_ROWS;
  const stepX = width / columns;
  const stepY = height / rows;
  // One diameter for every puff: identical sizes mean identical gradients, and
  // the edges of the screen are covered by the overhang rather than by an extra
  // ring of puffs nobody would ever see the middle of.
  const diameter = Math.max(stepX, stepY) * FOG_PUFF_SPREAD;

  const puffs: FogPuff[] = [];
  let key = 0;
  for (let row = 0; row < rows; row += 1) {
    // Offset rows are shifted half a step *left* and get one extra puff, so they
    // start on the left edge and end on the right one. Shifting them right
    // instead left a wedge of bare screen down the left side of every other row,
    // which showed up at the bottom-left corner as a permanently clear patch.
    const isOffsetRow = row % 2 === 1;
    const rowColumns = isOffsetRow ? columns + 1 : columns;
    for (let column = 0; column < rowColumns; column += 1) {
      const centreX = isOffsetRow ? stepX * column : stepX * (column + 0.5);
      puffs.push({
        key,
        centreX: centreX + (pseudoRandom(key + 59) - 0.5) * 2 * FOG_PUFF_OFFSET_JITTER * stepX,
        centreY:
          stepY * (row + 0.5) + (pseudoRandom(key + 71) - 0.5) * 2 * FOG_PUFF_OFFSET_JITTER * stepY,
        // Only ever grown, never shrunk: the layout above is sized so that the
        // base diameter already reaches the corners, and a puff that shrank
        // could pull the field back off one.
        diameter: diameter * (1 + pseudoRandom(key + 41) * FOG_PUFF_SIZE_JITTER),
        driftX: (pseudoRandom(key + 3) - 0.5) * 2 * FOG_DRIFT_AMPLITUDE_PX,
        driftY: (pseudoRandom(key + 17) - 0.5) * 2 * FOG_DRIFT_AMPLITUDE_PX,
        phase: pseudoRandom(key + 29),
        speed: FOG_DRIFT_SPEEDS[key % FOG_DRIFT_SPEEDS.length],
      });
      key += 1;
    }
  }

  return puffs;
}

/**
 * How much of a puff a rub at `distance` from its centre takes off, as a
 * fraction of a full wipe. Squared falloff rather than linear so the hole has a
 * soft shoulder instead of a visible rim.
 */
export function fogWipeAmount(distance: number, radius: number): number {
  if (radius <= 0 || distance >= radius) {
    return 0;
  }
  const falloff = 1 - distance / radius;
  return falloff * falloff;
}

/**
 * What a puff is left at after one credited rub `distance` away from it.
 *
 * This is the whole feel of the pig in one line: too gentle and the fog looks
 * like it is ignoring the finger, too fierce and one careless swipe clears the
 * board.
 */
export function fogRubbedLevel(level: number, distance: number, radius: number): number {
  return Math.max(0, level - fogWipeAmount(distance, radius) * FOG_WIPE_STRENGTH);
}

type FogPuffRuntime = {
  values: Animated.Value[];
  // How fogged each puff is right now, in plain JS. Authoritative while a finger
  // is down; between gestures it is the level the running regrow started from,
  // and `from`/`startedAt`/`durations` reconstruct where that regrow has got to.
  // Never read back off the animation itself — that means a round trip to the
  // native thread, and this is touched on every drag event.
  levels: number[];
  from: number[];
  startedAt: number[];
  durations: number[];
  animations: (Animated.CompositeAnimation | null)[];
};

function currentPuffLevel(runtime: FogPuffRuntime, index: number, now: number): number {
  const startedAt = runtime.startedAt[index];
  if (startedAt === 0) {
    return runtime.levels[index];
  }
  const elapsed = now - startedAt;
  const duration = runtime.durations[index];
  if (elapsed >= duration) {
    return 1;
  }
  const from = runtime.from[index];
  // The regrow runs on a linear easing precisely so this stays exact — an eased
  // regrow would make the mirror drift and the next rub would visibly snap.
  return from + (1 - from) * (elapsed / duration);
}

/**
 * A haze over the whole screen that has to be rubbed off and creeps straight
 * back the moment the team stops rubbing.
 *
 * This is deliberately *not* the flashlight's geometry. Two earlier attempts
 * went that way — a trail of wiped patches, then a single pool following the
 * finger — and both stuttered for the same reason: anything that paints a
 * full-screen SVG has to re-rasterise the whole thing every time the finger
 * moves, and a finger moves sixty times a second.
 *
 * So nothing here is ever redrawn. Every puff's gradient is rasterised once at
 * mount and from then on only its `opacity` and `transform` change, both on the
 * native thread. Rubbing writes straight into Animated.Values with setValue,
 * which renders nothing — there is not a single React render while a finger is
 * down.
 */
function FogEffect({ children, isLightTheme }: { children: ReactNode; isLightTheme: boolean }) {
  const gradientId = `pig-fog-${useId()}`;
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
  const isReduceMotionEnabled = useReduceMotion();

  const containerRef = useRef<View>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });

  const drift = useRef(new Animated.Value(0)).current;
  const baseClarity = useRef(new Animated.Value(0)).current;
  const baseClarityRef = useRef(0);
  const baseDecayRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastRubAtRef = useRef(0);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const gestureStartRef = useRef<{ x: number; y: number } | null>(null);
  // A single gesture reaches both the raw touch handlers and, if the claim below
  // fires, the responder ones. Without this both would open and close it, and
  // the release would start a second regrow per puff on top of the first.
  const isRubbingRef = useRef(false);

  const puffs = useMemo(
    () => buildFogPuffs(size.width, size.height, isTabletLayout),
    [size.width, size.height, isTabletLayout],
  );

  // Rebuilt with the layout, which in practice means once. A puff that was
  // half-wiped when the tablet rotated comes back fogged, which is the right way
  // round: the alternative is a hole hanging in mid-air over new geometry.
  const runtime = useMemo<FogPuffRuntime>(
    () => ({
      values: puffs.map(() => new Animated.Value(1)),
      levels: puffs.map(() => 1),
      from: puffs.map(() => 1),
      startedAt: puffs.map(() => 0),
      durations: puffs.map(() => FOG_REGROW_MS),
      animations: puffs.map(() => null),
    }),
    [puffs],
  );

  useEffect(() => {
    if (isReduceMotionEnabled) {
      return;
    }
    const driftLoop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: FOG_DRIFT_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    driftLoop.start();
    return () => {
      driftLoop.stop();
      drift.setValue(0);
    };
  }, [drift, isReduceMotionEnabled]);

  useEffect(() => {
    return () => {
      isRubbingRef.current = false;
      baseDecayRef.current?.stop();
      runtime.animations.forEach((animation) => animation?.stop());
    };
  }, [runtime]);

  // The smallest puff is the un-jittered base size, since the jitter only ever
  // grows one. Taking whichever puff happened to be first would instead hand the
  // rub a reach that changed with the dice.
  const wipeRadius = useMemo(
    () =>
      puffs.length === 0
        ? 0
        : Math.min(...puffs.map((puff) => puff.diameter)) * FOG_WIPE_RADIUS_RATIO,
    [puffs],
  );

  const rub = (event: GestureResponderEvent) => {
    // Page coordinates minus the container's own origin, not locationX/Y: these
    // handlers fire for touches anywhere in the subtree, including ones a button
    // underneath goes on to handle, and locationX would then be relative to that
    // button rather than to the screen.
    const x = event.nativeEvent.pageX - originRef.current.x;
    const y = event.nativeEvent.pageY - originRef.current.y;
    const last = lastPointRef.current;
    if (
      last &&
      Math.abs(last.x - x) < FOG_MIN_TRAVEL_PX &&
      Math.abs(last.y - y) < FOG_MIN_TRAVEL_PX
    ) {
      return;
    }
    lastPointRef.current = { x, y };

    const now = Date.now();

    // The even haze underneath still thins out globally with effort, so a team
    // that scrubs the whole screen gets a little more than the sum of its holes.
    // Like the puffs, it is only written to here — the animation that carries it
    // back is started once, on release.
    const elapsed = lastRubAtRef.current === 0 ? 0 : now - lastRubAtRef.current;
    lastRubAtRef.current = now;
    const decayed = Math.max(0, baseClarityRef.current - elapsed / FOG_BASE_DECAY_MS);
    const nextBase = Math.min(1, decayed + FOG_BASE_RUB_GAIN);
    baseClarityRef.current = nextBase;
    baseClarity.setValue(nextBase);

    puffs.forEach((puff, index) => {
      // The hole is measured against the puff's resting centre while the puff
      // itself drifts a few pixels off it. At this amplitude the mismatch is
      // invisible, and tracking the moving centre would mean reading a
      // native-driven value on every touch event.
      const distance = Math.hypot(puff.centreX - x, puff.centreY - y);
      if (distance >= wipeRadius) {
        return;
      }

      const level = runtime.levels[index];
      const next = fogRubbedLevel(level, distance, wipeRadius);
      if (level - next < FOG_RUB_EPSILON) {
        return;
      }

      runtime.levels[index] = next;
      // The only thing this whole hot path does. setValue renders nothing and,
      // with every regrow already stopped for the duration of the gesture, it is
      // also the only writer of this value — so it lands immediately instead of
      // racing an animation that is being restarted underneath it.
      runtime.values[index].setValue(next);
    });
  };

  /**
   * Called once when a finger lands.
   *
   * Everything in flight is stopped here and its progress folded back into plain
   * numbers, so that for as long as the finger is down there is not a single
   * animation running on any of these values. That is what makes the rub itself
   * cheap: an earlier version restarted a native animation per puff per touch
   * event — several hundred bridge messages a second on a real tablet — and the
   * result was a fog that answered the finger late, or not at all.
   */
  const beginGesture = (event: GestureResponderEvent) => {
    if (isRubbingRef.current) {
      return;
    }
    isRubbingRef.current = true;

    const now = Date.now();
    lastPointRef.current = {
      x: event.nativeEvent.pageX - originRef.current.x,
      y: event.nativeEvent.pageY - originRef.current.y,
    };
    lastRubAtRef.current = 0;

    baseDecayRef.current?.stop();
    baseDecayRef.current = null;

    for (let index = 0; index < runtime.values.length; index += 1) {
      runtime.levels[index] = currentPuffLevel(runtime, index, now);
      runtime.animations[index]?.stop();
      runtime.animations[index] = null;
      runtime.startedAt[index] = 0;
    }
  };

  /**
   * Called once when the finger lifts: this is where the fog is allowed to start
   * creeping back, and the only place any animation is started.
   */
  const release = () => {
    if (!isRubbingRef.current) {
      return;
    }
    isRubbingRef.current = false;
    lastPointRef.current = null;
    gestureStartRef.current = null;

    const now = Date.now();

    if (baseClarityRef.current > 0) {
      baseDecayRef.current = Animated.timing(baseClarity, {
        toValue: 0,
        duration: Math.max(200, baseClarityRef.current * FOG_BASE_DECAY_MS),
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      });
      baseDecayRef.current.start(({ finished }) => {
        if (finished) {
          baseClarityRef.current = 0;
        }
      });
    }

    for (let index = 0; index < runtime.values.length; index += 1) {
      const level = runtime.levels[index];
      if (level >= 1) {
        continue;
      }

      const duration = Math.max(200, FOG_REGROW_MS * (1 - level));
      runtime.from[index] = level;
      runtime.startedAt[index] = now;
      runtime.durations[index] = duration;

      const regrow = Animated.timing(runtime.values[index], {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      runtime.animations[index] = regrow;
      regrow.start(({ finished }) => {
        if (finished) {
          runtime.levels[index] = 1;
          runtime.startedAt[index] = 0;
        }
      });
    }
  };

  // Deliberately *not* the scrim tokens, which are the screen's own background
  // tone. Fog drawn in the background colour is just the screen going dim — it
  // reads as a tablet dying rather than as weather. Real mist scatters light, so
  // it is lighter than whatever is behind it, and the pale tones below are what
  // make this read as a fogged pane at a glance.
  const fogColor = isLightTheme ? FOG_COLOR_LIGHT : FOG_COLOR_DARK;

  return (
    <View
      ref={containerRef}
      testID="risk-pig-fog"
      style={{ flex: 1 }}
      // Claiming the responder when the touch *starts* is what an earlier version
      // did, and it swallowed every tap: a team could rub an answer clear and
      // then not be able to press it. Claiming on move instead leaves taps alone,
      // because a press never travels.
      //
      // It has to be the capture phase. The card sits in a ScrollView, and on the
      // bubble phase that ScrollView claims the drag first — the fog then gets a
      // touch-cancel rather than a stream of moves, which is why rubbing over the
      // card did nothing at all. Capture runs top-down, so the fog gets asked
      // before the ScrollView does.
      //
      // Only sideways drags are taken. Wiping a pane is a side-to-side motion
      // anyway, and leaving the up-and-down ones alone means the card can still
      // be scrolled while the pig is on screen — otherwise an answer below the
      // fold would be unreachable for the whole effect.
      onStartShouldSetResponderCapture={(event: GestureResponderEvent) => {
        gestureStartRef.current = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        };
        return false;
      }}
      onMoveShouldSetResponderCapture={(event: GestureResponderEvent) => {
        const start = gestureStartRef.current;
        if (!start) {
          return false;
        }
        const travelledX = Math.abs(event.nativeEvent.pageX - start.x);
        const travelledY = Math.abs(event.nativeEvent.pageY - start.y);
        return travelledX >= FOG_RUB_CLAIM_PX && travelledX >= travelledY;
      }}
      // Having won the gesture, hold it: the ScrollView asks for it back the
      // moment the drag turns vertical, and handing it over mid-rub would stall
      // the wipe halfway through a sweep.
      onResponderTerminationRequest={() => false}
      // The rub itself runs off the raw touch events, not off onResponderMove.
      // Raw touch events are delivered to this view for anything happening in its
      // subtree whether or not it holds the responder, so wiping keeps working
      // even where the claim above declines to fire — over a vertical scroll, or
      // on a platform that will not hand a native scroll back. The responder
      // claim is there for one job only: stopping the ScrollView from turning a
      // sideways rub into a scroll and cancelling the touch out from under us.
      onTouchStart={beginGesture}
      onTouchMove={rub}
      onTouchEnd={release}
      onTouchCancel={release}
      onResponderGrant={beginGesture}
      onResponderRelease={release}
      onResponderTerminate={release}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width, height });
        containerRef.current?.measureInWindow((x, y) => {
          originRef.current = { x, y };
        });
      }}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: fogColor,
          opacity: baseClarity.interpolate({
            inputRange: [0, 1],
            outputRange: [FOG_BASE_MAX_OPACITY, FOG_BASE_MIN_OPACITY],
          }),
        }}
      />
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {puffs.map((puff) => {
          const progress = Animated.modulo(
            Animated.add(Animated.multiply(drift, puff.speed), puff.phase),
            1,
          );
          return (
            <Animated.View
              key={puff.key}
              style={{
                position: "absolute",
                left: puff.centreX - puff.diameter / 2,
                top: puff.centreY - puff.diameter / 2,
                width: puff.diameter,
                height: puff.diameter,
                opacity: runtime.values[puff.key].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, FOG_PUFF_OPACITY],
                }),
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1],
                      outputRange: [0, puff.driftX, 0, -puff.driftX, 0],
                    }),
                  },
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1],
                      outputRange: [puff.driftY, 0, -puff.driftY, 0, puff.driftY],
                    }),
                  },
                ],
              }}
            >
              {/* Drawn once at mount and never again — see the docblock above.
                  Its own gradient id per puff because on react-native-web every
                  Svg lands in the same DOM document and ids there collide. */}
              <Svg width={puff.diameter} height={puff.diameter}>
                <Defs>
                  <RadialGradient id={`${gradientId}-${puff.key}`} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={fogColor} stopOpacity="1" />
                    <Stop offset="0.45" stopColor={fogColor} stopOpacity="0.92" />
                    <Stop offset="0.75" stopColor={fogColor} stopOpacity="0.45" />
                    <Stop offset="1" stopColor={fogColor} stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect
                  x={0}
                  y={0}
                  width={puff.diameter}
                  height={puff.diameter}
                  fill={`url(#${gradientId}-${puff.key})`}
                />
              </Svg>
            </Animated.View>
          );
        })}
      </View>
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

// Goes all the way to black. The "is this thing on?" reassurance comes from the
// hint below, which is a child of this overlay and so is at full brightness
// exactly when the overlay is — leaving a sliver of the screen showing as well
// only made the effect easy to read straight through.
const DARKNESS_MAX_OPACITY = 1;

function DarknessEffect({ children }: { children: ReactNode }) {
  // Starts fully revealed and only darkens once the sensor has confirmed
  // itself. Blacking the screen out during "checking" would flash on every
  // device, including the ones that turn out to have no light sensor at all.
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [status, setStatus] = useState<"checking" | "ready" | "unavailable">(
    "checking",
  );

  useEffect(() => {
    const lightSensor = loadLightSensor();
    if (!lightSensor) {
      setStatus("unavailable");
      return;
    }

    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    // Kept in a closure rather than state: a reading arrives several times a
    // second and none of them should cost a render — the only thing that has to
    // change on screen is the driven Animated value.
    let smoothed: number | null = null;

    // The module can be present while the hardware is not, and on iOS there is
    // no ambient light sensor at all.
    void lightSensor
      .isAvailableAsync()
      .then((isAvailable) => {
        if (cancelled) {
          return;
        }
        if (!isAvailable) {
          setStatus("unavailable");
          return;
        }

        lightSensor.setUpdateInterval(200);
        subscription = lightSensor.addListener(({ illuminance }) => {
          if (cancelled) {
            return;
          }

          smoothed = smoothIlluminance(smoothed, illuminance);
          Animated.timing(overlayOpacity, {
            toValue: (1 - darknessRevealAmount(smoothed)) * DARKNESS_MAX_OPACITY,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
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
  }, [overlayOpacity]);

  // No light sensor on this device or build — every iOS tablet included. Fall
  // back to the flashlight, the same "you cannot just read it" nuisance without
  // needing one, exactly as OVERHEAD does.
  if (status === "unavailable") {
    return <FlashlightEffect>{children}</FlashlightEffect>;
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Animated.View
        testID="risk-pig-darkness-overlay"
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#000",
          opacity: overlayOpacity,
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
          Schowajcie tablet przed światłem — im ciemniej, tym więcej widać
        </Text>
      </Animated.View>
    </View>
  );
}

// Slow on purpose. The point is that the button has wandered off since you last
// looked at it, not that the screen is vibrating — SHAKE already does twitchy.
const SLIDE_PERIOD_MS = 2100;
const SLIDE_RANGE_PX = 42;

function SlideEffect({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReduceMotion();
  const drift = useRef(new Animated.Value(0)).current;

  // Reduce motion softens this rather than switching it off. Killing the drift
  // outright would leave the pig doing literally nothing, which is the one
  // outcome every effect in this file is written to avoid — so the travel is
  // halved and slowed instead.
  const range = prefersReducedMotion ? SLIDE_RANGE_PX / 2 : SLIDE_RANGE_PX;
  const period = prefersReducedMotion ? SLIDE_PERIOD_MS * 2 : SLIDE_PERIOD_MS;

  useEffect(() => {
    const leg = (toValue: number) =>
      Animated.timing(drift, {
        toValue,
        duration: period,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });

    const loop = Animated.loop(Animated.sequence([leg(1), leg(-1)]));
    loop.start();
    return () => loop.stop();
  }, [drift, period]);

  return (
    <Animated.View
      testID="risk-pig-slide-layer"
      style={{
        flex: 1,
        transform: [
          {
            translateX: drift.interpolate({
              inputRange: [-1, 1],
              outputRange: [-range, range],
            }),
          },
          // Vertical travel runs at twice the horizontal rate and half the size,
          // so the screen wanders instead of sliding along one diagonal a team
          // would have read and compensated for inside five seconds.
          {
            translateY: drift.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [range / 2, -range / 2, range / 2],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
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
  // Same dimmed border as the chat dock, not the accent: at full accent and
  // three pixels the tile shouted next to every other panel on the screen.
  const panelBorderWidth = adaptiveLayout.s(isTabletLayout ? 2 : 1, 1, 2);
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
        borderColor={EXPEDITION_THEME.border}
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
