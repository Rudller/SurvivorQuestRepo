import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useUiLanguage, type UiLanguage } from "../../i18n";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";

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

function QrScannerIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
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
  const text = BOTTOM_COUNTDOWN_PANEL_TEXT[uiLanguage];

  return (
    <View
      className="rounded-[30px] border px-4 py-3"
      style={{
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: EXPEDITION_THEME.panel,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 items-center">
          <Text className="text-[10px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
            {text.time}
          </Text>
          <Text className="mt-1 text-lg font-extrabold" style={{ color: isCompleted ? EXPEDITION_THEME.danger : EXPEDITION_THEME.accentStrong }}>
            {remainingLabel}
          </Text>
        </View>

        <Pressable
          className="mx-3 h-14 w-14 items-center justify-center rounded-full active:opacity-90"
          style={{
            backgroundColor: isInteractionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
            opacity: isScannerOpening || isInteractionDisabled ? 0.7 : 1,
          }}
          onPress={onOpenQrScanner}
          disabled={isScannerOpening || isInteractionDisabled}
        >
          <QrScannerIcon />
        </Pressable>

        <View className="flex-1 items-center">
          <Text className="text-[10px] uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
            {text.progress}
          </Text>
          <Text className="mt-1 text-lg font-extrabold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {progressLabel}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-center text-[11px]" style={{ color: EXPEDITION_THEME.textSubtle }}>
        {isInteractionDisabled ? text.realizationFinished : isScannerOpening ? text.openingScanner : text.qrScanner}
      </Text>
    </View>
  );
}
