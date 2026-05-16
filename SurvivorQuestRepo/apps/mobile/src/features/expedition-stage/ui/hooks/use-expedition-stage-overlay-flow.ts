import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { ExpeditionStationType, ExpeditionTask } from "../../model/types";
import type { StationTestViewModel } from "../../components/station-overlays";

const TEST_MENU_TRIGGER_HOLD_MS = 5_000;

type DebugOutcomePreview = {
  id: number;
  variant: "success" | "failed";
  message: string;
};

type OverlayFlowText = {
  realizationEndedCannotOpenStations: string;
  noStationsForPopupPreview: string;
  successPopupPreview: string;
  failedPopupPreview: string;
  realizationEndedCannotStartTasks: string;
  taskTimerStarted: string;
  taskAlreadyFailedAfterClose: string;
  taskCompleted: string;
  taskTimeExpired: string;
  taskMarkedFailed: string;
};

type UseExpeditionStageOverlayFlowArgs = {
  isSessionEnded: boolean;
  stationIds: string[];
  stationTestEntries: StationTestViewModel[];
  taskByStationId: Record<string, ExpeditionTask>;
  text: OverlayFlowText;
  startStationTask: (stationId: string, startedAt?: string) => Promise<string | null>;
  completeStationTask: (stationId: string, completionCode: string, startedAt?: string) => Promise<string | null>;
  failStationTask: (stationId: string, reason?: string, startedAt?: string) => Promise<string | null>;
  setSelectedStationId: (stationId: string | null) => void;
  setActionError: Dispatch<SetStateAction<string | null>>;
  setActionMessage: Dispatch<SetStateAction<string | null>>;
  isInteractiveQuizStationType: (stationType?: ExpeditionStationType) => boolean;
  isInvalidCompletionCodeError: (value: string | null) => boolean;
  isTaskAlreadyCompletedError: (value: string | null) => boolean;
};

export function useExpeditionStageOverlayFlow({
  isSessionEnded,
  stationIds,
  stationTestEntries,
  taskByStationId,
  text,
  startStationTask,
  completeStationTask,
  failStationTask,
  setSelectedStationId,
  setActionError,
  setActionMessage,
  isInteractiveQuizStationType,
  isInvalidCompletionCodeError,
  isTaskAlreadyCompletedError,
}: UseExpeditionStageOverlayFlowArgs) {
  const [isStationTestMenuOpen, setIsStationTestMenuOpen] = useState(false);
  const [isWelcomePreviewOpen, setIsWelcomePreviewOpen] = useState(false);
  const [isFinishPreviewOpen, setIsFinishPreviewOpen] = useState(false);
  const [activeStationTestId, setActiveStationTestId] = useState<string | null>(null);
  const [activeStationSnapshot, setActiveStationSnapshot] = useState<StationTestViewModel | null>(null);
  const [pendingQuizStartStationId, setPendingQuizStartStationId] = useState<string | null>(null);
  const [pendingTimeStartStationId, setPendingTimeStartStationId] = useState<string | null>(null);
  const [isStartingPendingQuiz, setIsStartingPendingQuiz] = useState(false);
  const [isStartingPendingTime, setIsStartingPendingTime] = useState(false);
  const [timedCloseConfirmStation, setTimedCloseConfirmStation] = useState<{
    stationId: string;
    startedAt: string | null;
  } | null>(null);
  const [localStartedAtByStationId, setLocalStartedAtByStationId] = useState<Record<string, string>>({});
  const [debugOutcomePreview, setDebugOutcomePreview] = useState<DebugOutcomePreview | null>(null);
  const testMenuHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTestMenuHoldTimeout = useCallback(() => {
    if (testMenuHoldTimeoutRef.current) {
      clearTimeout(testMenuHoldTimeoutRef.current);
      testMenuHoldTimeoutRef.current = null;
    }
  }, []);

  const handleTestMenuHoldStart = useCallback(() => {
    clearTestMenuHoldTimeout();
    testMenuHoldTimeoutRef.current = setTimeout(() => {
      testMenuHoldTimeoutRef.current = null;
      setIsStationTestMenuOpen(true);
    }, TEST_MENU_TRIGGER_HOLD_MS);
  }, [clearTestMenuHoldTimeout]);

  const handleTestMenuHoldEnd = useCallback(() => {
    clearTestMenuHoldTimeout();
  }, [clearTestMenuHoldTimeout]);

  const activeStationTest = useMemo(
    () => stationTestEntries.find((item) => item.stationId === activeStationTestId) ?? null,
    [activeStationTestId, stationTestEntries],
  );
  const pendingQuizStartStation = useMemo(
    () => stationTestEntries.find((item) => item.stationId === pendingQuizStartStationId) ?? null,
    [pendingQuizStartStationId, stationTestEntries],
  );
  const pendingTimeStartStation = useMemo(
    () => stationTestEntries.find((item) => item.stationId === pendingTimeStartStationId) ?? null,
    [pendingTimeStartStationId, stationTestEntries],
  );

  const activeStationPreview = useMemo(() => {
    const fallbackStation =
      activeStationSnapshot && activeStationSnapshot.stationId === activeStationTestId
        ? activeStationSnapshot
        : null;
    const previewStation = activeStationTest ?? fallbackStation;
    if (!previewStation) {
      return null;
    }

    const stationId = previewStation.stationId;
    const activeTask = taskByStationId[stationId];
    return {
      ...previewStation,
      startedAt: activeTask?.startedAt ?? previewStation.startedAt ?? localStartedAtByStationId[stationId] ?? null,
    };
  }, [activeStationSnapshot, activeStationTest, activeStationTestId, localStartedAtByStationId, taskByStationId]);

  useEffect(() => {
    if (!activeStationTestId) {
      setActiveStationSnapshot(null);
      return;
    }

    if (activeStationTest && activeStationTest.stationId === activeStationTestId) {
      setActiveStationSnapshot(activeStationTest);
      return;
    }
  }, [activeStationTest, activeStationTestId]);

  useEffect(() => {
    if (!pendingQuizStartStationId) {
      return;
    }

    if (stationTestEntries.some((item) => item.stationId === pendingQuizStartStationId)) {
      return;
    }

    setPendingQuizStartStationId(null);
  }, [pendingQuizStartStationId, stationTestEntries]);

  useEffect(() => {
    if (!pendingTimeStartStationId) {
      return;
    }

    if (stationTestEntries.some((item) => item.stationId === pendingTimeStartStationId)) {
      return;
    }

    setPendingTimeStartStationId(null);
  }, [pendingTimeStartStationId, stationTestEntries]);

  useEffect(() => {
    if (!pendingQuizStartStationId) {
      setIsStartingPendingQuiz(false);
    }
  }, [pendingQuizStartStationId]);

  useEffect(() => {
    if (!pendingTimeStartStationId) {
      setIsStartingPendingTime(false);
    }
  }, [pendingTimeStartStationId]);

  useEffect(() => {
    if (!activeStationTestId) {
      return;
    }

    const activeTask = taskByStationId[activeStationTestId];
    if (!activeTask?.startedAt) {
      return;
    }

    setLocalStartedAtByStationId((current) => {
      if (!current[activeStationTestId]) {
        return current;
      }

      const next = { ...current };
      delete next[activeStationTestId];
      return next;
    });
  }, [activeStationTestId, taskByStationId]);

  useEffect(() => {
    if (!timedCloseConfirmStation) {
      return;
    }

    if (!activeStationTestId || activeStationTestId !== timedCloseConfirmStation.stationId) {
      setTimedCloseConfirmStation(null);
    }
  }, [activeStationTestId, timedCloseConfirmStation]);

  useEffect(() => {
    if (!isSessionEnded) {
      return;
    }

    setIsFinishPreviewOpen(false);
  }, [isSessionEnded]);

  useEffect(() => {
    return () => {
      clearTestMenuHoldTimeout();
    };
  }, [clearTestMenuHoldTimeout]);

  const openStationByType = useCallback(
    (stationId: string, stationType?: ExpeditionStationType) => {
      if (isInteractiveQuizStationType(stationType)) {
        setPendingQuizStartStationId(stationId);
        setPendingTimeStartStationId(null);
        setActiveStationTestId(null);
      } else if (stationType === "time") {
        setPendingQuizStartStationId(null);
        setPendingTimeStartStationId(stationId);
        setActiveStationTestId(null);
      } else {
        setPendingQuizStartStationId(null);
        setPendingTimeStartStationId(null);
        setActiveStationTestId(stationId);
      }
    },
    [isInteractiveQuizStationType],
  );

  const handleEnterStationTest = useCallback(
    (stationId: string) => {
      if (isSessionEnded) {
        setActionError(text.realizationEndedCannotOpenStations);
        setIsStationTestMenuOpen(false);
        return;
      }

      const selectedStation = stationTestEntries.find((item) => item.stationId === stationId) ?? null;
      if (stationIds.includes(stationId)) {
        setSelectedStationId(stationId);
      }
      if (isInteractiveQuizStationType(selectedStation?.stationType)) {
        openStationByType(stationId, selectedStation?.stationType);
      } else if (selectedStation?.timeLimitSeconds && selectedStation.timeLimitSeconds > 0) {
        setPendingQuizStartStationId(null);
        setPendingTimeStartStationId(stationId);
        setActiveStationTestId(null);
      } else if (selectedStation?.stationType === "time") {
        setPendingQuizStartStationId(null);
        setPendingTimeStartStationId(stationId);
        setActiveStationTestId(null);
      } else {
        openStationByType(stationId, selectedStation?.stationType);
      }
      setIsStationTestMenuOpen(false);
    },
    [
      isInteractiveQuizStationType,
      isSessionEnded,
      openStationByType,
      setActionError,
      setSelectedStationId,
      stationIds,
      stationTestEntries,
      text.realizationEndedCannotOpenStations,
    ],
  );

  const handlePreviewOutcomePopup = useCallback(
    (variant: "success" | "failed") => {
      const previewStationId = stationTestEntries[0]?.stationId ?? null;
      if (!previewStationId) {
        setActionError(text.noStationsForPopupPreview);
        return;
      }

      setPendingQuizStartStationId(null);
      setPendingTimeStartStationId(null);
      setSelectedStationId(previewStationId);
      setActiveStationTestId(previewStationId);
      setIsStationTestMenuOpen(false);
      setDebugOutcomePreview({
        id: Date.now(),
        variant,
        message: variant === "success" ? text.successPopupPreview : text.failedPopupPreview,
      });
    },
    [
      setActionError,
      setSelectedStationId,
      stationTestEntries,
      text.failedPopupPreview,
      text.noStationsForPopupPreview,
      text.successPopupPreview,
    ],
  );

  const handleStartStationTestTask = useCallback(
    async (stationId: string) => {
      if (isSessionEnded) {
        return text.realizationEndedCannotStartTasks;
      }

      setActionError(null);
      setActionMessage(null);
      const startedAtIso = new Date().toISOString();

      setLocalStartedAtByStationId((current) => ({
        ...current,
        [stationId]: startedAtIso,
      }));

      const result = await startStationTask(stationId, startedAtIso);
      if (result) {
        setLocalStartedAtByStationId((current) => {
          if (!current[stationId]) {
            return current;
          }

          const next = { ...current };
          delete next[stationId];
          return next;
        });
        setActionError(result);
        return result;
      }

      setActionMessage(text.taskTimerStarted);
      return null;
    },
    [
      isSessionEnded,
      setActionError,
      setActionMessage,
      startStationTask,
      text.realizationEndedCannotStartTasks,
      text.taskTimerStarted,
    ],
  );

  const handleCompleteStationTestTask = useCallback(
    async (stationId: string, completionCode: string, startedAt?: string) => {
      setActionError(null);
      setActionMessage(null);

      if (taskByStationId[stationId]?.status === "failed") {
        return text.taskAlreadyFailedAfterClose;
      }

      const result = await completeStationTask(stationId, completionCode, startedAt);
      if (result) {
        if (isTaskAlreadyCompletedError(result)) {
          setActionMessage(text.taskCompleted);
          return null;
        }
        if (!isInvalidCompletionCodeError(result)) {
          setActionError(result);
        }
        return result;
      }

      setActionMessage(text.taskCompleted);
      return null;
    },
    [
      completeStationTask,
      isTaskAlreadyCompletedError,
      isInvalidCompletionCodeError,
      setActionError,
      setActionMessage,
      taskByStationId,
      text.taskAlreadyFailedAfterClose,
      text.taskCompleted,
    ],
  );

  const handleRequestCloseActiveStation = useCallback(() => {
    if (!activeStationTest) {
      setActiveStationTestId(null);
      return;
    }

    const isAlreadyDone = activeStationTest.status === "done" || activeStationTest.status === "failed";
    if (isAlreadyDone) {
      setActiveStationTestId(null);
      return;
    }

    const stationId = activeStationTest.stationId;
    const startedAt = activeStationTest.startedAt ?? localStartedAtByStationId[stationId] ?? null;
    setTimedCloseConfirmStation({ stationId, startedAt });
  }, [activeStationTest, localStartedAtByStationId]);

  const handleTimeStationExpired = useCallback(
    (stationId: string) => {
      const startedAt = taskByStationId[stationId]?.startedAt ?? localStartedAtByStationId[stationId];
      void failStationTask(stationId, "time_limit_expired", startedAt).then((error) => {
        if (error) {
          setActionError(error);
          return;
        }
        setActionError(text.taskTimeExpired);
      });
    },
    [failStationTask, localStartedAtByStationId, setActionError, taskByStationId, text.taskTimeExpired],
  );

  const handleQuizFailed = useCallback(
    (stationId: string, reason?: string) => {
      const startedAt = taskByStationId[stationId]?.startedAt ?? localStartedAtByStationId[stationId];
      void failStationTask(stationId, reason ?? "quiz_incorrect_answer", startedAt).then((error) => {
        if (error) {
          setActionError(error);
        }
      });
    },
    [failStationTask, localStartedAtByStationId, setActionError, taskByStationId],
  );

  const handleStartPendingQuiz = useCallback(async () => {
    if (!pendingQuizStartStationId) {
      return;
    }
    const startedAtIso = new Date().toISOString();
    setIsStartingPendingQuiz(true);
    setLocalStartedAtByStationId((current) => ({
      ...current,
      [pendingQuizStartStationId]: startedAtIso,
    }));
    setActionError(null);
    setActionMessage(null);

    const startError = await startStationTask(pendingQuizStartStationId, startedAtIso);
    if (startError) {
      setActionError(startError);
      setIsStartingPendingQuiz(false);
      return;
    }

    setActiveStationTestId(pendingQuizStartStationId);
    setPendingQuizStartStationId(null);
    setIsStartingPendingQuiz(false);
  }, [pendingQuizStartStationId, setActionError, setActionMessage, startStationTask]);

  const handleStartPendingTime = useCallback(async () => {
    if (!pendingTimeStartStationId) {
      return;
    }

    setIsStartingPendingTime(true);
    const startError = await handleStartStationTestTask(pendingTimeStartStationId);
    if (startError) {
      setIsStartingPendingTime(false);
      return;
    }

    setActiveStationTestId(pendingTimeStartStationId);
    setPendingTimeStartStationId(null);
    setIsStartingPendingTime(false);
  }, [handleStartStationTestTask, pendingTimeStartStationId]);

  const handleConfirmTimedCloseFail = useCallback(() => {
    const station = timedCloseConfirmStation;
    if (!station) {
      return;
    }

    setTimedCloseConfirmStation(null);
    void failStationTask(station.stationId, "task_closed_before_completion", station.startedAt ?? undefined).then((error) => {
      if (error) {
        setActionError(error);
      } else {
        setActionMessage(text.taskMarkedFailed);
      }
      setActiveStationTestId(null);
    });
  }, [failStationTask, setActionError, setActionMessage, text.taskMarkedFailed, timedCloseConfirmStation]);

  return {
    isStationTestMenuOpen,
    setIsStationTestMenuOpen,
    isWelcomePreviewOpen,
    setIsWelcomePreviewOpen,
    isFinishPreviewOpen,
    setIsFinishPreviewOpen,
    activeStationTestId,
    setActiveStationTestId,
    pendingQuizStartStationId,
    setPendingQuizStartStationId,
    pendingTimeStartStationId,
    setPendingTimeStartStationId,
    isStartingPendingQuiz,
    setIsStartingPendingQuiz,
    isStartingPendingTime,
    setIsStartingPendingTime,
    timedCloseConfirmStation,
    setTimedCloseConfirmStation,
    localStartedAtByStationId,
    setLocalStartedAtByStationId,
    debugOutcomePreview,
    setDebugOutcomePreview,
    activeStationTest,
    activeStationPreview,
    pendingQuizStartStation,
    pendingTimeStartStation,
    clearTestMenuHoldTimeout,
    handleTestMenuHoldStart,
    handleTestMenuHoldEnd,
    openStationByType,
    handleEnterStationTest,
    handlePreviewOutcomePopup,
    handleStartStationTestTask,
    handleCompleteStationTestTask,
    handleRequestCloseActiveStation,
    handleTimeStationExpired,
    handleQuizFailed,
    handleStartPendingQuiz,
    handleStartPendingTime,
    handleConfirmTimedCloseFail,
  };
}

export type ExpeditionStageOverlayFlow = ReturnType<typeof useExpeditionStageOverlayFlow>;
