import { Image, Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME, type ExpeditionThemeMode } from "../../onboarding/model/constants";

type TopRealizationPanelProps = {
  companyName: string;
  logoUrl?: string;
  teamName: string;
  teamSlot: number | null;
  teamColorHex: string;
  teamColorLabel: string;
  teamIcon: string;
  points: number;
  languageFlag?: string;
  showLanguageButton?: boolean;
  onOpenLanguagePicker?: () => void;
  themeMode: ExpeditionThemeMode;
  onToggleTheme: () => void;
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

function ThemeModeIcon({ mode, color }: { mode: ExpeditionThemeMode; color: string }) {
  if (mode === "light") {
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="2" />
        <Path d="M12 2.5V5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M12 19V21.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M4.9 4.9L6.7 6.7" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M17.3 17.3L19.1 19.1" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M2.5 12H5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M19 12H21.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M4.9 19.1L6.7 17.3" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M17.3 6.7L19.1 4.9" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.7 15.2A8.7 8.7 0 1 1 8.8 3.3a7 7 0 1 0 11.9 11.9Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
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
  languageFlag,
  showLanguageButton = false,
  onOpenLanguagePicker,
  themeMode,
  onToggleTheme,
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
        backgroundColor: EXPEDITION_THEME.panel,
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

        <View className="flex-1">
          <View className="h-1/2 pl-2">
            <View className="h-full flex-row items-center gap-2">
              <Text
                className="flex-1 text-xl font-bold"
                style={{ color: EXPEDITION_THEME.textPrimary, includeFontPadding: false }}
                numberOfLines={1}
              >
                {companyName}
              </Text>
              <View className="flex-row items-center gap-2">
                {showLanguageButton && languageFlag && onOpenLanguagePicker ? (
                  <Pressable
                    className="h-11 w-11 items-center justify-center rounded-full active:opacity-90"
                    style={{ backgroundColor: EXPEDITION_THEME.panelStrong }}
                    onPress={onOpenLanguagePicker}
                  >
                    <Text className="text-lg">{languageFlag}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  className="mr-1 h-11 w-11 items-center justify-center rounded-full active:opacity-90"
                  style={{ backgroundColor: EXPEDITION_THEME.panelStrong }}
                  onPress={onToggleTheme}
                >
                  <ThemeModeIcon mode={themeMode} color={EXPEDITION_THEME.textPrimary} />
                </Pressable>
              </View>
            </View>
          </View>
          <View
            className="h-1/2 justify-center rounded-xl border px-2 py-1"
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
