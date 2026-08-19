import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { QR_SCAN_ALREADY_SCANNED, QR_SCAN_SILENT_FAILURE } from "../../../api/mobile-session.api";
import type { StationTestViewModel } from "../types";
import { useStationPanelLayout } from "./shared-ui";
import { useQrScanFeedbackSound } from "./use-qr-scan-feedback-sound";

type QrHuntText = {
  scanCode: string;
  scanNextCode: string;
  progress: (scanned: number, required: number) => string;
  allScanned: string;
  scanConfirmed: string;
  alreadyScanned: string;
  cameraAccessTitle: string;
  cameraAccessDescription: string;
  enableCamera: string;
};

const QR_HUNT_SCAN_CONFIRMATION_VISIBLE_MS = 1600;

// Shared between use-station-preview-model.ts (which sizes the scanner tile off
// of these) and preview.tsx (which caps the dots row / description boxes at
// these same heights) — kept as one source of truth so the scanner tile's
// height budget and its siblings' actual reserved space can't drift apart and
// silently clip content again (see the description-hidden-behind-the-tile bug).
export const QR_HUNT_PROGRESS_DOTS_RESERVE = { tablet: 60, phone: 46 };
export const QR_HUNT_DESCRIPTION_RESERVE = { tablet: 150, phone: 110 };

const QR_HUNT_TEXT: Record<UiLanguage, QrHuntText> = {
  polish: {
    scanCode: "Skanuj kod",
    scanNextCode: "Skanuj kolejny kod",
    progress: (scanned, required) => `${scanned}/${required} zeskanowanych kodów`,
    allScanned: "Wszystkie kody zeskanowane, zadanie zaliczone.",
    scanConfirmed: "Zeskanowano",
    alreadyScanned: "Ten kod został już zeskanowany",
    cameraAccessTitle: "Dostęp do kamery",
    cameraAccessDescription: "Aby zeskanować kod, włącz dostęp do kamery.",
    enableCamera: "Włącz kamerę",
  },
  english: {
    scanCode: "Scan code",
    scanNextCode: "Scan next code",
    progress: (scanned, required) => `${scanned}/${required} codes scanned`,
    allScanned: "All codes scanned, task completed.",
    scanConfirmed: "Scanned",
    alreadyScanned: "This code has already been scanned",
    cameraAccessTitle: "Camera access",
    cameraAccessDescription: "Enable camera access to scan a code.",
    enableCamera: "Enable camera",
  },
  ukrainian: {
    scanCode: "Сканувати код",
    scanNextCode: "Сканувати наступний код",
    progress: (scanned, required) => `${scanned}/${required} відсканованих кодів`,
    allScanned: "Усі коди відскановано, завдання зараховано.",
    scanConfirmed: "Відскановано",
    alreadyScanned: "Цей код уже відскановано",
    cameraAccessTitle: "Доступ до камери",
    cameraAccessDescription: "Щоб відсканувати код, увімкніть доступ до камери.",
    enableCamera: "Увімкнути камеру",
  },
  russian: {
    scanCode: "Сканировать код",
    scanNextCode: "Сканировать следующий код",
    progress: (scanned, required) => `${scanned}/${required} отсканированных кодов`,
    allScanned: "Все коды отсканированы, задание зачтено.",
    scanConfirmed: "Отсканировано",
    alreadyScanned: "Этот код уже отсканирован",
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
  const [showScanConfirmation, setShowScanConfirmation] = useState(false);
  const [showAlreadyScannedNotice, setShowAlreadyScannedNotice] = useState(false);
  const scanConfirmationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alreadyScannedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackSound = useQrScanFeedbackSound();

  useEffect(() => {
    return () => {
      if (scanConfirmationTimeoutRef.current) {
        clearTimeout(scanConfirmationTimeoutRef.current);
      }
      if (alreadyScannedTimeoutRef.current) {
        clearTimeout(alreadyScannedTimeoutRef.current);
      }
    };
  }, []);

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

    if (error === QR_SCAN_ALREADY_SCANNED) {
      setIsScannerOpen(false);
      if (alreadyScannedTimeoutRef.current) {
        clearTimeout(alreadyScannedTimeoutRef.current);
      }
      setShowAlreadyScannedNotice(true);
      alreadyScannedTimeoutRef.current = setTimeout(() => {
        setShowAlreadyScannedNotice(false);
      }, QR_HUNT_SCAN_CONFIRMATION_VISIBLE_MS);
      return;
    }

    if (error) {
      feedbackSound.playIncorrect();
      if (error !== QR_SCAN_SILENT_FAILURE) {
        setSubmitError(error);
      }
      return;
    }

    feedbackSound.playCorrect();
    setIsScannerOpen(false);

    const isLastCode = requiredCount > 0 && scannedCount + 1 >= requiredCount;
    if (!isLastCode) {
      if (scanConfirmationTimeoutRef.current) {
        clearTimeout(scanConfirmationTimeoutRef.current);
      }
      setShowScanConfirmation(true);
      scanConfirmationTimeoutRef.current = setTimeout(() => {
        setShowScanConfirmation(false);
      }, QR_HUNT_SCAN_CONFIRMATION_VISIBLE_MS);
    }

    onSubmitSuccess?.();
  }

  return {
    text,
    isScannerOpen,
    openScanner: () => {
      setSubmitError(null);
      setShowScanConfirmation(false);
      setShowAlreadyScannedNotice(false);
      if (scanConfirmationTimeoutRef.current) {
        clearTimeout(scanConfirmationTimeoutRef.current);
      }
      if (alreadyScannedTimeoutRef.current) {
        clearTimeout(alreadyScannedTimeoutRef.current);
      }
      setIsScannerOpen(true);
    },
    closeScanner: () => setIsScannerOpen(false),
    isSubmitting,
    submitError,
    canScan,
    requiredCount,
    scannedCount,
    showScanConfirmation,
    showAlreadyScannedNotice,
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
