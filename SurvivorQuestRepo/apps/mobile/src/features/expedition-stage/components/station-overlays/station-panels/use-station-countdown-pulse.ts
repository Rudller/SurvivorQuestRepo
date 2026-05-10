import { useEffect } from "react";
import { Animated } from "react-native";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { clamp01 } from "../puzzle-helpers";
import type { StationTestViewModel } from "../types";

type UseStationCountdownPulseArgs = {
  station: StationTestViewModel | null;
  isOverlayMounted: boolean;
  nowMs: number;
  setNowMs: Dispatch<SetStateAction<number>>;
  timerPulseAnimation: Animated.Value;
  timerPulseLoopRef: MutableRefObject<Animated.CompositeAnimation | null>;
};

export function useStationCountdownPulse({
  station,
  isOverlayMounted,
  nowMs,
  setNowMs,
  timerPulseAnimation,
  timerPulseLoopRef,
}: UseStationCountdownPulseArgs) {
  useEffect(() => {
    if (
      !station ||
      !station.startedAt ||
      station.timeLimitSeconds <= 0 ||
      station.status === "done" ||
      station.status === "failed"
    ) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const nextNow = Date.now();
      setNowMs(nextNow);
      const msToNextSecond = 1000 - (nextNow % 1000);
      timeout = setTimeout(tick, Math.max(40, msToNextSecond + 12));
    };

    tick();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [setNowMs, station]);

  const remainingTimeSeconds = (() => {
    if (!station || !station.startedAt || station.timeLimitSeconds <= 0) {
      return null;
    }

    const startedMs = new Date(station.startedAt).getTime();
    if (!Number.isFinite(startedMs)) {
      return null;
    }

    const endsAtMs = startedMs + station.timeLimitSeconds * 1000;
    const remainingMs = Math.max(0, endsAtMs - nowMs);
    return Math.max(0, Math.ceil(remainingMs / 1000));
  })();

  const finalTenSecondsProgress =
    remainingTimeSeconds !== null && remainingTimeSeconds <= 10
      ? clamp01((10 - remainingTimeSeconds) / 10)
      : 0;
  const isUrgentPulse = remainingTimeSeconds !== null && remainingTimeSeconds <= 10;
  const hasCountdownForPulse = Boolean(
    station?.startedAt &&
      station.timeLimitSeconds > 0 &&
      station.status !== "done" &&
      station.status !== "failed",
  );
  const hasTimerStartedForPulse = Boolean(station?.startedAt);
  const stationStatusForPulse = station?.status;

  useEffect(() => {
    timerPulseLoopRef.current?.stop();
    timerPulseAnimation.setValue(0);

    if (
      !isOverlayMounted ||
      !hasCountdownForPulse ||
      !hasTimerStartedForPulse ||
      stationStatusForPulse === "done" ||
      stationStatusForPulse === "failed" ||
      remainingTimeSeconds === null
    ) {
      return;
    }

    const pulseDuration = isUrgentPulse ? 220 : 620;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulseAnimation, {
          toValue: 1,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
        Animated.timing(timerPulseAnimation, {
          toValue: 0,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
      ]),
    );

    timerPulseLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [
    hasCountdownForPulse,
    hasTimerStartedForPulse,
    isOverlayMounted,
    isUrgentPulse,
    remainingTimeSeconds,
    stationStatusForPulse,
    timerPulseAnimation,
    timerPulseLoopRef,
  ]);

  return {
    remainingTimeSeconds,
    finalTenSecondsProgress,
  };
}
