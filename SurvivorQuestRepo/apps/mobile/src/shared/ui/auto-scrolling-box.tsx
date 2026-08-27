import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { EXPEDITION_THEME } from "../../features/onboarding/model/constants";
import { useReduceMotion } from "../a11y/use-reduce-motion";

const SCROLL_THUMB_WIDTH = 3;
const SCROLL_THUMB_MIN_HEIGHT = 24;
const SCROLL_THUMB_RIGHT_OFFSET = 2;

const BOTTOM_FADE_HEIGHT = 28;
const BOTTOM_FADE_BAND_OPACITIES = [0.08, 0.22, 0.4, 0.62, 0.86] as const;
// How close to the bottom (px) counts as "there" — avoids the fade flickering
// on/off from sub-pixel scroll position noise right at the end.
const BOTTOM_FADE_EPSILON_PX = 2;

const AUTO_SCROLL_SPEED_PX_PER_SEC = 25;
const AUTO_SCROLL_IDLE_DELAY_MS = 5000;
// Caps how far a single frame is allowed to advance the scroll position. The
// JS thread is often busy right when a station opens (image loads, the card's
// slide-in animation, several hooks initializing), which can delay a
// requestAnimationFrame callback well past one frame. Without this cap, that
// delay shows up as a big jump in scroll position on the next tick instead of
// a slow crawl — this clamps the effective time delta so a stalled frame just
// takes a normal-sized step instead of a lurch.
const AUTO_SCROLL_MAX_FRAME_DELTA_SECONDS = 1 / 20;

type AutoScrollingBoxProps = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
  // Set false to keep this a plain, manually-scrollable box with no idle-timer-driven
  // auto-scroll cycle — e.g. when it sits next to an input the user is actively using,
  // where content silently scrolling itself is disorienting rather than helpful, or
  // when the JS-thread-timing-dependent crawl animation itself proved too unreliable
  // (see showsBottomFadeWhenScrollable for the static alternative).
  autoScrollEnabled?: boolean;
  // Static "there's more below" cue: a bottom-edge fade shown whenever the box is
  // scrollable and not already scrolled to the end, in lieu of (or alongside)
  // auto-scroll. Requires bottomFadeColor (an opaque color matching whatever this
  // box sits on) since there's no gradient-image dependency here — it's faked with
  // a few stacked, increasingly-opaque bands of that color.
  showsBottomFadeWhenScrollable?: boolean;
  bottomFadeColor?: string;
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
  autoScrollEnabled = true,
  showsBottomFadeWhenScrollable = false,
  bottomFadeColor,
}: AutoScrollingBoxProps) {
  const scrollRef = useRef<ScrollView>(null);
  const currentYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const visibleHeightRef = useRef(0);
  const maxScrollYRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const scrollYAnimation = useRef(new Animated.Value(0)).current;
  const [isScrollableBelow, setIsScrollableBelow] = useState(false);
  // Mirrors contentHeightRef/visibleHeightRef into state — only these two
  // drive the thumb's size/track, so re-rendering on every scroll tick isn't
  // needed (the thumb's position is native-driven via scrollYAnimation).
  const [scrollThumbMetrics, setScrollThumbMetrics] = useState({ contentHeight: 0, visibleHeight: 0 });
  // A box that scrolls itself is the most literal kind of unrequested motion
  // there is, so the crawl is off entirely when the device asks for less of it.
  // The box stays scrollable by hand, and the thumb below still shows there is
  // more text than fits — the cue survives, only the automatic drift goes.
  const isReduceMotionEnabled = useReduceMotion();
  const isAutoScrollActive = autoScrollEnabled && !isReduceMotionEnabled;

  const updateIsScrollableBelow = () => {
    if (!showsBottomFadeWhenScrollable) {
      return;
    }
    const next =
      maxScrollYRef.current > 0 &&
      currentYRef.current < maxScrollYRef.current - BOTTOM_FADE_EPSILON_PX;
    setIsScrollableBelow((current) => (current === next ? current : next));
  };

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
      const deltaSeconds = Math.min(
        AUTO_SCROLL_MAX_FRAME_DELTA_SECONDS,
        (timestamp - lastTimestamp) / 1000,
      );
      lastTimestamp = timestamp;
      currentYRef.current = Math.min(
        maxScrollYRef.current,
        currentYRef.current + AUTO_SCROLL_SPEED_PX_PER_SEC * deltaSeconds,
      );
      scrollRef.current?.scrollTo({ y: currentYRef.current, animated: false });
      updateIsScrollableBelow();

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
    updateIsScrollableBelow();
    scheduleIdle(startDownScroll);
  }

  const resetIdleCycle = () => {
    clearAutoScrollTimers();
    if (isAutoScrollActive && maxScrollYRef.current > 0) {
      scheduleIdle(startDownScroll);
    }
  };

  const recomputeMaxScroll = () => {
    const nextMaxScrollY = Math.max(0, contentHeightRef.current - visibleHeightRef.current);
    const scrollRangeChanged = nextMaxScrollY !== maxScrollYRef.current;
    maxScrollYRef.current = nextMaxScrollY;
    setScrollThumbMetrics((current) =>
      current.contentHeight === contentHeightRef.current && current.visibleHeight === visibleHeightRef.current
        ? current
        : { contentHeight: contentHeightRef.current, visibleHeight: visibleHeightRef.current },
    );
    // Keep the tracked position valid if the scrollable range just shrank —
    // otherwise the next tick's target (clamped to the new max) would land
    // somewhere unrelated to the visually current position, i.e. a jump.
    currentYRef.current = Math.min(currentYRef.current, nextMaxScrollY);
    updateIsScrollableBelow();

    // Only touch the running cycle when the scrollable range actually changed.
    // onLayout/onContentSizeChange can fire repeatedly for reasons unrelated to
    // this box's own size (e.g. a sibling countdown timer re-rendering once a
    // second) — resetting on every one of those cancelled and restarted an
    // in-flight auto-scroll animation, which is what made it look like it kept
    // jumping and briefly refused to respond to touch.
    if (scrollRangeChanged) {
      resetIdleCycle();
    }
  };

  useEffect(() => {
    return () => {
      clearAutoScrollTimers();
    };
  }, []);

  // Someone can turn the setting on while a crawl is already running — stop it
  // where it stands rather than letting the current pass finish.
  useEffect(() => {
    if (isReduceMotionEnabled) {
      clearAutoScrollTimers();
    }
  }, [isReduceMotionEnabled]);

  const { contentHeight: thumbContentHeight, visibleHeight: thumbVisibleHeight } = scrollThumbMetrics;
  const thumbMaxScrollY = Math.max(0, thumbContentHeight - thumbVisibleHeight);
  const isThumbVisible = thumbMaxScrollY > 0 && thumbVisibleHeight > 0;
  const thumbHeight = isThumbVisible
    ? Math.min(thumbVisibleHeight, Math.max(SCROLL_THUMB_MIN_HEIGHT, (thumbVisibleHeight * thumbVisibleHeight) / thumbContentHeight))
    : 0;
  const thumbTrackTravel = Math.max(0, thumbVisibleHeight - thumbHeight);
  const thumbTranslateY = scrollYAnimation.interpolate({
    inputRange: [0, Math.max(1, thumbMaxScrollY)],
    outputRange: [0, thumbTrackTravel],
    extrapolate: "clamp",
  });

  return (
    <View className={className} style={[{ flexShrink: 1, flexGrow: 0, overflow: "hidden" }, style]}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentContainerStyle={contentContainerStyle}
        style={{ flexShrink: 1, flexGrow: 0 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollYAnimation } } }],
          {
            useNativeDriver: true,
            listener: (event: { nativeEvent: { contentOffset: { y: number } } }) => {
              currentYRef.current = event.nativeEvent.contentOffset.y;
              updateIsScrollableBelow();
            },
          },
        )}
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
      </Animated.ScrollView>
      {isThumbVisible ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: SCROLL_THUMB_RIGHT_OFFSET,
            width: SCROLL_THUMB_WIDTH,
            height: thumbVisibleHeight,
          }}
        >
          <Animated.View
            style={{
              width: SCROLL_THUMB_WIDTH,
              height: thumbHeight,
              borderRadius: SCROLL_THUMB_WIDTH / 2,
              backgroundColor: EXPEDITION_THEME.accent,
              opacity: 0.55,
              transform: [{ translateY: thumbTranslateY }],
            }}
          />
        </View>
      ) : null}
      {showsBottomFadeWhenScrollable && isScrollableBelow && bottomFadeColor ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: BOTTOM_FADE_HEIGHT,
          }}
        >
          {BOTTOM_FADE_BAND_OPACITIES.map((opacity, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                backgroundColor: bottomFadeColor,
                opacity,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
