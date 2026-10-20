// Pełnoekranowy skaner "lampa UV" stacji ar-evidence. Na urządzeniu z ARCore
// (dev build / APK) rozpoznaje karty po obrazie (forensic-ar-layer.tsx); w Expo
// Go, gdzie Viro nie ma, rozpoznaje je po kodzie QR w rogu karty.
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import Svg, { Defs, Ellipse, G, RadialGradient, Rect, Stop } from "react-native-svg";

import { ForensicArLayer, loadViro } from "./forensic-ar-layer";
import {
  FORENSIC_HOLD_TO_ANALYZE_MS,
  FORENSIC_SAMPLE_CASE,
  findForensicEvidence,
  type ForensicEvidence,
} from "./forensic-case";

export const UV = {
  glow: "#c4a2ff",
  glowStrong: "#e4d6ff",
  tint: "rgba(58, 18, 140, 0.38)",
  vignette: "#14002e",
  text: "#ece4ff",
  textMuted: "rgba(236, 228, 255, 0.7)",
  border: "rgba(176, 132, 255, 0.6)",
  panel: "rgba(16, 8, 34, 0.9)",
  accent: "#a77bff",
};

// Kod QR przestaje przychodzić, gdy karta wyjdzie z kadru; po tym czasie bez
// zdarzenia ślad uznajemy za zgubiony.
const QR_LOST_AFTER_MS = 450;

type TraceRect = { x: number; y: number; width: number; height: number };

function readRect(result: BarcodeScanningResult, area: { width: number; height: number }): TraceRect | null {
  const bounds = result.bounds;
  if (!bounds || bounds.size.width <= 0 || bounds.size.height <= 0) {
    return null;
  }
  const rect = { x: bounds.origin.x, y: bounds.origin.y, width: bounds.size.width, height: bounds.size.height };
  if (rect.x < -rect.width || rect.y < -rect.height || rect.x > area.width || rect.y > area.height) {
    return null;
  }
  return rect;
}

function Fingerprint({ size }: { size: number }) {
  const rings = [3, 6, 9, 12, 15, 18];
  const ellipses = (stroke: string, width: number, opacity: number) =>
    rings.map((r) => (
      <Ellipse key={`${stroke}-${r}`} cx={15} cy={21} rx={r * 0.8} ry={r} stroke={stroke} strokeWidth={width} strokeOpacity={opacity} fill="none" />
    ));
  return (
    <Svg width={size} height={size * (40 / 30)} viewBox="0 0 30 40">
      <G>{ellipses(UV.accent, 3.2, 0.25)}</G>
      <G>{ellipses(UV.glow, 1.8, 0.45)}</G>
      <G>{ellipses(UV.glowStrong, 0.8, 1)}</G>
    </Svg>
  );
}

function QrLayer({
  area,
  onSeen,
  onLost,
}: {
  area: { width: number; height: number };
  onSeen: (code: string, rect: TraceRect | null) => void;
  onLost: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const lostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      void requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  useEffect(
    () => () => {
      if (lostTimer.current) {
        clearTimeout(lostTimer.current);
      }
    },
    [],
  );

  if (!permission?.granted) {
    return (
      <Pressable onPress={() => void requestPermission()} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: UV.text, fontSize: 18 }}>Dotknij, aby włączyć kamerę</Text>
      </Pressable>
    );
  }

  return (
    <CameraView
      style={{ flex: 1 }}
      active
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      onBarcodeScanned={(result) => {
        const code = typeof result.data === "string" ? result.data.trim() : "";
        if (!findForensicEvidence(code)) {
          return;
        }
        onSeen(code, readRect(result, area));
        if (lostTimer.current) {
          clearTimeout(lostTimer.current);
        }
        lostTimer.current = setTimeout(() => onLost(code), QR_LOST_AFTER_MS);
      }}
    />
  );
}

type ForensicScannerProps = {
  collectedCodes: string[];
  onCollect: (code: string) => void;
  onClose: () => void;
};

export function ForensicScanner({ collectedCodes, onCollect, onClose }: ForensicScannerProps) {
  const isArMode = loadViro() !== null;
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [sighting, setSighting] = useState<{ code: string; rect: TraceRect | null } | null>(null);
  const [lastResult, setLastResult] = useState<ForensicEvidence | null>(null);
  const [holdPercent, setHoldPercent] = useState(0);

  const scanLine = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const holdCodeRef = useRef<string | null>(null);
  const collectedRef = useRef(collectedCodes);
  collectedRef.current = collectedCodes;

  useEffect(() => {
    const scanLoop = Animated.loop(
      Animated.timing(scanLine, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    scanLoop.start();
    pulseLoop.start();
    return () => {
      scanLoop.stop();
      pulseLoop.stop();
    };
  }, [pulse, scanLine]);

  useEffect(() => {
    const id = holdProgress.addListener(({ value }) => setHoldPercent(Math.round(value * 100)));
    return () => holdProgress.removeListener(id);
  }, [holdProgress]);

  const cancelHold = useCallback(() => {
    holdAnimation.current?.stop();
    holdAnimation.current = null;
    holdCodeRef.current = null;
    holdProgress.setValue(0);
  }, [holdProgress]);

  const handleSeen = useCallback(
    (code: string, rect: TraceRect | null = null) => {
      const evidence = findForensicEvidence(code);
      if (!evidence) {
        return;
      }
      setSighting({ code, rect });

      if (collectedRef.current.includes(code)) {
        setLastResult(evidence);
        return;
      }
      if (holdCodeRef.current === code) {
        return;
      }
      cancelHold();
      holdCodeRef.current = code;
      const animation = Animated.timing(holdProgress, {
        toValue: 1,
        duration: FORENSIC_HOLD_TO_ANALYZE_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      holdAnimation.current = animation;
      animation.start(({ finished }) => {
        if (!finished || holdCodeRef.current !== code) {
          return;
        }
        holdAnimation.current = null;
        holdCodeRef.current = null;
        holdProgress.setValue(0);
        setLastResult(evidence);
        onCollect(code);
      });
    },
    [cancelHold, holdProgress, onCollect],
  );

  const handleLost = useCallback(
    (code: string) => {
      setSighting((current) => (current?.code === code ? null : current));
      if (holdCodeRef.current === code) {
        cancelHold();
      }
    },
    [cancelHold],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };

  const isSightingCollected = sighting ? collectedCodes.includes(sighting.code) : false;
  const showResultCard = lastResult !== null && sighting?.code === lastResult.code;
  // W trybie AR poświatę rysuje Viro na samym wydruku; w trybie QR rysujemy ją
  // tu, w miejscu kodu.
  const traceSize = Math.max(90, Math.min(area.width, area.height) * 0.22);
  const traceCenter = sighting?.rect
    ? { x: sighting.rect.x + sighting.rect.width / 2, y: sighting.rect.y + sighting.rect.height / 2 }
    : { x: area.width / 2, y: area.height * 0.42 };

  return (
    <View onLayout={handleLayout} style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
        {isArMode ? (
          <ForensicArLayer collectedCodes={collectedCodes} onSeen={handleSeen} onLost={handleLost} />
        ) : (
          <QrLayer area={area} onSeen={handleSeen} onLost={handleLost} />
        )}
      </View>

      <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: UV.tint }} />
      {area.width > 0 ? (
        <Svg pointerEvents="none" style={{ position: "absolute", top: 0, left: 0 }} width={area.width} height={area.height}>
          <Defs>
            <RadialGradient id="uvVignette" cx="50%" cy="50%" rx="70%" ry="60%">
              <Stop offset="0.45" stopColor={UV.vignette} stopOpacity={0} />
              <Stop offset="1" stopColor={UV.vignette} stopOpacity={0.92} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={area.width} height={area.height} fill="url(#uvVignette)" />
        </Svg>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: UV.glow,
          opacity: 0.75,
          elevation: 8,
          transform: [{ translateY: scanLine.interpolate({ inputRange: [0, 1], outputRange: [area.height * 0.08, area.height * 0.92] }) }],
        }}
      />

      {!isArMode && sighting ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: traceCenter.x - traceSize / 2,
            top: traceCenter.y - (traceSize * (40 / 30)) / 2,
            opacity: isSightingCollected ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
          }}
        >
          <Fingerprint size={traceSize} />
        </Animated.View>
      ) : null}

      {/* HUD */}
      <View style={{ position: "absolute", top: 18, left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ borderWidth: 1, borderColor: UV.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <Text style={{ color: UV.text, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>
            {isArMode ? "Lampa UV · AR" : "Lampa UV · tryb kodów"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", columnGap: 10 }}>
          <View style={{ borderWidth: 1, borderColor: UV.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "rgba(0,0,0,0.5)" }}>
            <Text style={{ color: UV.text, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" }}>
              Ślady {collectedCodes.length}/{FORENSIC_SAMPLE_CASE.evidence.length}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: UV.border, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <Text style={{ color: UV.text, fontSize: 16, fontWeight: "700" }}>✕</Text>
          </Pressable>
        </View>
      </View>

      {/* bottom: analysis progress, result card, hint */}
      <View style={{ position: "absolute", left: 18, right: 18, bottom: 24, alignItems: "center", rowGap: 12 }}>
        {sighting && !isSightingCollected ? (
          <View pointerEvents="none" style={{ alignItems: "center", rowGap: 6, borderRadius: 12, padding: 12, backgroundColor: "rgba(0,0,0,0.55)" }}>
            <View style={{ width: 260, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
              <Animated.View style={{ height: 8, backgroundColor: UV.glow, width: holdProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }) }} />
            </View>
            <Text style={{ color: UV.text, fontSize: 15, fontWeight: "700" }}>Trzymaj nieruchomo… analiza {holdPercent}%</Text>
          </View>
        ) : null}

        {showResultCard && lastResult ? (
          <View
            pointerEvents="none"
            style={{ width: "100%", maxWidth: 520, borderWidth: 1, borderColor: UV.border, borderRadius: 14, padding: 16, backgroundColor: UV.panel, rowGap: 4 }}
          >
            <Text style={{ color: UV.textMuted, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>{lastResult.label}</Text>
            {lastResult.matchPercent !== null ? (
              <>
                <Text style={{ color: UV.text, fontSize: 15 }}>
                  Dopasowanie <Text style={{ color: UV.glowStrong, fontWeight: "800" }}>{lastResult.matchPercent}%</Text>
                </Text>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" }}>
                  <View style={{ height: 6, borderRadius: 3, width: `${lastResult.matchPercent}%`, backgroundColor: UV.glow }} />
                </View>
                <Text style={{ color: UV.glowStrong, fontSize: 19, fontWeight: "800" }}>{lastResult.person}</Text>
              </>
            ) : (
              <Text style={{ color: "#fda4af", fontSize: 17, fontWeight: "800" }}>Brak dopasowania</Text>
            )}
            <Text style={{ color: UV.text, fontSize: 15, lineHeight: 21 }}>{lastResult.detail}</Text>
          </View>
        ) : null}

        {!sighting ? (
          <View style={{ width: "100%", borderRadius: 12, padding: 12, backgroundColor: "rgba(0,0,0,0.55)" }}>
            <Text style={{ color: UV.text, fontSize: 15, textAlign: "center" }}>
              {collectedCodes.length === 0
                ? FORENSIC_SAMPLE_CASE.intro
                : "Przeszukuj dalej. Ślady zaświecą, gdy znajdą się w kadrze."}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
