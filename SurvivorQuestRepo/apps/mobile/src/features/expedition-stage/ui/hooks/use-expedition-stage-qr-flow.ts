import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { getApiErrorMessage } from "../../api/mobile-session.api";
import type { ExpeditionStationType, PlayerLocation } from "../../model/types";

type QrFlowText = {
  realizationEndedScannerBlocked: string;
  qrScannerReady: string;
  openScannerFailed: string;
  realizationEndedTasksBlocked: string;
  qrTokenReadFailed: string;
  processQrFailed: string;
  scannedStation: string;
  qrScanCanceled: string;
};

type UseExpeditionStageQrFlowArgs = {
  isSessionEnded: boolean;
  isInteractiveQuizStationType: (stationType?: ExpeditionStationType) => boolean;
  text: QrFlowText;
  playerLocation: PlayerLocation | null;
  requestCurrentLocation: () => Promise<PlayerLocation>;
  syncTeamLocation: (location: PlayerLocation) => Promise<string | null>;
  resolveStationQrToken: (
    token: string,
  ) => Promise<
    | string
    | {
        station: {
          id: string;
          name: string;
          type: ExpeditionStationType;
        };
      }
  >;
  setActionError: Dispatch<SetStateAction<string | null>>;
  setActionMessage: Dispatch<SetStateAction<string | null>>;
  setSelectedStationId: (stationId: string | null) => void;
  openStationByType: (stationId: string, stationType?: ExpeditionStationType) => void;
  interpolate: (template: string, values: Record<string, string>) => string;
  extractStationQrToken: (rawValue: string) => string | null;
};

export function useExpeditionStageQrFlow({
  isSessionEnded,
  isInteractiveQuizStationType,
  text,
  playerLocation,
  requestCurrentLocation,
  syncTeamLocation,
  resolveStationQrToken,
  setActionError,
  setActionMessage,
  setSelectedStationId,
  openStationByType,
  interpolate,
  extractStationQrToken,
}: UseExpeditionStageQrFlowArgs) {
  const [isScannerOpening, setIsScannerOpening] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isQrResolving, setIsQrResolving] = useState(false);

  const handleOpenQrScanner = useCallback(async () => {
    if (isSessionEnded) {
      setActionError(text.realizationEndedScannerBlocked);
      return;
    }

    setActionError(null);
    setActionMessage(null);
    setIsScannerOpening(true);

    try {
      const currentLocation = playerLocation ?? (await requestCurrentLocation().catch(() => null));

      if (currentLocation) {
        const syncError = await syncTeamLocation(currentLocation);
        if (syncError) {
          setActionError(syncError);
        }
      }
      setIsQrScannerOpen(true);
      setActionMessage(text.qrScannerReady);
    } catch (error) {
      setActionError(getApiErrorMessage(error, text.openScannerFailed));
    } finally {
      setIsScannerOpening(false);
    }
  }, [
    isSessionEnded,
    playerLocation,
    requestCurrentLocation,
    setActionError,
    setActionMessage,
    syncTeamLocation,
    text.openScannerFailed,
    text.qrScannerReady,
    text.realizationEndedScannerBlocked,
  ]);

  const handleQrDetected = useCallback(
    async (rawValue: string) => {
      if (isSessionEnded) {
        setActionError(text.realizationEndedTasksBlocked);
        return;
      }

      if (isQrResolving) {
        return;
      }

      setActionError(null);
      setActionMessage(null);
      setIsQrResolving(true);

      try {
        const token = extractStationQrToken(rawValue);
        if (!token) {
          setActionError(text.qrTokenReadFailed);
          return;
        }

        const result = await resolveStationQrToken(token);
        if (typeof result === "string") {
          setActionError(result);
          return;
        }

        const scannedStationId = result.station.id;
        setSelectedStationId(scannedStationId);
        if (isInteractiveQuizStationType(result.station.type)) {
          openStationByType(scannedStationId, result.station.type);
        } else if (result.station.type === "time") {
          openStationByType(scannedStationId, "time");
        } else {
          openStationByType(scannedStationId, result.station.type);
        }
        setIsQrScannerOpen(false);
        setActionMessage(interpolate(text.scannedStation, { name: result.station.name }));
      } catch (error) {
        setActionError(getApiErrorMessage(error, text.processQrFailed));
      } finally {
        setIsQrResolving(false);
      }
    },
    [
      extractStationQrToken,
      interpolate,
      isInteractiveQuizStationType,
      isQrResolving,
      isSessionEnded,
      openStationByType,
      resolveStationQrToken,
      setActionError,
      setActionMessage,
      setSelectedStationId,
      text.processQrFailed,
      text.qrTokenReadFailed,
      text.realizationEndedTasksBlocked,
      text.scannedStation,
    ],
  );

  const handleCloseQrScanner = useCallback(() => {
    setIsQrScannerOpen(false);
    setActionMessage((current) => current || text.qrScanCanceled);
  }, [setActionMessage, text.qrScanCanceled]);

  return {
    isScannerOpening,
    isQrScannerOpen,
    isQrResolving,
    setIsQrScannerOpen,
    handleOpenQrScanner,
    handleQrDetected,
    handleCloseQrScanner,
  };
}

export type ExpeditionStageQrFlow = ReturnType<typeof useExpeditionStageQrFlow>;
