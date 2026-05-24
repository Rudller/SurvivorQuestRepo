import { Image, Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME, type ExpeditionThemeMode } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";

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

function ThemeModeIcon({ mode, color, size = 22 }: { mode: ExpeditionThemeMode; color: string; size?: number }) {
  if (mode === "light") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
  const text = TOP_REALIZATION_PANEL_TEXT[uiLanguage];
  const cardTextColor = resolveCardTextColor(teamColorHex);
  const cardMutedTextColor = cardTextColor === "#0f172a" ? "rgba(15, 23, 42, 0.72)" : "rgba(248, 250, 252, 0.86)";
  const iconBackground = cardTextColor === "#0f172a" ? "rgba(255, 255, 255, 0.52)" : "rgba(15, 23, 42, 0.22)";
  const panelPadding = adaptiveLayout.s(isTabletLayout ? 8 : 4, 4, 10);
  const panelRadius = adaptiveLayout.s(isTabletLayout ? 28 : 18, 16, 32);
  const contentHeight = adaptiveLayout.s(isTabletLayout ? 208 : 116, 108, 224);
  const logoWidth = adaptiveLayout.s(isTabletLayout ? 208 : 100, 88, 224);
  const logoRadius = adaptiveLayout.s(isTabletLayout ? 22 : 14, 12, 26);
  const contentGap = adaptiveLayout.s(isTabletLayout ? 10 : 6, 5, 12);
  const companyFontSize = adaptiveLayout.fs(isTabletLayout ? 23 : 14, 13, 26);
  const actionButtonSize = adaptiveLayout.s(isTabletLayout ? 50 : 34, 32, 52);
  const languageFontSize = adaptiveLayout.fs(isTabletLayout ? 22 : 15, 14, 26);
  const themeIconSize = adaptiveLayout.s(isTabletLayout ? 24 : 17, 16, 28);
  const teamCardRadius = adaptiveLayout.s(isTabletLayout ? 18 : 10, 9, 22);
  const teamCardPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 12 : 6, 5, 14);
  const teamCardPaddingVertical = adaptiveLayout.s(isTabletLayout ? 8 : 3, 3, 10);
  const teamIconFontSize = adaptiveLayout.fs(isTabletLayout ? 36 : 21, 19, 40);
  const teamNameFontSize = adaptiveLayout.fs(isTabletLayout ? 23 : 14, 13, 26);
  const teamMetaFontSize = adaptiveLayout.fs(isTabletLayout ? 11 : 8, 7, 13);
  const pointsLabelFontSize = adaptiveLayout.fs(isTabletLayout ? 11 : 8, 7, 13);
  const pointsFontSize = adaptiveLayout.fs(isTabletLayout ? 24 : 15, 14, 28);

  return (
    <View
      style={{
        borderRadius: panelRadius,
        borderWidth: 1,
        padding: panelPadding,
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: EXPEDITION_THEME.panel,
      }}
    >
      <View style={{ height: contentHeight, flexDirection: "row", alignItems: "stretch", columnGap: contentGap }}>
        <View
          className="self-stretch items-center justify-center overflow-hidden border"
          style={{ width: logoWidth, borderRadius: logoRadius, borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
          ) : (
            <Text className="font-semibold uppercase tracking-wide" style={{ color: EXPEDITION_THEME.textSubtle, fontSize: companyFontSize }}>
              {text.logo}
            </Text>
          )}
        </View>

        <View className="flex-1">
          <View style={{ height: "50%", paddingLeft: adaptiveLayout.s(isTabletLayout ? 10 : 8, 6, 12) }}>
            <View style={{ height: "100%", flexDirection: "row", alignItems: "center", columnGap: contentGap }}>
              <Text
                className="flex-1 font-bold"
                style={{ color: EXPEDITION_THEME.textPrimary, includeFontPadding: false, fontSize: companyFontSize }}
                numberOfLines={1}
              >
                {companyName}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", columnGap: contentGap }}>
                {showLanguageButton && languageFlag && onOpenLanguagePicker ? (
                  <Pressable
                    className="items-center justify-center rounded-full active:opacity-90"
                    style={{ width: actionButtonSize, height: actionButtonSize, backgroundColor: EXPEDITION_THEME.panelStrong }}
                    onPress={onOpenLanguagePicker}
                  >
                    <Text style={{ fontSize: languageFontSize }}>{languageFlag}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  className="items-center justify-center rounded-full active:opacity-90"
                  style={{ width: actionButtonSize, height: actionButtonSize, marginRight: adaptiveLayout.s(4, 2, 6), backgroundColor: EXPEDITION_THEME.panelStrong }}
                  onPress={onToggleTheme}
                >
                  <ThemeModeIcon mode={themeMode} color={EXPEDITION_THEME.textPrimary} size={themeIconSize} />
                </Pressable>
              </View>
            </View>
          </View>
          <View
            className="justify-center border"
            style={{
              height: "50%",
              borderRadius: teamCardRadius,
              paddingHorizontal: teamCardPaddingHorizontal,
              paddingVertical: teamCardPaddingVertical,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: teamColorHex,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", columnGap: contentGap }}>
              <View className="h-full items-center justify-center rounded-md" style={{ width: "16.666%", backgroundColor: iconBackground }}>
                <Text style={{ fontSize: teamIconFontSize }}>{teamIcon}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-extrabold" style={{ color: cardTextColor, fontSize: teamNameFontSize }} numberOfLines={1}>
                  {teamName}
                </Text>
                <Text className="font-semibold uppercase tracking-wide" style={{ color: cardMutedTextColor, fontSize: teamMetaFontSize }}>
                  {text.team} {teamSlot ?? "-"} • {teamColorLabel}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                <Text
                  className="uppercase tracking-widest"
                  style={{ color: cardMutedTextColor, fontSize: pointsLabelFontSize }}
                  numberOfLines={1}
                >
                  {text.points}
                </Text>
                <Text
                  className="font-extrabold text-right"
                  style={{ color: cardTextColor, fontSize: pointsFontSize, includeFontPadding: false }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
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
