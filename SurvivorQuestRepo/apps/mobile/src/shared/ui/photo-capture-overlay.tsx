import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { useUiLanguage, type UiLanguage } from "../../features/i18n";
import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../features/onboarding/model/constants";
import { useAdaptiveLayout } from "../layout/use-adaptive-layout";

type PhotoCaptureOverlayProps = {
  visible: boolean;
  title: string;
  subtitle: string;
  facing?: CameraType;
  allowFacingToggle?: boolean;
  isUploading?: boolean;
  uploadError?: string | null;
  onClose: () => void;
  onCaptured: (uri: string) => void;
};

const PHOTO_CAPTURE_OVERLAY_TEXT: Record<
  UiLanguage,
  {
    cameraAccessTitle: string;
    cameraAccessDescription: string;
    enableCamera: string;
    retake: string;
    confirm: string;
    uploading: string;
    switchCamera: string;
  }
> = {
  polish: {
    cameraAccessTitle: "Dostęp do kamery",
    cameraAccessDescription: "Aby zrobić zdjęcie, włącz dostęp do kamery.",
    enableCamera: "Włącz kamerę",
    retake: "Powtórz",
    confirm: "Zatwierdź",
    uploading: "Wysyłanie...",
    switchCamera: "Zmień aparat",
  },
  english: {
    cameraAccessTitle: "Camera access",
    cameraAccessDescription: "Enable camera access to take a photo.",
    enableCamera: "Enable camera",
    retake: "Retake",
    confirm: "Confirm",
    uploading: "Uploading...",
    switchCamera: "Switch camera",
  },
  ukrainian: {
    cameraAccessTitle: "Доступ до камери",
    cameraAccessDescription: "Щоб зробити фото, увімкніть доступ до камери.",
    enableCamera: "Увімкнути камеру",
    retake: "Повторити",
    confirm: "Підтвердити",
    uploading: "Завантаження...",
    switchCamera: "Змінити камеру",
  },
  russian: {
    cameraAccessTitle: "Доступ к камере",
    cameraAccessDescription: "Чтобы сделать фото, включите доступ к камере.",
    enableCamera: "Включить камеру",
    retake: "Повторить",
    confirm: "Подтвердить",
    uploading: "Загрузка...",
    switchCamera: "Сменить камеру",
  },
};

export function PhotoCaptureOverlay({
  visible,
  title,
  subtitle,
  facing = "back",
  allowFacingToggle = false,
  isUploading = false,
  uploadError,
  onClose,
  onCaptured,
}: PhotoCaptureOverlayProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const uiLanguage = useUiLanguage();
  const text = PHOTO_CAPTURE_OVERLAY_TEXT[uiLanguage];
  const isTabletLayout = adaptiveLayout.isTablet;
  const isLightTheme = getExpeditionThemeMode() === "light";
  const accentButtonTextColor = isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background;
  const backdropColor = isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(0, 0, 0, 0.65)";
  const [permission, requestPermission] = useCameraPermissions();
  const [activeFacing, setActiveFacing] = useState<CameraType>(facing);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isMounted, setIsMounted] = useState(visible);
  const slideAnimation = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!visible) {
      setPreviewUri(null);
      setActiveFacing(facing);
      return;
    }

    if (!permission?.granted) {
      void requestPermission();
    }
  }, [facing, permission?.granted, requestPermission, visible]);

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

  if (!isMounted) {
    return null;
  }

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) {
        setPreviewUri(photo.uri);
      }
    } finally {
      setIsCapturing(false);
    }
  }

  const backdropStyle = {
    opacity: slideAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
  } as const;
  const panelStyle = {
    opacity: slideAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
    transform: [
      {
        translateY: slideAnimation.interpolate({ inputRange: [0, 1], outputRange: [180, 0] }),
      },
    ],
  } as const;
  const { width, height } = adaptiveLayout;
  const isLandscape = width > height;
  const verticalInset = adaptiveLayout.s(isTabletLayout ? 24 : 12, 8, 32);
  const horizontalInset = verticalInset;
  const panelMaxHeight = Math.round(height - verticalInset * 2);
  const panelRadius = adaptiveLayout.s(isTabletLayout ? 34 : 24, 20, 42);
  const panelPadding = adaptiveLayout.s(isTabletLayout ? 28 : 16, 14, 34);
  const titleFontSize = adaptiveLayout.fs(isTabletLayout ? (isLandscape ? 26 : 34) : isLandscape ? 18 : 22, 16, 40);
  const contentGap = adaptiveLayout.s(isTabletLayout ? 22 : 14, 12, 28);
  const closeSize = adaptiveLayout.hit(isTabletLayout ? 54 : 42);
  const shutterSize = adaptiveLayout.hit(isLandscape ? (isTabletLayout ? 64 : 52) : isTabletLayout ? 84 : 68);
  const cameraMaxHeight = adaptiveLayout.s(isTabletLayout ? 620 : 420, 320, 680);

  return (
    <Animated.View className="absolute inset-0 z-50" style={[{ backgroundColor: backdropColor }, backdropStyle]}>
      <Animated.View
        className="absolute inset-0 items-center justify-center"
        style={[{ paddingHorizontal: horizontalInset, paddingVertical: verticalInset }, panelStyle]}
      >
        <View
          className="w-full border"
          style={{
            maxHeight: panelMaxHeight,
            height: permission?.granted ? panelMaxHeight : undefined,
            borderRadius: panelRadius,
            padding: panelPadding,
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panel,
          }}
        >
          <View className="flex-row items-start justify-between" style={{ columnGap: contentGap }}>
            <View className="flex-1">
              <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
                {title}
              </Text>
              <Text className="mt-1 font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: titleFontSize }}>
                {subtitle}
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
            <View style={{ marginTop: contentGap, flex: 1, minHeight: 0 }}>
              <View
                style={{
                  flex: 1,
                  minHeight: 0,
                  flexDirection: isLandscape ? "row" : "column",
                  alignItems: isLandscape ? "stretch" : undefined,
                  columnGap: isLandscape ? contentGap : undefined,
                }}
              >
                <View
                  className="overflow-hidden border bg-black"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    maxHeight: cameraMaxHeight,
                    borderRadius: adaptiveLayout.s(isTabletLayout ? 28 : 18, 16, 34),
                    borderColor: EXPEDITION_THEME.border,
                  }}
                >
                  {previewUri ? (
                    <Image source={{ uri: previewUri }} style={{ flex: 1 }} resizeMode="cover" />
                  ) : (
                    <CameraView
                      ref={cameraRef}
                      style={{ flex: 1 }}
                      active={visible}
                      facing={activeFacing}
                      mirror={activeFacing === "front"}
                    />
                  )}

                  {isUploading ? (
                    <View className="pointer-events-none absolute inset-0 items-center justify-center bg-black/45">
                      <View className="flex-row items-center" style={{ columnGap: 10, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "rgba(0, 0, 0, 0.52)" }}>
                        <ActivityIndicator color={EXPEDITION_THEME.accent} />
                        <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletLayout ? 17 : 14, 13, 20) }}>
                          {text.uploading}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: isLandscape ? 0 : contentGap,
                  }}
                >
                  {previewUri ? (
                    <View
                      style={{
                        flexDirection: isLandscape ? "column" : "row",
                        columnGap: isLandscape ? undefined : contentGap,
                        rowGap: isLandscape ? contentGap : undefined,
                      }}
                    >
                      <Pressable
                        className="items-center justify-center rounded-2xl border active:opacity-90"
                        style={{
                          paddingVertical: adaptiveLayout.s(14, 10, 18),
                          paddingHorizontal: adaptiveLayout.s(22, 16, 28),
                          borderColor: EXPEDITION_THEME.border,
                          backgroundColor: EXPEDITION_THEME.panelStrong,
                        }}
                        disabled={isUploading}
                        onPress={() => setPreviewUri(null)}
                      >
                        <Text className="font-semibold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(16, 13, 20) }}>
                          {text.retake}
                        </Text>
                      </Pressable>
                      <Pressable
                        className="items-center justify-center rounded-2xl active:opacity-90"
                        style={{
                          paddingVertical: adaptiveLayout.s(14, 10, 18),
                          paddingHorizontal: adaptiveLayout.s(22, 16, 28),
                          backgroundColor: EXPEDITION_THEME.accent,
                          opacity: isUploading ? 0.6 : 1,
                        }}
                        disabled={isUploading}
                        onPress={() => onCaptured(previewUri)}
                      >
                        <Text className="font-semibold" style={{ color: accentButtonTextColor, fontSize: adaptiveLayout.fs(16, 13, 20) }}>
                          {text.confirm}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View
                      style={{
                        flexDirection: isLandscape ? "column" : "row",
                        alignItems: "center",
                        columnGap: isLandscape ? undefined : contentGap,
                        rowGap: isLandscape ? contentGap : undefined,
                      }}
                    >
                      <Pressable
                        className="items-center justify-center rounded-full border-4 active:opacity-90"
                        style={{
                          width: shutterSize,
                          height: shutterSize,
                          borderColor: EXPEDITION_THEME.accent,
                          backgroundColor: EXPEDITION_THEME.panelStrong,
                        }}
                        disabled={isCapturing}
                        onPress={() => void handleCapture()}
                      >
                        <View
                          style={{
                            width: shutterSize - 20,
                            height: shutterSize - 20,
                            borderRadius: (shutterSize - 20) / 2,
                            backgroundColor: EXPEDITION_THEME.accent,
                          }}
                        />
                      </Pressable>
                      {allowFacingToggle ? (
                        <Pressable
                          className="items-center justify-center rounded-full border active:opacity-90"
                          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
                          onPress={() => setActiveFacing((current) => (current === "back" ? "front" : "back"))}
                        >
                          <View style={{ width: closeSize, height: closeSize, alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(18, 14, 22) }}>
                              ⟳
                            </Text>
                          </View>
                        </Pressable>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>

              {uploadError ? (
                <Text className="mt-2" style={{ color: EXPEDITION_THEME.danger, fontSize: adaptiveLayout.fs(14, 12, 18) }}>
                  {uploadError}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
