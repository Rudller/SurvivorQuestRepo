import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";

type QrScannerOverlayProps = {
  visible: boolean;
  isResolving: boolean;
  onClose: () => void;
  onDetected: (rawValue: string) => void;
};

const QR_SCANNER_OVERLAY_TEXT: Record<
  UiLanguage,
  {
    title: string;
    subtitle: string;
    cameraAccessTitle: string;
    cameraAccessDescription: string;
    enableCamera: string;
    verifyingCode: string;
    tabletHintTitle: string;
    tabletHintBody: string;
  }
> = {
  polish: {
    title: "Skaner QR",
    subtitle: "Skieruj kod do ramki",
    cameraAccessTitle: "Dostęp do kamery",
    cameraAccessDescription: "Aby skanować kody QR stanowisk, włącz dostęp do kamery.",
    enableCamera: "Włącz kamerę",
    verifyingCode: "Weryfikuję kod...",
    tabletHintTitle: "Skanowanie stanowiska",
    tabletHintBody: "Trzymaj tablet stabilnie i ustaw kod QR w środku ramki. Po rozpoznaniu stanowisko otworzy się automatycznie.",
  },
  english: {
    title: "QR scanner",
    subtitle: "Point the code at the frame",
    cameraAccessTitle: "Camera access",
    cameraAccessDescription: "Enable camera access to scan station QR codes.",
    enableCamera: "Enable camera",
    verifyingCode: "Verifying code...",
    tabletHintTitle: "Station scanning",
    tabletHintBody: "Hold the tablet steady and place the QR code in the center of the frame. The station opens automatically after detection.",
  },
  ukrainian: {
    title: "QR-сканер",
    subtitle: "Наведіть код у рамку",
    cameraAccessTitle: "Доступ до камери",
    cameraAccessDescription: "Щоб сканувати QR-коди станцій, увімкніть доступ до камери.",
    enableCamera: "Увімкнути камеру",
    verifyingCode: "Перевіряю код...",
    tabletHintTitle: "Сканування станції",
    tabletHintBody: "Тримайте планшет стабільно та розмістіть QR-код у центрі рамки. Після розпізнавання станція відкриється автоматично.",
  },
  russian: {
    title: "QR-сканер",
    subtitle: "Наведите код в рамку",
    cameraAccessTitle: "Доступ к камере",
    cameraAccessDescription: "Чтобы сканировать QR-коды станций, включите доступ к камере.",
    enableCamera: "Включить камеру",
    verifyingCode: "Проверяю код...",
    tabletHintTitle: "Сканирование станции",
    tabletHintBody: "Держите планшет ровно и поместите QR-код в центр рамки. После распознавания станция откроется автоматически.",
  },
};

export function QrScannerOverlay({ visible, isResolving, onClose, onDetected }: QrScannerOverlayProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const uiLanguage = useUiLanguage();
  const text = QR_SCANNER_OVERLAY_TEXT[uiLanguage];
  const isTabletLayout = adaptiveLayout.isTablet;
  const isLightTheme = getExpeditionThemeMode() === "light";
  const accentButtonTextColor = isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background;
  const backdropColor = isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(0, 0, 0, 0.65)";
  const cameraOverlayTextColor = isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.textPrimary;
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanLocked, setIsScanLocked] = useState(false);
  const [isMounted, setIsMounted] = useState(visible);
  const slideAnimation = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (!visible) {
      setIsScanLocked(false);
      return;
    }

    if (!permission?.granted) {
      void requestPermission();
    }
  }, [permission?.granted, requestPermission, visible]);

  useEffect(() => {
    if (!isResolving) {
      setIsScanLocked(false);
    }
  }, [isResolving]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      slideAnimation.stopAnimation();
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
      return;
    }

    slideAnimation.stopAnimation();
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [slideAnimation, visible]);

  const canScan = useMemo(
    () => visible && permission?.granted && !isResolving && !isScanLocked,
    [isResolving, isScanLocked, permission?.granted, visible],
  );

  if (!isMounted) {
    return null;
  }

  const backdropStyle = {
    opacity: slideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  } as const;
  const panelStyle = {
    opacity: slideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.92, 1],
    }),
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [180, 0],
        }),
      },
    ],
  } as const;
  const horizontalInset = adaptiveLayout.s(isTabletLayout ? 44 : 16, 14, 56);
  const panelMaxWidth = adaptiveLayout.s(isTabletLayout ? 1040 : 520, 340, 1120);
  const panelRadius = adaptiveLayout.s(isTabletLayout ? 34 : 24, 20, 42);
  const panelPadding = adaptiveLayout.s(isTabletLayout ? 28 : 16, 14, 34);
  const titleFontSize = adaptiveLayout.fs(isTabletLayout ? 34 : 22, 20, 40);
  const subtitleFontSize = adaptiveLayout.fs(isTabletLayout ? 18 : 14, 13, 22);
  const cameraHeight = adaptiveLayout.s(isTabletLayout ? 620 : 420, 320, 680);
  const frameSize = adaptiveLayout.s(isTabletLayout ? 420 : 300, 240, 480);
  const cornerSize = adaptiveLayout.s(isTabletLayout ? 52 : 34, 30, 60);
  const cornerRadius = adaptiveLayout.s(isTabletLayout ? 18 : 10, 10, 22);
  const cornerBorderWidth = adaptiveLayout.s(isTabletLayout ? 5 : 3, 3, 6);
  const contentGap = adaptiveLayout.s(isTabletLayout ? 22 : 14, 12, 28);
  const closeSize = adaptiveLayout.hit(isTabletLayout ? 54 : 42);

  return (
    <Animated.View
      className="absolute inset-0 z-50"
      style={[{ backgroundColor: backdropColor }, backdropStyle]}
    >
      <Animated.View className="absolute inset-0 items-center justify-center" style={[{ paddingHorizontal: horizontalInset }, panelStyle]}>
        <View
          className="w-full border"
          style={{
            maxWidth: panelMaxWidth,
            borderRadius: panelRadius,
            padding: panelPadding,
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panel,
          }}
        >
          <View className="flex-row items-start justify-between" style={{ columnGap: contentGap }}>
            <View className="flex-1">
              <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                {text.title}
              </Text>
              <Text className="mt-1 font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: titleFontSize }}>
                {text.tabletHintTitle}
              </Text>
              <Text className="mt-1" style={{ color: EXPEDITION_THEME.textMuted, fontSize: subtitleFontSize }}>
                {text.subtitle}
              </Text>
            </View>
            <Pressable
              className="items-center justify-center rounded-full border active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
              onPress={onClose}
            >
              <View style={{ width: closeSize, height: closeSize, alignItems: "center", justifyContent: "center" }}>
              <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletLayout ? 24 : 18, 16, 28) }}>
                ✕
              </Text>
              </View>
            </Pressable>
          </View>

          {!permission?.granted ? (
            <View
              className="border"
              style={{
                marginTop: contentGap,
                borderRadius: adaptiveLayout.s(24, 18, 30),
                padding: adaptiveLayout.s(isTabletLayout ? 24 : 16, 14, 28),
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panelMuted,
              }}
            >
              <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletLayout ? 24 : 16, 15, 28) }}>
                {text.cameraAccessTitle}
              </Text>
              <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: adaptiveLayout.fs(isTabletLayout ? 17 : 13, 12, 20) }}>
                {text.cameraAccessDescription}
              </Text>
              <Pressable
                className="active:opacity-90"
                style={{
                  marginTop: adaptiveLayout.s(18, 12, 24),
                  borderRadius: adaptiveLayout.s(16, 12, 20),
                  paddingVertical: adaptiveLayout.s(14, 10, 18),
                  paddingHorizontal: adaptiveLayout.s(18, 14, 24),
                  backgroundColor: EXPEDITION_THEME.accent,
                }}
                onPress={() => void requestPermission()}
              >
                <Text className="text-center font-semibold" style={{ color: accentButtonTextColor, fontSize: adaptiveLayout.fs(isTabletLayout ? 18 : 14, 13, 22) }}>
                  {text.enableCamera}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ marginTop: contentGap }}>
              <View
                className="overflow-hidden border bg-black"
                style={{
                  width: "100%",
                  height: cameraHeight,
                  borderRadius: adaptiveLayout.s(isTabletLayout ? 28 : 18, 16, 34),
                  borderColor: EXPEDITION_THEME.border,
                }}
              >
                <CameraView
                  style={{ flex: 1 }}
                  active={visible}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={
                    canScan
                      ? ({ data }) => {
                          const value = typeof data === "string" ? data.trim() : "";
                          if (!value) {
                            return;
                          }

                          setIsScanLocked(true);
                          onDetected(value);
                        }
                      : undefined
                  }
                />
                <View className="pointer-events-none absolute inset-0 items-center justify-center">
                  <View
                    style={{
                      width: frameSize,
                      height: frameSize,
                      position: "relative",
                    }}
                  >
                    {[
                      { top: 0, left: 0, borderTopWidth: cornerBorderWidth, borderLeftWidth: cornerBorderWidth, borderTopLeftRadius: cornerRadius },
                      { top: 0, right: 0, borderTopWidth: cornerBorderWidth, borderRightWidth: cornerBorderWidth, borderTopRightRadius: cornerRadius },
                      { bottom: 0, left: 0, borderBottomWidth: cornerBorderWidth, borderLeftWidth: cornerBorderWidth, borderBottomLeftRadius: cornerRadius },
                      { bottom: 0, right: 0, borderBottomWidth: cornerBorderWidth, borderRightWidth: cornerBorderWidth, borderBottomRightRadius: cornerRadius },
                    ].map((cornerStyle, index) => (
                      <View
                        key={index}
                        style={{
                          position: "absolute",
                          width: cornerSize,
                          height: cornerSize,
                          borderColor: EXPEDITION_THEME.accent,
                          ...cornerStyle,
                        }}
                      />
                    ))}
                  </View>
                </View>
                {isResolving ? (
                  <View className="pointer-events-none absolute inset-0 items-center justify-center bg-black/45">
                    <View className="flex-row items-center" style={{ columnGap: 10, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "rgba(0, 0, 0, 0.52)" }}>
                      <ActivityIndicator color={EXPEDITION_THEME.accent} />
                      <Text style={{ color: cameraOverlayTextColor, fontSize: adaptiveLayout.fs(isTabletLayout ? 17 : 14, 13, 20) }}>
                        {text.verifyingCode}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
