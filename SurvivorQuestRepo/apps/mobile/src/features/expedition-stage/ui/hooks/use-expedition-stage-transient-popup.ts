import { useCallback, useEffect, useRef, useState } from "react";

const POPUP_MIN_DURATION_MS = 6_500;
const POPUP_MAX_DURATION_MS = 12_000;
const POPUP_MS_PER_CHAR = 45;

export type ExpeditionTransientPopup = {
  id: number;
  message: string;
  tone: "error" | "success";
};

type UseExpeditionStageTransientPopupArgs = {
  errorMessage: string | null;
  locationError: string | null;
  actionError: string | null;
  actionMessage: string | null;
};

export function useExpeditionStageTransientPopup({
  errorMessage,
  locationError,
  actionError,
  actionMessage,
}: UseExpeditionStageTransientPopupArgs) {
  const [transientPopup, setTransientPopup] = useState<ExpeditionTransientPopup | null>(null);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPopupSourceValuesRef = useRef<{
    errorMessage: string | null;
    locationError: string | null;
    actionError: string | null;
    actionMessage: string | null;
  }>({
    errorMessage: null,
    locationError: null,
    actionError: null,
    actionMessage: null,
  });

  const showTransientPopup = useCallback((message: string, tone: "error" | "success") => {
    const popupId = Date.now();
    setTransientPopup({ id: popupId, message, tone });

    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
    }

    const popupDurationMs = Math.max(
      POPUP_MIN_DURATION_MS,
      Math.min(POPUP_MAX_DURATION_MS, message.length * POPUP_MS_PER_CHAR),
    );

    popupTimeoutRef.current = setTimeout(() => {
      setTransientPopup((current) => (current?.id === popupId ? null : current));
    }, popupDurationMs);
  }, []);

  useEffect(() => {
    if (!errorMessage) {
      lastPopupSourceValuesRef.current.errorMessage = null;
      return;
    }

    if (lastPopupSourceValuesRef.current.errorMessage === errorMessage) {
      return;
    }

    lastPopupSourceValuesRef.current.errorMessage = errorMessage;
    showTransientPopup(errorMessage, "error");
  }, [errorMessage, showTransientPopup]);

  useEffect(() => {
    if (!locationError) {
      lastPopupSourceValuesRef.current.locationError = null;
      return;
    }

    if (lastPopupSourceValuesRef.current.locationError === locationError) {
      return;
    }

    lastPopupSourceValuesRef.current.locationError = locationError;
    showTransientPopup(locationError, "error");
  }, [locationError, showTransientPopup]);

  useEffect(() => {
    if (!actionError) {
      lastPopupSourceValuesRef.current.actionError = null;
      return;
    }

    if (lastPopupSourceValuesRef.current.actionError === actionError) {
      return;
    }

    lastPopupSourceValuesRef.current.actionError = actionError;
    showTransientPopup(actionError, "error");
  }, [actionError, showTransientPopup]);

  useEffect(() => {
    if (!actionMessage) {
      lastPopupSourceValuesRef.current.actionMessage = null;
      return;
    }

    if (lastPopupSourceValuesRef.current.actionMessage === actionMessage) {
      return;
    }

    lastPopupSourceValuesRef.current.actionMessage = actionMessage;
    showTransientPopup(actionMessage, "success");
  }, [actionMessage, showTransientPopup]);

  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  return { transientPopup };
}
