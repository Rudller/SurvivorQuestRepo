import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

const TABLET_MIN_SHORT_EDGE = 700;
const TABLET_MIN_WIDTH = 900;
const WIDE_LAYOUT_MIN_WIDTH = 768;
const BASE_SHORT_EDGE = 390;
const MIN_SCALE = 0.92;
const MAX_SCALE = 1.3;
const MIN_TOUCH_TARGET = 44;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function scaleValue(value: number, factor: number, min?: number, max?: number) {
  const scaled = round(value * factor);
  if (typeof min === "number" && typeof max === "number") {
    return clamp(scaled, min, max);
  }

  if (typeof min === "number") {
    return Math.max(min, scaled);
  }

  if (typeof max === "number") {
    return Math.min(max, scaled);
  }

  return scaled;
}

export function useAdaptiveLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const shortEdge = Math.min(width, height);
    const isTablet = width >= TABLET_MIN_WIDTH || shortEdge >= TABLET_MIN_SHORT_EDGE;
    const isWideLayout = width >= WIDE_LAYOUT_MIN_WIDTH;
    const baseScale = clamp(shortEdge / BASE_SHORT_EDGE, MIN_SCALE, MAX_SCALE);
    const scale = isTablet ? clamp(baseScale * 1.04, MIN_SCALE, MAX_SCALE) : baseScale;
    const fontScale = clamp(scale * (isTablet ? 1.02 : 1), MIN_SCALE, MAX_SCALE);

    return {
      width,
      height,
      shortEdge,
      isTablet,
      isWideLayout,
      scale,
      fontScale,
      s: (value: number, min?: number, max?: number) => scaleValue(value, scale, min, max),
      fs: (value: number, min?: number, max?: number) => scaleValue(value, fontScale, min, max),
      hit: (value = MIN_TOUCH_TARGET) => Math.max(MIN_TOUCH_TARGET, scaleValue(value, scale)),
    };
  }, [height, width]);
}
