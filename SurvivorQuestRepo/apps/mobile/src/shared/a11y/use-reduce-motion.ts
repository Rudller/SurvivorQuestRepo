import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Whether the device asks for reduced motion ("Ogranicz ruch" on iOS,
 * "Usuń animacje" on Android). Ambient animations should hold still when this
 * is true — the vestibular disorders the setting exists for are triggered by
 * exactly the kind of looping drift this app uses for atmosphere.
 *
 * Starts false and flips once the platform answers: the setting is off for
 * almost everyone, so assuming it is on would make every screen briefly render
 * its stilled variant and then start moving, which is worse for both groups.
 */
export function useReduceMotion() {
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Guarded: react-native-web has shipped without this method, and a missing
    // accessibility query must not take a screen down with it.
    void Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
      .then((enabled) => {
        if (isMounted) setIsReduceMotionEnabled(Boolean(enabled));
      })
      .catch(() => {
        // Treat an unanswerable query as "no preference expressed".
      });

    const subscription = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      (enabled) => setIsReduceMotionEnabled(Boolean(enabled)),
    );

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  return isReduceMotionEnabled;
}
