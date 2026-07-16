import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SvgUri } from "react-native-svg";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { MOBILE_UX_TOKENS } from "../../../../../shared/ui/ux-tokens";

const CAMERA_SHUTTER_ICON_SVG_URI =
  "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/camera.svg";
const CHECK_ICON_SVG_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/outline/check.svg";
const RETRY_ICON_SVG_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/outline/refresh.svg";
const CLOSE_ICON_SVG_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/outline/x.svg";

type PhotoTaskInlineCameraProps = {
  isUploading: boolean;
  uploadError: string | null;
  cameraAccessTitle: string;
  cameraAccessDescription: string;
  enableCameraLabel: string;
  onCancel: () => void;
  onConfirm: (uri: string) => void;
};

export function PhotoTaskInlineCamera({
  isUploading,
  uploadError,
  cameraAccessTitle,
  cameraAccessDescription,
  enableCameraLabel,
  onCancel,
  onConfirm,
}: PhotoTaskInlineCameraProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletOverlay = adaptiveLayout.isTablet;
  const [permission, requestPermission] = useCameraPermissions();
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted) {
      void requestPermission();
    }
    // Only request once when this inline capture view mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleShutterPress() {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) {
        setLocalPreviewUri(photo.uri);
      }
    } finally {
      setIsCapturing(false);
    }
  }

  const controlButtonSize = adaptiveLayout.s(isTabletOverlay ? 64 : 50, 42, 72);
  const controlIconSize = adaptiveLayout.s(isTabletOverlay ? 28 : 22, 18, 32);
  const closeButtonSize = adaptiveLayout.s(isTabletOverlay ? 40 : 32, 28, 46);
  const closeIconSize = adaptiveLayout.s(isTabletOverlay ? 20 : 16, 14, 24);
  const controlGap = adaptiveLayout.s(isTabletOverlay ? 24 : 16, 12, 30);

  if (!permission?.granted) {
    return (
      <View className="flex-1 items-center justify-center" style={{ paddingHorizontal: 14 }}>
        <Text
          className="text-center font-semibold"
          style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletOverlay ? 16 : 13, 12, 20) }}
        >
          {cameraAccessTitle}
        </Text>
        <Text
          className="mt-1 text-center"
          style={{ color: EXPEDITION_THEME.textMuted, fontSize: adaptiveLayout.fs(isTabletOverlay ? 13 : 11, 10, 16) }}
        >
          {cameraAccessDescription}
        </Text>
        <Pressable
          className="mt-3 active:opacity-90"
          style={{
            borderRadius: adaptiveLayout.s(14, 10, 18),
            paddingVertical: adaptiveLayout.s(10, 8, 14),
            paddingHorizontal: adaptiveLayout.s(16, 12, 20),
            backgroundColor: EXPEDITION_THEME.accent,
          }}
          onPress={() => void requestPermission()}
        >
          <Text
            className="font-semibold"
            style={{ color: EXPEDITION_THEME.panelStrong, fontSize: adaptiveLayout.fs(13, 11, 16) }}
          >
            {enableCameraLabel}
          </Text>
        </Pressable>
        <Pressable
          className="absolute right-2 top-2 items-center justify-center rounded-full active:opacity-90"
          style={{ width: closeButtonSize, height: closeButtonSize, backgroundColor: "rgba(0, 0, 0, 0.45)" }}
          onPress={onCancel}
          hitSlop={8}
          accessibilityRole="button"
        >
          <SvgUri uri={CLOSE_ICON_SVG_URI} width={closeIconSize} height={closeIconSize} color="#ffffff" stroke="#ffffff" fill="none" />
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {localPreviewUri ? (
        <Image source={{ uri: localPreviewUri }} style={{ flex: 1 }} resizeMode="cover" />
      ) : (
        <CameraView ref={cameraRef} style={{ flex: 1 }} active facing="back" />
      )}

      {isUploading ? (
        <View className="pointer-events-none absolute inset-0 items-center justify-center bg-black/45">
          <ActivityIndicator color={EXPEDITION_THEME.accent} />
        </View>
      ) : null}

      <Pressable
        className="absolute right-2 top-2 items-center justify-center rounded-full active:opacity-90"
        style={{ width: closeButtonSize, height: closeButtonSize, backgroundColor: "rgba(0, 0, 0, 0.45)" }}
        onPress={onCancel}
        disabled={isUploading}
        hitSlop={8}
        accessibilityRole="button"
      >
        <SvgUri uri={CLOSE_ICON_SVG_URI} width={closeIconSize} height={closeIconSize} color="#ffffff" stroke="#ffffff" fill="none" />
      </Pressable>

      <View
        className="absolute bottom-2 w-full flex-row items-center justify-center"
        style={{ columnGap: controlGap }}
      >
        {localPreviewUri ? (
          <>
            <Pressable
              className={`items-center justify-center rounded-full border active:opacity-90 ${MOBILE_UX_TOKENS.activePressClass}`}
              style={{
                width: controlButtonSize,
                height: controlButtonSize,
                minWidth: MOBILE_UX_TOKENS.minTouchTarget,
                minHeight: MOBILE_UX_TOKENS.minTouchTarget,
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                opacity: isUploading ? MOBILE_UX_TOKENS.disabledOpacity : 1,
              }}
              onPress={() => setLocalPreviewUri(null)}
              disabled={isUploading}
              hitSlop={8}
              accessibilityRole="button"
            >
              <SvgUri uri={RETRY_ICON_SVG_URI} width={controlIconSize} height={controlIconSize} color="#ffffff" stroke="#ffffff" fill="none" />
            </Pressable>
            <Pressable
              className={`items-center justify-center rounded-full active:opacity-90 ${MOBILE_UX_TOKENS.activePressClass}`}
              style={{
                width: controlButtonSize,
                height: controlButtonSize,
                minWidth: MOBILE_UX_TOKENS.minTouchTarget,
                minHeight: MOBILE_UX_TOKENS.minTouchTarget,
                backgroundColor: EXPEDITION_THEME.accent,
                opacity: isUploading ? MOBILE_UX_TOKENS.disabledOpacity : 1,
              }}
              onPress={() => onConfirm(localPreviewUri)}
              disabled={isUploading}
              hitSlop={8}
              accessibilityRole="button"
            >
              <SvgUri uri={CHECK_ICON_SVG_URI} width={controlIconSize} height={controlIconSize} color={EXPEDITION_THEME.panelStrong} stroke={EXPEDITION_THEME.panelStrong} fill="none" />
            </Pressable>
          </>
        ) : (
          <Pressable
            className="items-center justify-center rounded-full border-4 active:opacity-90"
            style={{
              width: controlButtonSize,
              height: controlButtonSize,
              minWidth: MOBILE_UX_TOKENS.minTouchTarget,
              minHeight: MOBILE_UX_TOKENS.minTouchTarget,
              borderColor: EXPEDITION_THEME.accent,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
            onPress={() => void handleShutterPress()}
            disabled={isCapturing}
            hitSlop={8}
            accessibilityRole="button"
          >
            <SvgUri uri={CAMERA_SHUTTER_ICON_SVG_URI} width={controlIconSize} height={controlIconSize} color={EXPEDITION_THEME.accent} fill={EXPEDITION_THEME.accent} stroke={EXPEDITION_THEME.accent} />
          </Pressable>
        )}
      </View>

      {uploadError ? (
        <View className="pointer-events-none absolute bottom-2 left-2 right-2 items-center" style={{ marginBottom: controlButtonSize + 12 }}>
          <Text
            className="text-center"
            style={{
              color: "#ffffff",
              backgroundColor: "rgba(239, 111, 108, 0.85)",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 4,
              fontSize: adaptiveLayout.fs(12, 10, 15),
            }}
          >
            {uploadError}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
