import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useUiLanguage, type UiLanguage } from "../../i18n";

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
  }
> = {
  polish: {
    title: "Skaner QR",
    subtitle: "Skieruj kod do ramki",
    cameraAccessTitle: "Dostęp do kamery",
    cameraAccessDescription: "Aby skanować kody QR stanowisk, włącz dostęp do kamery.",
    enableCamera: "Włącz kamerę",
    verifyingCode: "Weryfikuję kod...",
  },
  english: {
    title: "QR scanner",
    subtitle: "Point the code at the frame",
    cameraAccessTitle: "Camera access",
    cameraAccessDescription: "Enable camera access to scan station QR codes.",
    enableCamera: "Enable camera",
    verifyingCode: "Verifying code...",
  },
  ukrainian: {
    title: "QR-сканер",
    subtitle: "Наведіть код у рамку",
    cameraAccessTitle: "Доступ до камери",
    cameraAccessDescription: "Щоб сканувати QR-коди станцій, увімкніть доступ до камери.",
    enableCamera: "Увімкнути камеру",
    verifyingCode: "Перевіряю код...",
  },
  russian: {
    title: "QR-сканер",
    subtitle: "Наведите код в рамку",
    cameraAccessTitle: "Доступ к камере",
    cameraAccessDescription: "Чтобы сканировать QR-коды станций, включите доступ к камере.",
    enableCamera: "Включить камеру",
    verifyingCode: "Проверяю код...",
  },
};

export function QrScannerOverlay({ visible, isResolving, onClose, onDetected }: QrScannerOverlayProps) {
  const uiLanguage = useUiLanguage();
  const text = QR_SCANNER_OVERLAY_TEXT[uiLanguage];
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

  return (
    <Animated.View className="absolute inset-0 z-50" style={[{ backgroundColor: "rgba(0, 0, 0, 0.85)" }, backdropStyle]}>
      <Animated.View className="absolute inset-0 items-center justify-center px-4" style={panelStyle}>
        <View className="w-full max-w-xl rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs uppercase tracking-widest text-zinc-300">{text.title}</Text>
              <Text className="mt-1 text-sm text-zinc-100">{text.subtitle}</Text>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full border active:opacity-90"
              style={{ borderColor: "#3f3f46", backgroundColor: "#27272a" }}
              onPress={onClose}
            >
              <Text className="text-base font-semibold text-zinc-100">✕</Text>
            </Pressable>
          </View>

          {!permission?.granted ? (
            <View className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3">
              <Text className="text-sm font-semibold text-zinc-100">{text.cameraAccessTitle}</Text>
              <Text className="mt-1 text-xs text-zinc-300">
                {text.cameraAccessDescription}
              </Text>
              <Pressable
                className="mt-3 rounded-lg bg-amber-400 px-3 py-2 active:opacity-90"
                onPress={() => void requestPermission()}
              >
                <Text className="text-center text-sm font-semibold text-zinc-950">{text.enableCamera}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-3 rounded-xl border border-zinc-700 bg-black" style={{ height: 420 }}>
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
                    width: 300,
                    height: 300,
                    position: "relative",
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: 34,
                      height: 34,
                      borderTopWidth: 3,
                      borderLeftWidth: 3,
                      borderColor: "#fbbf24",
                      borderTopLeftRadius: 10,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 34,
                      height: 34,
                      borderTopWidth: 3,
                      borderRightWidth: 3,
                      borderColor: "#fbbf24",
                      borderTopRightRadius: 10,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: 34,
                      height: 34,
                      borderBottomWidth: 3,
                      borderLeftWidth: 3,
                      borderColor: "#fbbf24",
                      borderBottomLeftRadius: 10,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 34,
                      height: 34,
                      borderBottomWidth: 3,
                      borderRightWidth: 3,
                      borderColor: "#fbbf24",
                      borderBottomRightRadius: 10,
                    }}
                  />
                </View>
              </View>
              {isResolving ? (
                <View className="pointer-events-none absolute inset-0 items-center justify-center bg-black/55">
                  <View className="flex-row items-center gap-2 rounded-xl bg-black/70 px-3 py-2">
                    <ActivityIndicator color="#fbbf24" />
                    <Text className="text-sm text-zinc-100">{text.verifyingCode}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
