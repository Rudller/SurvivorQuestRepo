import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import type { StationTestViewModel } from "../types";
import { useStationPanelLayout } from "./shared-ui";

type PhotoTaskText = {
  takePhoto: string;
  retakePhoto: string;
  pendingReview: string;
  approved: string;
  rejected: string;
  rejectedRetry: string;
  overlayTitle: string;
  cameraAccessTitle: string;
  cameraAccessDescription: string;
  enableCamera: string;
  switchCamera: string;
  pendingReviewPopupMessage: string;
};

const PHOTO_TASK_TEXT: Record<UiLanguage, PhotoTaskText> = {
  polish: {
    takePhoto: "Zrób zdjęcie",
    retakePhoto: "Wyślij inne zdjęcie",
    pendingReview: "Zdjęcie wysłane, czeka na akceptację przez organizatora.",
    approved: "Zdjęcie zaakceptowane, zadanie zaliczone.",
    rejected: "Zdjęcie odrzucone, zadanie niezaliczone.",
    rejectedRetry: "Zdjęcie odrzucone. Zeskanujcie ponownie kod QR stanowiska i zróbcie nowe zdjęcie.",
    overlayTitle: "Zadanie fotograficzne",
    cameraAccessTitle: "Dostęp do kamery",
    cameraAccessDescription: "Aby zrobić zdjęcie, włącz dostęp do kamery.",
    enableCamera: "Włącz kamerę",
    switchCamera: "Zmień kamerę",
    pendingReviewPopupMessage:
      "Zadanie zostało wysłane. Organizator (Mistrz Gry) sprawdzi teraz, czy zdjęcie przedstawia to, co powinno, a potem będziesz mógł kontynuować grę.",
  },
  english: {
    takePhoto: "Take a photo",
    retakePhoto: "Submit another photo",
    pendingReview: "Photo submitted, waiting for organizer approval.",
    approved: "Photo approved, task completed.",
    rejected: "Photo rejected, task not completed.",
    rejectedRetry: "Photo rejected. Scan the station's QR code again and take a new photo.",
    overlayTitle: "Photo task",
    cameraAccessTitle: "Camera access",
    cameraAccessDescription: "Enable camera access to take a photo.",
    enableCamera: "Enable camera",
    switchCamera: "Switch camera",
    pendingReviewPopupMessage:
      "The task has been submitted. The Game Master will now check whether the photo shows what it should, then you'll continue in the game.",
  },
  ukrainian: {
    takePhoto: "Зробити фото",
    retakePhoto: "Надіслати інше фото",
    pendingReview: "Фото надіслано, очікує на підтвердження організатора.",
    approved: "Фото підтверджено, завдання зараховано.",
    rejected: "Фото відхилено, завдання не зараховано.",
    rejectedRetry: "Фото відхилено. Відскануйте QR-код станції ще раз і зробіть нове фото.",
    overlayTitle: "Фотозавдання",
    cameraAccessTitle: "Доступ до камери",
    cameraAccessDescription: "Щоб зробити фото, увімкніть доступ до камери.",
    enableCamera: "Увімкнути камеру",
    switchCamera: "Змінити камеру",
    pendingReviewPopupMessage:
      "Завдання надіслано. Організатор тепер перевірить, чи фото показує потрібне, після чого ви зможете продовжити гру.",
  },
  russian: {
    takePhoto: "Сделать фото",
    retakePhoto: "Отправить другое фото",
    pendingReview: "Фото отправлено, ожидает подтверждения организатора.",
    approved: "Фото подтверждено, задание зачтено.",
    rejected: "Фото отклонено, задание не зачтено.",
    rejectedRetry: "Фото отклонено. Отсканируйте QR-код станции ещё раз и сделайте новое фото.",
    overlayTitle: "Фотозадание",
    cameraAccessTitle: "Доступ к камере",
    cameraAccessDescription: "Чтобы сделать фото, включите доступ к камере.",
    enableCamera: "Включить камеру",
    switchCamera: "Сменить камеру",
    pendingReviewPopupMessage:
      "Задание отправлено. Организатор теперь проверит, соответствует ли фото заданию, после чего вы сможете продолжить игру.",
  },
};

type PhotoTaskCaptureOptions = {
  // Ryzykanci opens the camera the moment the card is drawn: there the whole
  // card is the task, so the extra "take a photo" tap before the viewfinder
  // was pure friction. The full-screen station overlay keeps the two steps.
  autoOpenCapture?: boolean;
};

export function usePhotoTaskCapture(
  station: StationTestViewModel | null,
  onSubmitPhotoTask?: (stationId: string, fileUri: string) => Promise<string | null>,
  onSubmitSuccess?: () => void,
  options?: PhotoTaskCaptureOptions,
) {
  const uiLanguage = useUiLanguage();
  const text = PHOTO_TASK_TEXT[uiLanguage];
  const isApproved = station?.status === "done";
  const isRejected = station?.status === "failed";
  // Znacznik odrzucenia z chwili otwarcia panelu. Nowszy, i to z czasem po
  // otwarciu, oznacza, że organizator odrzucił zdjęcie, gdy panel był otwarty —
  // wtedy kierujemy do ponownego skanu QR (zadanie wróciło do „do zrobienia”).
  // Odrzucenie sprzed otwarcia, które dotarło dopiero z kolejnym odpytaniem
  // (drużyna zeskanowała kod, zanim tablet się o nim dowiedział), nie blokuje
  // aparatu — ten skan już jest tą nową próbą.
  const [visitRejectedAt, setVisitRejectedAt] = useState(station?.rejectedAt ?? null);
  const [visitOpenedAtMs, setVisitOpenedAtMs] = useState(() => Date.now());
  const rejectedAtMs = station?.rejectedAt ? Date.parse(station.rejectedAt) : Number.NaN;
  const isRejectedForRetry =
    Boolean(station?.rejectedAt) &&
    station?.rejectedAt !== visitRejectedAt &&
    station?.status === "todo" &&
    !(rejectedAtMs < visitOpenedAtMs);
  const canCapture = !isApproved && !isRejected && !isRejectedForRetry;
  const shouldAutoOpenCapture = Boolean(options?.autoOpenCapture) && canCapture;
  const [isCaptureActive, setIsCaptureActive] = useState(shouldAutoOpenCapture);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasSubmittedThisVisit, setHasSubmittedThisVisit] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const previousStationIdRef = useRef(station?.stationId);

  useEffect(() => {
    if (previousStationIdRef.current === station?.stationId) {
      return;
    }

    previousStationIdRef.current = station?.stationId;
    setVisitRejectedAt(station?.rejectedAt ?? null);
    setVisitOpenedAtMs(Date.now());
    setIsCaptureActive(shouldAutoOpenCapture);
    setIsUploading(false);
    setUploadError(null);
    setHasSubmittedThisVisit(false);
    setPreviewUri(null);
    // station.rejectedAt celowo poza zależnościami: zapamiętujemy go tylko przy wejściu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station?.stationId, shouldAutoOpenCapture]);

  useEffect(() => {
    if (isRejectedForRetry) {
      setIsCaptureActive(false);
    }
  }, [isRejectedForRetry]);

  const hasPendingSubmission =
    !isRejectedForRetry && (station?.status === "in-progress" || hasSubmittedThisVisit);

  async function handleConfirmedCapture(uri: string) {
    setPreviewUri(uri);

    if (!onSubmitPhotoTask || !station) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    const error = await onSubmitPhotoTask(station.stationId, uri);
    setIsUploading(false);

    if (error) {
      setUploadError(error);
      return;
    }

    setHasSubmittedThisVisit(true);
    setIsCaptureActive(false);
    onSubmitSuccess?.();
  }

  return {
    text,
    isCaptureActive,
    openCapture: () => setIsCaptureActive(true),
    closeCapture: () => setIsCaptureActive(false),
    isUploading,
    uploadError,
    hasPendingSubmission,
    isApproved,
    isRejected,
    isRejectedForRetry,
    canCapture,
    previewUri,
    handleConfirmedCapture: (uri: string) => void handleConfirmedCapture(uri),
  };
}

type PhotoTaskStatusTextProps = {
  text: PhotoTaskText;
  isApproved: boolean;
  isRejected: boolean;
  isRejectedForRetry?: boolean;
  hasPendingSubmission: boolean;
};

export function PhotoTaskStatusText({
  text,
  isApproved,
  isRejected,
  isRejectedForRetry = false,
  hasPendingSubmission,
}: PhotoTaskStatusTextProps) {
  const layout = useStationPanelLayout();

  if (isApproved) {
    return (
      <Text
        className="text-center"
        style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.resultFontSize }}
      >
        {text.approved}
      </Text>
    );
  }

  if (isRejected) {
    return (
      <Text className="text-center" style={{ color: EXPEDITION_THEME.danger, fontSize: layout.resultFontSize }}>
        {text.rejected}
      </Text>
    );
  }

  if (isRejectedForRetry) {
    return (
      <Text className="text-center" style={{ color: EXPEDITION_THEME.danger, fontSize: layout.resultFontSize }}>
        {text.rejectedRetry}
      </Text>
    );
  }

  if (hasPendingSubmission) {
    return (
      <Text className="text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
        {text.pendingReview}
      </Text>
    );
  }

  return null;
}
