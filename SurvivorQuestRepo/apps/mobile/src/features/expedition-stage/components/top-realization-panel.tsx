import { Image, Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";

type TopRealizationPanelProps = {
  companyName: string;
  logoUrl?: string;
  teamName: string;
  teamSlot: number | null;
  teamColorHex: string;
  teamColorLabel: string;
  teamIcon: string;
  points: number;
};

function resolveCardTextColor(hexColor: string) {
  const normalizedHex = hexColor.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHex)) {
    return "#f8fafc";
  }

  const parsedHex = Number.parseInt(normalizedHex, 16);
  const red = (parsedHex >> 16) & 255;
  const green = (parsedHex >> 8) & 255;
  const blue = parsedHex & 255;
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 172 ? "#0f172a" : "#f8fafc";
}

export function TopRealizationPanel({
  companyName,
  logoUrl,
  teamName,
  teamSlot,
  teamColorHex,
  teamColorLabel,
  teamIcon,
  points,
}: TopRealizationPanelProps) {
  const cardTextColor = resolveCardTextColor(teamColorHex);
  const cardMutedTextColor = cardTextColor === "#0f172a" ? "rgba(15, 23, 42, 0.72)" : "rgba(248, 250, 252, 0.86)";
  const iconBackground = cardTextColor === "#0f172a" ? "rgba(255, 255, 255, 0.52)" : "rgba(15, 23, 42, 0.22)";

  return (
    <View
      className="rounded-3xl border p-3"
      style={{
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: "rgba(22, 41, 33, 0.88)",
      }}
    >
      <View className="flex-row gap-3">
        <View
          className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: EXPEDITION_THEME.textSubtle }}>
              Logo
            </Text>
          )}
        </View>

        <View className="flex-1 justify-center">
          <Text className="text-xl font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {companyName}
          </Text>
        </View>
      </View>

      <View
        className="mt-3 rounded-2xl border p-3"
        style={{
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: teamColorHex,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: iconBackground }}>
            <Text className="text-2xl">{teamIcon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-extrabold" style={{ color: cardTextColor }}>
              {teamName}
            </Text>
            <Text className="mt-0.5 text-xs font-semibold uppercase tracking-wide" style={{ color: cardMutedTextColor }}>
              Drużyna {teamSlot ?? "-"} • {teamColorLabel}
            </Text>
          </View>
          <View>
            <Text className="text-[10px] uppercase tracking-widest" style={{ color: cardMutedTextColor }}>
              Punkty
            </Text>
            <Text className="text-lg font-extrabold" style={{ color: cardTextColor }}>
              {points}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
