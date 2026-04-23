import { Image, Text, View } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../i18n";
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

const TOP_REALIZATION_PANEL_TEXT: Record<
  UiLanguage,
  {
    logo: string;
    team: string;
    points: string;
  }
> = {
  polish: {
    logo: "Logo",
    team: "Drużyna",
    points: "Punkty",
  },
  english: {
    logo: "Logo",
    team: "Team",
    points: "Points",
  },
  ukrainian: {
    logo: "Логотип",
    team: "Команда",
    points: "Бали",
  },
  russian: {
    logo: "Логотип",
    team: "Команда",
    points: "Очки",
  },
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
  const uiLanguage = useUiLanguage();
  const text = TOP_REALIZATION_PANEL_TEXT[uiLanguage];
  const cardTextColor = resolveCardTextColor(teamColorHex);
  const cardMutedTextColor = cardTextColor === "#0f172a" ? "rgba(15, 23, 42, 0.72)" : "rgba(248, 250, 252, 0.86)";
  const iconBackground = cardTextColor === "#0f172a" ? "rgba(255, 255, 255, 0.52)" : "rgba(15, 23, 42, 0.22)";

  return (
    <View
      className="rounded-3xl border p-1.5"
      style={{
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: "rgba(22, 41, 33, 0.88)",
      }}
    >
      <View className="h-48 flex-row items-stretch gap-2">
        <View
          className="w-48 self-stretch items-center justify-center overflow-hidden rounded-2xl border"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
          ) : (
            <Text className="text-[20px] font-semibold uppercase tracking-wide" style={{ color: EXPEDITION_THEME.textSubtle }}>
              {text.logo}
            </Text>
          )}
        </View>

        <View className="flex-1 justify-between py-0">
          <Text className="text-xl font-bold my-auto ml-2" style={{ color: EXPEDITION_THEME.textPrimary }} numberOfLines={1}>
            {companyName}
          </Text>
          <View
            className="mt-1 h-1/2 justify-center rounded-xl border px-2 py-1"
            style={{
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: teamColorHex,
            }}
          >
            <View className="flex-row items-center gap-2">
              <View className="h-full w-1/6 items-center justify-center rounded-md" style={{ backgroundColor: iconBackground }}>
                <Text className="text-3xl">{teamIcon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-extrabold" style={{ color: cardTextColor }} numberOfLines={1}>
                  {teamName}
                </Text>
                <Text className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: cardMutedTextColor }}>
                  {text.team} {teamSlot ?? "-"} • {teamColorLabel}
                </Text>
              </View>
              <View>
                <Text className="text-[9px] uppercase tracking-widest" style={{ color: cardMutedTextColor }}>
                  {text.points}
                </Text>
                <Text className="text-xl font-extrabold text-right" style={{ color: cardTextColor }}>
                  {points}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
