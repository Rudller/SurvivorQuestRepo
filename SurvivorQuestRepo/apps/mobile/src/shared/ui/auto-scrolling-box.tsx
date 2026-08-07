import { useEffect, useRef, type ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";

const AUTO_SCROLL_SPEED_PX_PER_SEC = 25;
const AUTO_SCROLL_IDLE_DELAY_MS = 5000;

type AutoScrollingBoxProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
};

// Idle 5s -> auto-scroll down to the end -> idle 5s -> smooth scroll back to
// the top -> repeat. No-ops entirely when content already fits (maxScrollY
// stays 0). User touch/drag pauses the cycle and restarts the idle timer.
// Originally built for the onboarding intro text (apps/mobile/src/core/mobile-app.tsx);
// extracted here so any other long, possibly-overflowing text (e.g. a
// station's description) can reuse the exact same behavior.
export function AutoScrollingBox({
  children,
  className,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: AutoScrollingBoxProps) {
  const scrollRef = useRef<ScrollView>(null);
  const currentYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const visibleHeightRef = useRef(0);
  const maxScrollYRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const clearAutoScrollTimers = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const scheduleIdle = (callback: () => void) => {
    idleTimerRef.current = setTimeout(callback, AUTO_SCROLL_IDLE_DELAY_MS);
  };

  const startDownScroll = () => {
    if (maxScrollYRef.current <= 0) {
      return;
    }

    let lastTimestamp: number | null = null;

    const tick = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const deltaSeconds = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      currentYRef.current = Math.min(
        maxScrollYRef.current,
        currentYRef.current + AUTO_SCROLL_SPEED_PX_PER_SEC * deltaSeconds,
      );
      scrollRef.current?.scrollTo({ y: currentYRef.current, animated: false });

      if (currentYRef.current < maxScrollYRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      scheduleIdle(scrollToTopSmooth);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  function scrollToTopSmooth() {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    currentYRef.current = 0;
    scheduleIdle(startDownScroll);
  }

  const resetIdleCycle = () => {
    clearAutoScrollTimers();
    if (maxScrollYRef.current > 0) {
      scheduleIdle(startDownScroll);
    }
  };

  const recomputeMaxScroll = () => {
    maxScrollYRef.current = Math.max(0, contentHeightRef.current - visibleHeightRef.current);
    resetIdleCycle();
  };

  useEffect(() => {
    return () => {
      clearAutoScrollTimers();
    };
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      className={className}
      contentContainerStyle={contentContainerStyle}
      style={[{ flexShrink: 1 }, style]}
      scrollEventThrottle={16}
      onScroll={(event) => {
        currentYRef.current = event.nativeEvent.contentOffset.y;
      }}
      onScrollBeginDrag={resetIdleCycle}
      onTouchStart={resetIdleCycle}
      onContentSizeChange={(_width, height) => {
        contentHeightRef.current = height;
        recomputeMaxScroll();
      }}
      onLayout={(event) => {
        visibleHeightRef.current = event.nativeEvent.layout.height;
        recomputeMaxScroll();
      }}
    >
      {children}
    </ScrollView>
  );
}
