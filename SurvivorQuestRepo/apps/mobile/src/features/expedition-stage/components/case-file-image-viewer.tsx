import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";

import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { MOBILE_UX_TOKENS } from "../../../shared/ui/ux-tokens";
import { textRole } from "../../../shared/ui/typography";
import { clampPan, clampZoom, DOUBLE_TAP_ZOOM, fitContain, MIN_ZOOM } from "./case-file-image-zoom.model";

/**
 * Zdjęcie z akt na pełnym ekranie: szczypanie powiększa, jednym palcem przesuwa
 * się powiększony kadr, podwójne dotknięcie przełącza między 1× a przybliżeniem.
 *
 * Na samym PanResponderze i core Animated — gesture-handlera nie ma w paczce,
 * a reanimated jest w tej aplikacji nieużywalne (brak pluginu babel).
 */

const DOUBLE_TAP_MS = 280;
const TAP_SLOP = 10;

type Point = { x: number; y: number };

function touchDistance(event: GestureResponderEvent) {
  const [a, b] = event.nativeEvent.touches;
  if (!a || !b) {
    return 0;
  }
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

export function CaseFileImageViewer({
  url,
  visible,
  closeLabel,
  onRequestClose,
}: {
  url: string;
  visible: boolean;
  closeLabel: string;
  onRequestClose: () => void;
}) {
  const { width, height } = useWindowDimensions();

  // useRef(new Animated.Value) zamiast useAnimatedValue — tego drugiego nie ma
  // w react-native-web, którego używamy do podglądu w przeglądarce.
  const scaleValue = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Stan gestu trzymamy w refach: PanResponder tworzymy raz, a on musi widzieć
  // bieżące wartości, nie te z pierwszego renderu.
  const scale = useRef(1);
  const pan = useRef<Point>({ x: 0, y: 0 });
  // Punkt odniesienia gestu. Odświeżamy go przy każdej zmianie liczby palców,
  // żeby przejście szczypanie → przesuwanie (lub odwrotnie) nie szarpało kadrem.
  const baseline = useRef({
    scale: 1,
    pan: { x: 0, y: 0 },
    distance: 0,
    dx: 0,
    dy: 0,
    touches: 0,
  });
  const wasPinch = useRef(false);
  const lastTapAt = useRef(0);
  const viewport = useRef({ width, height });
  viewport.current = { width, height };
  // Naturalny rozmiar zdjęcia (z onLoad) — granice przesuwania liczymy od
  // faktycznie wyświetlanego kadru, nie od okna, bo poziome zdjęcie zajmuje
  // tylko pas przez środek pionowego tabletu.
  const imageSize = useRef<{ width: number; height: number } | null>(null);

  function clampToImage(nextPan: Point, nextScale: number) {
    return clampPan(nextPan, nextScale, fitContain(imageSize.current, viewport.current), viewport.current);
  }

  function apply(nextScale: number, nextPan: Point, animated: boolean) {
    scale.current = nextScale;
    pan.current = nextPan;
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: nextScale,
          useNativeDriver: true,
          bounciness: 0,
        }),
        Animated.spring(translateX, {
          toValue: nextPan.x,
          useNativeDriver: true,
          bounciness: 0,
        }),
        Animated.spring(translateY, {
          toValue: nextPan.y,
          useNativeDriver: true,
          bounciness: 0,
        }),
      ]).start();
      return;
    }
    scaleValue.setValue(nextScale);
    translateX.setValue(nextPan.x);
    translateY.setValue(nextPan.y);
  }

  // Każde otwarcie zaczyna od całego zdjęcia.
  useEffect(() => {
    if (visible) {
      apply(1, { x: 0, y: 0 }, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, url]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          wasPinch.current = false;
          baseline.current = {
            scale: scale.current,
            pan: pan.current,
            distance: touchDistance(event),
            dx: 0,
            dy: 0,
            touches: event.nativeEvent.touches.length,
          };
        },
        onPanResponderMove: (event, gesture) => {
          const touches = event.nativeEvent.touches.length;

          if (touches !== baseline.current.touches) {
            baseline.current = {
              scale: scale.current,
              pan: pan.current,
              distance: touchDistance(event),
              dx: gesture.dx,
              dy: gesture.dy,
              touches,
            };
            return;
          }

          if (touches >= 2) {
            wasPinch.current = true;
            if (baseline.current.distance === 0) {
              return;
            }
            const nextScale = clampZoom((baseline.current.scale * touchDistance(event)) / baseline.current.distance);
            apply(nextScale, clampToImage(pan.current, nextScale), false);
            return;
          }

          if (scale.current <= MIN_ZOOM) {
            return;
          }
          const nextPan = {
            x: baseline.current.pan.x + gesture.dx - baseline.current.dx,
            y: baseline.current.pan.y + gesture.dy - baseline.current.dy,
          };
          apply(scale.current, clampToImage(nextPan, scale.current), false);
        },
        onPanResponderRelease: (_event, gesture) => {
          const wasTap = Math.abs(gesture.dx) < TAP_SLOP && Math.abs(gesture.dy) < TAP_SLOP;
          if (!wasTap || wasPinch.current) {
            lastTapAt.current = 0;
            return;
          }
          const now = Date.now();
          if (now - lastTapAt.current < DOUBLE_TAP_MS) {
            lastTapAt.current = 0;
            const zoomIn = scale.current < (MIN_ZOOM + DOUBLE_TAP_ZOOM) / 2;
            apply(zoomIn ? DOUBLE_TAP_ZOOM : MIN_ZOOM, { x: 0, y: 0 }, true);
            return;
          }
          lastTapAt.current = now;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose} statusBarTranslucent>
      <View testID="case-file-image-viewer" style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.94)" }}>
        <View style={{ flex: 1, overflow: "hidden" }} {...responder.panHandlers}>
          <Animated.Image
            source={{ uri: url }}
            resizeMode="contain"
            onLoad={(event) => {
              const { width: naturalWidth, height: naturalHeight } = event.nativeEvent.source;
              imageSize.current = { width: naturalWidth, height: naturalHeight };
            }}
            style={{
              width,
              height,
              transform: [{ translateX }, { translateY }, { scale: scaleValue }],
            }}
          />
        </View>

        <Pressable
          testID="case-file-image-viewer-close"
          onPress={onRequestClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          className="items-center justify-center rounded-2xl border active:opacity-85"
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            minHeight: MOBILE_UX_TOKENS.minTouchTarget,
            paddingHorizontal: 16,
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
          }}
        >
          <Text style={[textRole("navigation"), { color: EXPEDITION_THEME.textPrimary }]}>{closeLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
