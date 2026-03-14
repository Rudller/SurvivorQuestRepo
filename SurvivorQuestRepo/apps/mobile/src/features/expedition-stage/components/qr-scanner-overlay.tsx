import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

type QrScannerOverlayProps = {
  visible: boolean;
  isResolving: boolean;
  onClose: () => void;
  onDetected: (rawValue: string) => void;
};

export function QrScannerOverlay({ visible, isResolving, onClose, onDetected }: QrScannerOverlayProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanLocked, setIsScanLocked] = useState(false);

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

  const canScan = useMemo(
    () => visible && permission?.granted && !isResolving && !isScanLocked,
    [isResolving, isScanLocked, permission?.granted, visible],
  );

  if (!visible) {
    return null;
  }

  if (!permission?.granted) {
    return (
      <View className="absolute inset-0 z-50 items-center justify-center bg-black/90 px-6">
        <View className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900/95 p-5">
          <Text className="text-base font-semibold text-zinc-100">Dostęp do kamery</Text>
          <Text className="mt-2 text-sm text-zinc-300">
            Aby skanować kody QR stanowisk, włącz dostęp do kamery.
          </Text>

          <View className="mt-4 flex-row gap-2">
            <Pressable
              className="flex-1 rounded-lg border border-zinc-700 px-3 py-2"
              onPress={onClose}
            >
              <Text className="text-center text-sm text-zinc-200">Anuluj</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-lg bg-amber-400 px-3 py-2"
              onPress={() => void requestPermission()}
            >
              <Text className="text-center text-sm font-semibold text-zinc-950">Włącz kamerę</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="absolute inset-0 z-50 bg-black">
      <CameraView
        className="flex-1"
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

      <View className="pointer-events-none absolute left-0 right-0 top-16 items-center px-5">
        <View className="rounded-xl bg-black/65 px-4 py-2">
          <Text className="text-center text-xs uppercase tracking-widest text-zinc-300">Skaner QR</Text>
          <Text className="mt-1 text-center text-sm text-zinc-100">Skieruj aparat na kod stanowiska</Text>
        </View>
      </View>

      <View className="absolute left-0 right-0 bottom-10 items-center px-5">
        <View className="w-full max-w-md rounded-2xl bg-black/70 p-4">
          {isResolving ? (
            <View className="mb-3 flex-row items-center justify-center gap-2">
              <ActivityIndicator color="#fbbf24" />
              <Text className="text-sm text-zinc-200">Weryfikuję kod...</Text>
            </View>
          ) : null}

          <Pressable className="rounded-lg border border-zinc-600 px-3 py-2" onPress={onClose}>
            <Text className="text-center text-sm text-zinc-100">Zamknij skaner</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
