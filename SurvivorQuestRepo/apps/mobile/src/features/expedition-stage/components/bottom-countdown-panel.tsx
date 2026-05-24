import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../shared/layout/use-adaptive-layout";

type BottomCountdownPanelProps = {
  remainingLabel: string;
  isCompleted: boolean;
  progressLabel: string;
  onOpenQrScanner: () => void;
  isScannerOpening?: boolean;
  isInteractionDisabled?: boolean;
};

const BOTTOM_COUNTDOWN_PANEL_TEXT: Record<
  UiLanguage,
  {
    time: string;
    progress: string;
    realizationFinished: string;
    openingScanner: string;
    qrScanner: string;
  }
> = {
  polish: {
    time: "Czas",
    progress: "Postęp",
    realizationFinished: "Realizacja zakończona",
    openingScanner: "Otwieranie skanera...",
    qrScanner: "Skaner QR",
  },
  english: {
    time: "Time",
    progress: "Progress",
    realizationFinished: "Realization finished",
    openingScanner: "Opening scanner...",
    qrScanner: "QR scanner",
  },
  ukrainian: {
    time: "Час",
    progress: "Прогрес",
    realizationFinished: "Реалізацію завершено",
    openingScanner: "Відкриваємо сканер...",
    qrScanner: "QR-сканер",
  },
  russian: {
    time: "Время",
    progress: "Прогресс",
    realizationFinished: "Реализация завершена",
    openingScanner: "Открываем сканер...",
    qrScanner: "QR-сканер",
  },
};

function QrScannerIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        // Source icon path: Material Design Icons (free, Apache-2.0), qrcode-scan
        d="M4,4H10V10H4V4M20,4V10H14V4H20M14,15H16V13H14V11H16V13H18V11H20V13H18V15H20V18H18V20H16V18H13V20H11V16H14V15M16,15V18H18V15H16M4,20V14H10V20H4M6,6V8H8V6H6M16,6V8H18V6H16M6,16V18H8V16H6M4,11H6V13H4V11M9,11H13V15H11V13H9V11M11,6H13V10H11V6M2,2V6H0V2A2,2 0 0,1 2,0H6V2H2M22,0A2,2 0 0,1 24,2V6H22V2H18V0H22M2,18V22H6V24H2A2,2 0 0,1 0,22V18H2M22,22V18H24V22A2,2 0 0,1 22,24H18V22H22Z"
        fill="#0f172a"
      />
    </Svg>
  );
}

export function BottomCountdownPanel({
  remainingLabel,
  isCompleted,
  progressLabel,
  onOpenQrScanner,
  isScannerOpening = false,
  isInteractionDisabled = false,
}: BottomCountdownPanelProps) {
  const uiLanguage = useUiLanguage();
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;
  const text = BOTTOM_COUNTDOWN_PANEL_TEXT[uiLanguage];
  const panelRadius = adaptiveLayout.s(isTabletLayout ? 32 : 30, 26, 36);
  const panelPaddingHorizontal = adaptiveLayout.s(isTabletLayout ? 18 : 16, 14, 22);
  const panelPaddingVertical = adaptiveLayout.s(isTabletLayout ? 13 : 12, 10, 16);
  const labelFontSize = adaptiveLayout.fs(isTabletLayout ? 11 : 10, 10, 12);
  const valueFontSize = adaptiveLayout.fs(isTabletLayout ? 24 : 20, 18, 26);
  const footerFontSize = adaptiveLayout.fs(isTabletLayout ? 12 : 11, 10, 13);
  const qrButtonSize = adaptiveLayout.hit(isTabletLayout ? 62 : 56);
  const qrIconSize = adaptiveLayout.s(isTabletLayout ? 34 : 30, 28, 38);
  const qrButtonMarginHorizontal = adaptiveLayout.s(isTabletLayout ? 14 : 12, 10, 16);
  const footerMarginTop = adaptiveLayout.s(isTabletLayout ? 9 : 8, 6, 10);
  const centerColumnHeight = qrButtonSize + footerMarginTop + footerFontSize * 1.25;
  const sideLabelTop = Math.max(0, centerColumnHeight / 2 - valueFontSize * 1.25);
  const footerLabel = isInteractionDisabled ? text.realizationFinished : isScannerOpening ? text.openingScanner : text.qrScanner;

  return (
    <View
      style={{
        borderRadius: panelRadius,
        borderWidth: 1,
        paddingHorizontal: panelPaddingHorizontal,
        paddingVertical: panelPaddingVertical,
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: EXPEDITION_THEME.panel,
      }}
    >
      <View style={{ minHeight: centerColumnHeight, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, height: centerColumnHeight, alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Text className="uppercase tracking-widest" style={{ position: "absolute", top: sideLabelTop, color: EXPEDITION_THEME.textSubtle, fontSize: labelFontSize }}>
            {text.time}
          </Text>
          <Text className="font-extrabold" style={{ color: isCompleted ? EXPEDITION_THEME.danger : EXPEDITION_THEME.accentStrong, fontSize: valueFontSize }}>
            {remainingLabel}
          </Text>
        </View>

        <View style={{ width: qrButtonSize + qrButtonMarginHorizontal * 2, alignItems: "center" }}>
          <Pressable
            className="items-center justify-center rounded-full active:opacity-90"
            style={{
              width: qrButtonSize,
              height: qrButtonSize,
              backgroundColor: isInteractionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
              opacity: isScannerOpening || isInteractionDisabled ? 0.7 : 1,
            }}
            onPress={onOpenQrScanner}
            disabled={isScannerOpening || isInteractionDisabled}
          >
            <QrScannerIcon size={qrIconSize} />
          </Pressable>
          <Text className="text-center" style={{ marginTop: footerMarginTop, color: EXPEDITION_THEME.textSubtle, fontSize: footerFontSize }}>
            {footerLabel}
          </Text>
        </View>

        <View style={{ flex: 1, height: centerColumnHeight, alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Text className="uppercase tracking-widest" style={{ position: "absolute", top: sideLabelTop, color: EXPEDITION_THEME.textSubtle, fontSize: labelFontSize }}>
            {text.progress}
          </Text>
          <Text className="font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: valueFontSize }}>
            {progressLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}
