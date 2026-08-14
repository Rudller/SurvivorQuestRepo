import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SvgUri, SvgXml } from "react-native-svg";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { MOBILE_UX_TOKENS } from "../../../../../shared/ui/ux-tokens";

const CAMERA_SHUTTER_ICON_SVG_URI =
  "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/camera.svg";
const CHECK_ICON_SVG_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/outline/check.svg";
const RETRY_ICON_SVG_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/outline/refresh.svg";
const CLOSE_ICON_SVG_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/outline/x.svg";
// Inlined instead of fetched by URL (unlike the other icons on this screen): this one
// is the first thing the user needs to tap (switch to the front camera for a selfie),
// so a network round-trip delay before it appears — or unpkg's flaky serving of this
// specific asset (confirmed 500s there; fine on jsdelivr) — showed up as a blank/wrong
// button for a moment. Inlining makes it render synchronously, no network involved.
const CAMERA_SWITCH_ICON_SVG_XML = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
  <path d="M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" />
  <path d="M11.245 15.904a3 3 0 0 0 3.755 -2.904m-2.25 -2.905a3 3 0 0 0 -3.75 2.905" />
  <path d="M14 13h2v2" />
  <path d="M10 13h-2v-2" />
</svg>
`;

type PhotoTaskInlineCameraProps = {
  isUploading: boolean;
  uploadError: string | null;
  cameraAccessTitle: string;
  cameraAccessDescription: string;
  enableCameraLabel: string;
  switchCameraLabel: string;
  onCancel: () => void;
  onConfirm: (uri: string) => void;
};

export function PhotoTaskInlineCamera({
  isUploading,
  uploadError,
  cameraAccessTitle,
  cameraAccessDescription,
  enableCameraLabel,
  switchCameraLabel,
  onCancel,
  onConfirm,
}: PhotoTaskInlineCameraProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletOverlay = adaptiveLayout.isTablet;
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
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
        <CameraView ref={cameraRef} style={{ flex: 1 }} active facing={facing} mirror={facing === "front"} />
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

      {!localPreviewUri ? (
        <Pressable
          className="absolute bottom-2 right-2 items-center justify-center rounded-full active:opacity-90"
          style={{ width: closeButtonSize, height: closeButtonSize, backgroundColor: "rgba(0, 0, 0, 0.45)" }}
          onPress={() => setFacing((current) => (current === "back" ? "front" : "back"))}
          disabled={isUploading}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={switchCameraLabel}
        >
          <SvgXml xml={CAMERA_SWITCH_ICON_SVG_XML} width={closeIconSize} height={closeIconSize} color="#ffffff" stroke="#ffffff" fill="none" />
        </Pressable>
      ) : null}

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
