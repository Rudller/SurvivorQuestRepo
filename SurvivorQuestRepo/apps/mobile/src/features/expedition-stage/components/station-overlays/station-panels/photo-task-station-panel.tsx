import { useState } from "react";
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
  overlayTitle: string;
  cameraAccessTitle: string;
  cameraAccessDescription: string;
  enableCamera: string;
  pendingReviewPopupMessage: string;
};

const PHOTO_TASK_TEXT: Record<UiLanguage, PhotoTaskText> = {
  polish: {
    takePhoto: "Zrób zdjęcie",
    retakePhoto: "Wyślij inne zdjęcie",
    pendingReview: "Zdjęcie wysłane, czeka na akceptację przez organizatora.",
    approved: "Zdjęcie zaakceptowane, zadanie zaliczone.",
    rejected: "Zdjęcie odrzucone, zadanie niezaliczone.",
    overlayTitle: "Zadanie fotograficzne",
    cameraAccessTitle: "Dostęp do kamery",
    cameraAccessDescription: "Aby zrobić zdjęcie, włącz dostęp do kamery.",
    enableCamera: "Włącz kamerę",
    pendingReviewPopupMessage:
      "Zadanie zostało wysłane. Organizator (Mistrz Gry) sprawdzi teraz, czy zdjęcie przedstawia to, co powinno, a potem będziesz mógł kontynuować grę.",
  },
  english: {
    takePhoto: "Take a photo",
    retakePhoto: "Submit another photo",
    pendingReview: "Photo submitted, waiting for organizer approval.",
    approved: "Photo approved, task completed.",
    rejected: "Photo rejected, task not completed.",
    overlayTitle: "Photo task",
    cameraAccessTitle: "Camera access",
    cameraAccessDescription: "Enable camera access to take a photo.",
    enableCamera: "Enable camera",
    pendingReviewPopupMessage:
      "The task has been submitted. The Game Master will now check whether the photo shows what it should, then you'll continue in the game.",
  },
  ukrainian: {
    takePhoto: "Зробити фото",
    retakePhoto: "Надіслати інше фото",
    pendingReview: "Фото надіслано, очікує на підтвердження організатора.",
    approved: "Фото підтверджено, завдання зараховано.",
    rejected: "Фото відхилено, завдання не зараховано.",
    overlayTitle: "Фотозавдання",
    cameraAccessTitle: "Доступ до камери",
    cameraAccessDescription: "Щоб зробити фото, увімкніть доступ до камери.",
    enableCamera: "Увімкнути камеру",
    pendingReviewPopupMessage:
      "Завдання надіслано. Організатор тепер перевірить, чи фото показує потрібне, після чого ви зможете продовжити гру.",
  },
  russian: {
    takePhoto: "Сделать фото",
    retakePhoto: "Отправить другое фото",
    pendingReview: "Фото отправлено, ожидает подтверждения организатора.",
    approved: "Фото подтверждено, задание зачтено.",
    rejected: "Фото отклонено, задание не зачтено.",
    overlayTitle: "Фотозадание",
    cameraAccessTitle: "Доступ к камере",
    cameraAccessDescription: "Чтобы сделать фото, включите доступ к камере.",
    enableCamera: "Включить камеру",
    pendingReviewPopupMessage:
      "Задание отправлено. Организатор теперь проверит, соответствует ли фото заданию, после чего вы сможете продолжить игру.",
  },
};

export function usePhotoTaskCapture(
  station: StationTestViewModel | null,
  onSubmitPhotoTask?: (stationId: string, fileUri: string) => Promise<string | null>,
  onSubmitSuccess?: () => void,
) {
  const uiLanguage = useUiLanguage();
  const text = PHOTO_TASK_TEXT[uiLanguage];
  const [isCaptureActive, setIsCaptureActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasSubmittedThisVisit, setHasSubmittedThisVisit] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const hasPendingSubmission = station?.status === "in-progress" || hasSubmittedThisVisit;
  const isApproved = station?.status === "done";
  const isRejected = station?.status === "failed";
  const canCapture = !isApproved && !isRejected;

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
    canCapture,
    previewUri,
    handleConfirmedCapture: (uri: string) => void handleConfirmedCapture(uri),
  };
}

type PhotoTaskStatusTextProps = {
  text: PhotoTaskText;
  isApproved: boolean;
  isRejected: boolean;
  hasPendingSubmission: boolean;
};

export function PhotoTaskStatusText({ text, isApproved, isRejected, hasPendingSubmission }: PhotoTaskStatusTextProps) {
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

  if (hasPendingSubmission) {
    return (
      <Text className="text-center" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
        {text.pendingReview}
      </Text>
    );
  }

  return null;
}
