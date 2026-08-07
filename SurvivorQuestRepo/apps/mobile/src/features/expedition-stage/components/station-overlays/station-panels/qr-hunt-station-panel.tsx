import { useState } from "react";
import { Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import type { StationTestViewModel } from "../types";
import { useStationPanelLayout } from "./shared-ui";
import { useQrScanFeedbackSound } from "./use-qr-scan-feedback-sound";

type QrHuntText = {
  scanCode: string;
  scanNextCode: string;
  progress: (scanned: number, required: number) => string;
  progressLabel: string;
  allScanned: string;
  cameraAccessTitle: string;
  cameraAccessDescription: string;
  enableCamera: string;
};

const QR_HUNT_TEXT: Record<UiLanguage, QrHuntText> = {
  polish: {
    scanCode: "Skanuj kod",
    scanNextCode: "Skanuj kolejny kod",
    progress: (scanned, required) => `${scanned}/${required} zeskanowanych kodów`,
    progressLabel: "Postęp skanowania",
    allScanned: "Wszystkie kody zeskanowane, zadanie zaliczone.",
    cameraAccessTitle: "Dostęp do kamery",
    cameraAccessDescription: "Aby zeskanować kod, włącz dostęp do kamery.",
    enableCamera: "Włącz kamerę",
  },
  english: {
    scanCode: "Scan code",
    scanNextCode: "Scan next code",
    progress: (scanned, required) => `${scanned}/${required} codes scanned`,
    progressLabel: "Scanning progress",
    allScanned: "All codes scanned, task completed.",
    cameraAccessTitle: "Camera access",
    cameraAccessDescription: "Enable camera access to scan a code.",
    enableCamera: "Enable camera",
  },
  ukrainian: {
    scanCode: "Сканувати код",
    scanNextCode: "Сканувати наступний код",
    progress: (scanned, required) => `${scanned}/${required} відсканованих кодів`,
    progressLabel: "Прогрес сканування",
    allScanned: "Усі коди відскановано, завдання зараховано.",
    cameraAccessTitle: "Доступ до камери",
    cameraAccessDescription: "Щоб відсканувати код, увімкніть доступ до камери.",
    enableCamera: "Увімкнути камеру",
  },
  russian: {
    scanCode: "Сканировать код",
    scanNextCode: "Сканировать следующий код",
    progress: (scanned, required) => `${scanned}/${required} отсканированных кодов`,
    progressLabel: "Прогресс сканирования",
    allScanned: "Все коды отсканированы, задание зачтено.",
    cameraAccessTitle: "Доступ к камере",
    cameraAccessDescription: "Чтобы отсканировать код, включите доступ к камере.",
    enableCamera: "Включить камеру",
  },
};

export function useQrHuntScan(
  station: StationTestViewModel | null,
  onSubmitQrScan?: (stationId: string, code: string) => Promise<string | null>,
  onSubmitSuccess?: () => void,
) {
  const uiLanguage = useUiLanguage();
  const text = QR_HUNT_TEXT[uiLanguage];
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const feedbackSound = useQrScanFeedbackSound();

  const isDone = station?.status === "done";
  const isFailed = station?.status === "failed";
  const canScan = !isDone && !isFailed;
  const requiredCount = station?.qrScanRequiredCount ?? 0;
  const scannedCount = Math.min(requiredCount, station?.qrScanCompletedCount ?? 0);

  async function handleDetected(rawValue: string) {
    if (!onSubmitQrScan || !station || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    const error = await onSubmitQrScan(station.stationId, rawValue);
    setIsSubmitting(false);

    if (error) {
      feedbackSound.playIncorrect();
      setSubmitError(error);
      return;
    }

    feedbackSound.playCorrect();
    setIsScannerOpen(false);
    onSubmitSuccess?.();
  }

  return {
    text,
    isScannerOpen,
    openScanner: () => {
      setSubmitError(null);
      setIsScannerOpen(true);
    },
    closeScanner: () => setIsScannerOpen(false),
    isSubmitting,
    submitError,
    canScan,
    requiredCount,
    scannedCount,
    handleDetected: (value: string) => void handleDetected(value),
  };
}

type QrHuntProgressDotsProps = {
  text: QrHuntText;
  requiredCount: number;
  scannedCount: number;
  isDone: boolean;
};

export function QrHuntProgressDots({ text, requiredCount, scannedCount, isDone }: QrHuntProgressDotsProps) {
  const layout = useStationPanelLayout();

  if (isDone) {
    return (
      <Text className="text-center" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.resultFontSize }}>
        {text.allScanned}
      </Text>
    );
  }

  if (requiredCount <= 0) {
    return null;
  }

  return (
    <View className="items-center" style={{ rowGap: layout.attemptRowGap }}>
      <Text
        className="text-center uppercase tracking-widest"
        style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.infoFontSize }}
      >
        {text.progressLabel}
      </Text>
      <View className="flex-row items-center justify-center flex-wrap" style={{ columnGap: layout.attemptDotGap, rowGap: layout.attemptDotGap }}>
        {Array.from({ length: requiredCount }).map((_, index) => {
          const isScanned = index < scannedCount;
          return (
            <View
              key={`qr-hunt-progress-dot-${index}`}
              className="rounded-full border"
              style={{
                width: layout.attemptDotSize * 1.6,
                height: layout.attemptDotSize * 1.6,
                borderColor: isScanned ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                backgroundColor: isScanned ? EXPEDITION_THEME.accentStrong : "transparent",
              }}
            />
          );
        })}
      </View>
    </View>
  );
}
