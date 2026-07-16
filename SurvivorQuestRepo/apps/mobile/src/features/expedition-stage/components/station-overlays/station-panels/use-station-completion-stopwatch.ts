import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

import type { StationTestViewModel } from "../types";

type UseStationCompletionStopwatchArgs = {
  station: StationTestViewModel | null;
  isOverlayMounted: boolean;
  nowMs: number;
  setNowMs: Dispatch<SetStateAction<number>>;
};

export function useStationCompletionStopwatch({
  station,
  isOverlayMounted,
  nowMs,
  setNowMs,
}: UseStationCompletionStopwatchArgs) {
  const isEligible = Boolean(
    station?.completionStopwatchEnabled &&
      station.timeLimitSeconds <= 0 &&
      station.startedAt &&
      station.status !== "done" &&
      station.status !== "failed",
  );
  const stationStartedAt = station?.startedAt ?? null;

  useEffect(() => {
    if (!isOverlayMounted || !isEligible || !stationStartedAt) {
      return;
    }

    const startedMs = new Date(stationStartedAt).getTime();
    if (!Number.isFinite(startedMs)) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const nextNow = Date.now();
      const nextElapsedSeconds = Math.floor((nextNow - startedMs) / 1000);

      setNowMs((currentNow) =>
        Math.floor((currentNow - startedMs) / 1000) === nextElapsedSeconds ? currentNow : nextNow,
      );

      const msUntilNextSecond = 1000 - ((nextNow - startedMs) % 1000 || 1000) + 16;
      timeout = setTimeout(tick, msUntilNextSecond);
    };

    tick();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isEligible, isOverlayMounted, setNowMs, stationStartedAt]);

  const elapsedTimeSeconds = (() => {
    if (!isEligible || !stationStartedAt) {
      return null;
    }

    const startedMs = new Date(stationStartedAt).getTime();
    if (!Number.isFinite(startedMs)) {
      return null;
    }

    return Math.max(0, Math.floor((nowMs - startedMs) / 1000));
  })();

  return { elapsedTimeSeconds };
}
