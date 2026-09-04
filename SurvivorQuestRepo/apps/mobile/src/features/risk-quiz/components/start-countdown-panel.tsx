import { useEffect, useRef } from "react";
import { Animated, Easing, Vibration, View } from "react-native";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { StartCountdownState } from "../../onboarding/model/start-countdown";
import { useReduceMotion } from "../../../shared/a11y/use-reduce-motion";

const TICK_ASSET: number = require("../assets/countdown-sfx/tick.wav");
const START_ASSET: number = require("../assets/countdown-sfx/start.wav");

// Android honours the duration and gives a crisp tap; iOS ignores it and fires
// its one fixed buzz, which is why these stay short. Using RN's Vibration
// rather than expo-haptics keeps this free of a new native module — worth
// revisiting if the app ever picks up expo-haptics for other reasons, since
// Haptics.impactAsync("light") is a much better tick on iOS.
const TICK_VIBRATION_MS = 18;
const GO_VIBRATION_PATTERN = [0, 45, 60, 90];

const NUMBER_POP_MS = 260;

function removePlayer(player: AudioPlayer) {
  try {
    player.pause();
  } catch {
    // noop
  }
  try {
    player.remove();
  } catch {
    // noop
  }
}

/**
 * The beat of the pre-game countdown: one number at a time, then START.
 *
 * Every beat lands three ways at once — seen, heard, felt — because the tablet
 * is usually flat on a table with a team standing around it, and whoever is not
 * looking straight at it still needs to know the game is about to open.
 */
export function StartCountdownPanel({
  state,
  numberFontSize,
  labelFontSize,
  goLabel,
}: {
  state: StartCountdownState;
  numberFontSize: number;
  labelFontSize: number;
  goLabel: string;
}) {
  const isReduceMotionEnabled = useReduceMotion();
  const pop = useRef(new Animated.Value(1)).current;
  // Both players live in one ref object rather than two refs: its identity is
  // stable, so the unmount cleanup below can close over it without reading
  // `.current` at teardown time.
  const playersRef = useRef<{ tick: AudioPlayer | null; go: AudioPlayer | null }>({
    tick: null,
    go: null,
  });
  const audioModeReadyRef = useRef<Promise<void> | null>(null);

  // "done" draws START too, not just "go". The switch to the game screen happens
  // in an effect, which React runs *after* it has painted the render that first
  // saw "done" — so that frame is painted with this panel still mounted, and
  // reading secondsLeft there put a bare 0 on screen between START and the game.
  // The panel is only ever mounted for a countdown that actually has time on it,
  // so a zero here can only mean the count is over.
  const isGo = state.phase !== "counting";
  // The beat this component reacts to. Folding START into the same key means
  // one effect drives every beat, so the last one can never double-fire with
  // the "1" it replaces.
  const beat = isGo ? "go" : String(state.secondsLeft);

  useEffect(() => {
    let isCancelled = false;

    const ensureAudioMode = () => {
      if (!audioModeReadyRef.current) {
        audioModeReadyRef.current = setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          interruptionMode: "duckOthers",
          shouldRouteThroughEarpiece: false,
          shouldPlayInBackground: false,
        })
          .then(() => undefined)
          .catch(() => undefined);
      }
      return audioModeReadyRef.current;
    };

    const play = async (kind: "tick" | "go", assetId: number) => {
      await ensureAudioMode();
      if (isCancelled) return;

      try {
        const players = playersRef.current;
        if (!players[kind]) {
          players[kind] = createAudioPlayer(assetId, { updateInterval: 250 });
        }
        const player = players[kind];
        if (!player) return;
        player.volume = 1;
        player.seekTo(0);
        player.play();
      } catch {
        // A countdown that can't make a sound still has to count.
      }
    };

    try {
      Vibration.vibrate(isGo ? GO_VIBRATION_PATTERN : TICK_VIBRATION_MS);
    } catch {
      // Same: never let feedback take the screen down.
    }

    void play(isGo ? "go" : "tick", isGo ? START_ASSET : TICK_ASSET);

    if (!isReduceMotionEnabled) {
      pop.setValue(isGo ? 1.35 : 1.22);
      Animated.timing(pop, {
        toValue: 1,
        duration: NUMBER_POP_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }

    return () => {
      isCancelled = true;
    };
  }, [beat, isGo, isReduceMotionEnabled, pop]);

  useEffect(() => {
    const players = playersRef.current;

    return () => {
      Vibration.cancel();
      if (players.tick) removePlayer(players.tick);
      if (players.go) removePlayer(players.go);
    };
  }, []);

  return (
    <View
      className="flex-1 items-center justify-center"
      accessibilityRole="timer"
      accessibilityLabel={isGo ? goLabel : String(state.secondsLeft)}
      accessibilityLiveRegion="polite"
    >
      <Animated.Text
        style={{
          color: EXPEDITION_THEME.accentStrong,
          fontSize: isGo ? labelFontSize : numberFontSize,
          fontWeight: "800",
          letterSpacing: isGo ? labelFontSize * 0.16 : 0,
          // Digits are drawn on a fixed advance width in most faces, but the
          // line box still shifts between "10" and "9"; a fixed line height
          // keeps the number from jumping as it narrows.
          lineHeight: numberFontSize * 1.1,
          textAlign: "center",
          transform: [{ scale: pop }],
        }}
      >
        {isGo ? goLabel : state.secondsLeft}
      </Animated.Text>
    </View>
  );
}
