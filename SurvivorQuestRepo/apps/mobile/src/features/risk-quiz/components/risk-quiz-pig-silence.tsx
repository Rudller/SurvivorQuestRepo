import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Text, View } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";

import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { silenceRevealAmount, smoothLoudness } from "./risk-quiz-pig-silence-math";

// This module is deliberately NOT imported from risk-quiz-pig-effects.tsx.
// expo-audio throws on import under jest-expo, so the effect layer requires this
// file lazily, only once a SILENCE pig has actually landed — the same defensive
// trick the sensor pigs use, applied to a module rather than a sensor.

// LOW_QUALITY because nothing ever listens to the result: the recording exists
// only so the meter has a live signal to report, and a smaller file is a smaller
// thing to leave behind in the cache.
const SILENCE_RECORDING_OPTIONS = {
  ...RecordingPresets.LOW_QUALITY,
  isMeteringEnabled: true,
};

// Five reads a second — the cadence the light sensor runs at, fast enough that
// hushing the table feels immediate.
const SILENCE_POLL_MS = 200;
const SILENCE_MAX_OPACITY = 1;

type SilenceEffectProps = {
  children: ReactNode;
  /**
   * Rendered instead when there is no microphone or the team refuses it. The
   * caller supplies it so this module never has to import the effect layer back,
   * which would close a require cycle.
   */
  fallback: ReactNode;
};

export function SilenceEffect({ children, fallback }: SilenceEffectProps) {
  // Starts revealed and only darkens once the microphone is actually running.
  // Blacking the screen out first would punish a team on a tablet that turns out
  // to have no recording permission at all.
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [status, setStatus] = useState<"checking" | "ready" | "unavailable">(
    "checking",
  );
  const recorder = useAudioRecorder(SILENCE_RECORDING_OPTIONS);

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    // Kept in the closure rather than state: at five reads a second, routing
    // this through React would re-render the whole game screen underneath.
    let smoothed: number | null = null;

    void (async () => {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (cancelled) {
          return;
        }
        if (!granted) {
          setStatus("unavailable");
          return;
        }

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          interruptionMode: "duckOthers",
          shouldRouteThroughEarpiece: false,
          shouldPlayInBackground: false,
        });
        if (cancelled) {
          return;
        }

        recorder.record();
        setStatus("ready");

        poll = setInterval(() => {
          // getStatus is synchronous, so a reading costs nothing but a number.
          const { metering } = recorder.getStatus();
          smoothed = smoothLoudness(smoothed, metering ?? Number.NaN);

          Animated.timing(overlayOpacity, {
            toValue: (1 - silenceRevealAmount(smoothed)) * SILENCE_MAX_OPACITY,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
        }, SILENCE_POLL_MS);
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (poll) {
        clearInterval(poll);
      }
      // The microphone has to be released the moment the pig expires, and the
      // audio session put back the way the rest of the app expects it — the
      // simon tones and the countdown all run through the same session.
      try {
        void recorder.stop().catch(() => undefined);
      } catch {
        // already stopped, or never started
      }
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, [recorder, overlayOpacity]);

  if (status === "unavailable") {
    return <>{fallback}</>;
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Animated.View
        testID="risk-pig-silence-overlay"
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
          Ciszej — im głośniej, tym mniej widać
        </Text>
      </Animated.View>
    </View>
  );
}
