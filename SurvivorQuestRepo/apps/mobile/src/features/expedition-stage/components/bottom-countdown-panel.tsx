import { Pressable, Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";

type BottomCountdownPanelProps = {
  remainingLabel: string;
  isCompleted: boolean;
  progressLabel: string;
  onActivateCamera: () => void;
  isCameraActivating?: boolean;
};

export function BottomCountdownPanel({
  remainingLabel,
  isCompleted,
  progressLabel,
  onActivateCamera,
  isCameraActivating = false,
}: BottomCountdownPanelProps) {
  return (
    <View
      className="rounded-[30px] border px-4 py-3"
      style={{
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: "rgba(22, 41, 33, 0.9)",
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 items-center">
          <Text className="text-[10px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
            Czas
          </Text>
          <Text className="mt-1 text-lg font-extrabold" style={{ color: isCompleted ? EXPEDITION_THEME.danger : EXPEDITION_THEME.accentStrong }}>
            {remainingLabel}
          </Text>
        </View>

        <Pressable
          className="mx-3 h-14 w-14 items-center justify-center rounded-full active:opacity-90"
          style={{ backgroundColor: EXPEDITION_THEME.accent, opacity: isCameraActivating ? 0.7 : 1 }}
          onPress={onActivateCamera}
          disabled={isCameraActivating}
        >
          <Text className="text-xl">📷</Text>
        </Pressable>

        <View className="flex-1 items-center">
          <Text className="text-[10px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
            Postęp
          </Text>
          <Text className="mt-1 text-lg font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {progressLabel}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-center text-[11px]" style={{ color: EXPEDITION_THEME.textSubtle }}>
        {isCameraActivating ? "Uruchamianie kamery..." : "Kamera QR / Foto"}
      </Text>
    </View>
  );
}
