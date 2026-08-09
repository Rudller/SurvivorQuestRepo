import { useEffect, useRef, useState } from "react";

const COUNT_UP_STEP_INTERVAL_MS = 25;

/**
 * Animates a displayed integer toward `targetValue` by nudging it ±1 per
 * tick, instead of jumping straight to the new value. Skips the animation
 * on first mount (only subsequent changes animate).
 */
export function useCountUpValue(targetValue: number) {
  const [displayedValue, setDisplayedValue] = useState(targetValue);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      setDisplayedValue(targetValue);
      return;
    }

    const intervalId = setInterval(() => {
      setDisplayedValue((current) => {
        if (current === targetValue) {
          clearInterval(intervalId);
          return current;
        }
        return current + (targetValue > current ? 1 : -1);
      });
    }, COUNT_UP_STEP_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [targetValue]);

  return displayedValue;
}
