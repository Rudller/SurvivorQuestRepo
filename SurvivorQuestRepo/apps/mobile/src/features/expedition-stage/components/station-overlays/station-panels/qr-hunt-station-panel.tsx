import { useState } from "react";
import { Text } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import type { StationTestViewModel } from "../types";
import { useStationPanelLayout } from "./shared-ui";

type QrHuntText = {
  scanCode: string;
  scanNextCode: string;
  progress: (scanned: number, required: number) => string;
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
    allScanned: "Wszystkie kody zeskanowane, zadanie zaliczone.",
    cameraAccessTitle: "Dostęp do kamery",
    cameraAccessDescription: "Aby zeskanować kod, włącz dostęp do kamery.",
    enableCamera: "Włącz kamerę",
  },
  english: {
    scanCode: "Scan code",
    scanNextCode: "Scan next code",
    progress: (scanned, required) => `${scanned}/${required} codes scanned`,
    allScanned: "All codes scanned, task completed.",
    cameraAccessTitle: "Camera access",
    cameraAccessDescription: "Enable camera access to scan a code.",
    enableCamera: "Enable camera",
  },
  ukrainian: {
    scanCode: "Сканувати код",
    scanNextCode: "Сканувати наступний код",
    progress: (scanned, required) => `${scanned}/${required} відсканованих кодів`,
    allScanned: "Усі коди відскановано, завдання зараховано.",
    cameraAccessTitle: "Доступ до камери",
    cameraAccessDescription: "Щоб відсканувати код, увімкніть доступ до камери.",
    enableCamera: "Увімкнути камеру",
  },
  russian: {
    scanCode: "Сканировать код",
    scanNextCode: "Сканировать следующий код",
    progress: (scanned, required) => `${scanned}/${required} отсканированных кодов`,
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
      setSubmitError(error);
      return;
    }

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

type QrHuntProgressTextProps = {
  text: QrHuntText;
  requiredCount: number;
  scannedCount: number;
  isDone: boolean;
};

export function QrHuntProgressText({ text, requiredCount, scannedCount, isDone }: QrHuntProgressTextProps) {
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
    <Text className="text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
      {text.progress(scannedCount, requiredCount)}
    </Text>
  );
}
