import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Keyboard, Platform, Pressable, Text, View, useAnimatedValue } from "react-native";
import { SvgUri } from "react-native-svg";
import { useUiLanguage } from "../../../i18n";
import { EXPEDITION_THEME, getExpeditionThemeMode } from "../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../shared/layout/use-adaptive-layout";
import { MOBILE_UX_TOKENS } from "../../../../shared/ui/ux-tokens";
import { AutoScrollingBox } from "../../../../shared/ui/auto-scrolling-box";
import { CodeStationPanel } from "./station-panels/code-station-panel";
import { MiniSudokuKeypadSection } from "./station-panels/mini-sudoku-station-panel";
import { usePhotoTaskCapture, PhotoTaskStatusText } from "./station-panels/photo-task-station-panel";
import {
  useQrHuntScan,
  QrHuntProgressDots,
  QR_HUNT_DESCRIPTION_RESERVE,
} from "./station-panels/qr-hunt-station-panel";
import { InlineQrScanner } from "../qr-scanner-overlay";
import type { MastermindAttempt } from "./station-panels/mastermind-station-panel";
import { StationMediaPanel } from "./station-panels/station-media-panel";
import { SimonMistakesRow } from "./station-panels/simon-station-panel";
import { MemoryPairsRow } from "./station-panels/memory-station-panel";
import { QuizOutcomePopupPanel, type QuizOutcomePopup } from "./station-panels/quiz-outcome-popup-panel";
import { resolveStationQuizPrompt } from "./station-panels/quiz-audio-station-panel";
import { StationQuizTaskWrapper, useStationPanelLayout } from "./station-panels/shared-ui";
import { resolveStationPresentationProfile } from "./station-panels/station-presentation-profile";
import {
  buildStationInteractionContext,
  buildStationMediaContext,
  resolveStationDefinition,
} from "./station-panels/station-registry";
import { useAudioQuizPlayback } from "./station-panels/use-audio-quiz-playback";
import { useSimonAudio } from "./station-panels/use-simon-audio";
import { useStationCountdownPulse } from "./station-panels/use-station-countdown-pulse";
import { useStationCompletionStopwatch } from "./station-panels/use-station-completion-stopwatch";
import { submitTrueFalseController } from "./station-panels/station-controllers";
import { createStationPreviewActions } from "./station-panels/use-station-preview-actions";
import { useStationOverlayReset } from "./station-panels/use-station-overlay-reset";
import { buildStationPreviewModel } from "./station-panels/use-station-preview-model";
import { useStationTimeoutOutcome } from "./station-panels/use-station-timeout-outcome";
import type { WordleAttempt } from "./station-panels/wordle-station-panel";
import type {
  StationPreviewOverlayProps,
  StationTestViewModel,
} from "./types";

import {
  type ChallengeDifficulty,
  type MemoryCard,
  normalizeWordleSecret,
  resolvePuzzleSecret,
  resolveSimonSequence,
} from "./puzzle-helpers";
import {
  STATION_PREVIEW_TEXT,
  type StationPreviewText,
} from "./station-preview-text";

const QR_HUNT_WATERMARK_ICON_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/outline/qrcode.svg";
// Matches the success color used by code-station-panel.tsx for its "correct code" feedback.
const QR_HUNT_SCAN_SUCCESS_COLOR = "#34d399";
// Neutral (not error, not success) — for "you already scanned this code" feedback.
// Read through the theme rather than pinned to a hex, so it follows whichever
// palette family the screen is running (expedition green vs risk navy/gold).
const getQrHuntScanNeutralColor = () => EXPEDITION_THEME.accent;
const WORDLE_REVEAL_CELL_DELAY_MS = 340;
const WORDLE_REVEAL_FINISH_BUFFER_MS = 110;
const TIMEOUT_POPUP_AUTO_CLOSE_SECONDS = 10;
const SIMON_INITIAL_SEQUENCE_LENGTH = 3;
const SIMON_MAX_MISTAKES = 3;
const SIMON_PLAY_STEP_MS = 420;
const SIMON_PAUSE_BETWEEN_STEPS_MS = 170;
const SIMON_SEQUENCE_START_DELAY_MS = 650;
const SIMON_INPUT_HIGHLIGHT_MS = 220;
const SIMON_TONE_ASSET_BY_BUTTON: Record<string, number> = {
  "1": require("./assets/simon-tones/1.wav"),
  "2": require("./assets/simon-tones/2.wav"),
  "3": require("./assets/simon-tones/3.wav"),
  "4": require("./assets/simon-tones/4.wav"),
  "5": require("./assets/simon-tones/5.wav"),
  "6": require("./assets/simon-tones/6.wav"),
  "7": require("./assets/simon-tones/7.wav"),
  "8": require("./assets/simon-tones/8.wav"),
  "9": require("./assets/simon-tones/9.wav"),
};

export function resolveSuccessOutcomeMessage(
  station: StationTestViewModel,
  text: StationPreviewText,
) {
  return text[resolveStationDefinition(station.stationType).outcome.success];
}

export function resolveFailureOutcomeMessage(
  station: StationTestViewModel,
  text: StationPreviewText,
) {
  return text[resolveStationDefinition(station.stationType).outcome.failure];
}




export function StationPreviewOverlay({
  station: stationProp,
  onClose,
  onRequestClose,
  onCompleteTask,
  onSubmitPhotoTask,
  onSubmitReviewedAnswer,
  onSubmitQrScan,
  onQuizFailed,
  onQuizPassed,
  onTimeExpired,
  timedStationPointsDecayEnabled = false,
  languageFlag,
  showLanguageButton = false,
  onOpenLanguagePicker,
  presentation = "overlay",
  compactMedia = false,
}: StationPreviewOverlayProps) {
  const isInlinePresentation = presentation === "inline";
  const adaptiveLayout = useAdaptiveLayout();
  const stationPanelLayout = useStationPanelLayout();
  const uiLanguage = useUiLanguage();
  const text = STATION_PREVIEW_TEXT[uiLanguage];
  const { height: viewportHeight, width: viewportWidth } = adaptiveLayout;
  const isTabletOverlay = adaptiveLayout.isTablet;
  const isLightTheme = getExpeditionThemeMode() === "light";
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Całe chrome podglądu — przyciemnienie, ramka, karta, nagłówek — czytane z
  // jednego profilu zamiast z kilkudziesięciu `isInlinePresentation ? … : …`
  // rozsypanych po tym pliku. Zwykły const, nie useMemo: to czysta funkcja
  // liczona raz na render, dokładnie jak liczone tu były te ternary.
  const presentationProfile = resolveStationPresentationProfile({
    mode: presentation,
    isTablet: isTabletOverlay,
    isLightTheme,
    viewportWidth: adaptiveLayout.width,
    keyboardHeight,
    scaled: adaptiveLayout.s,
  });
  useEffect(() => {
    // KeyboardAvoidingView measures its own on-screen position to compute
    // its padding, but that measurement breaks under an animated ancestor
    // with a `transform` (this overlay's slide-in translateY) — the
    // measurement is taken pre-transform and the view ends up not moving at
    // all. Tracking the raw keyboard height ourselves and applying it as a
    // plain style value sidesteps that measurement entirely.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [wordleInput, setWordleInput] = useState("");
  const [wordleAttempts, setWordleAttempts] = useState<WordleAttempt[]>([]);
  const [wordleResult, setWordleResult] = useState<string | null>(null);
  const [wordleRevealedCellCounts, setWordleRevealedCellCounts] = useState<number[]>([]);
  const [isWordleRevealAnimating, setIsWordleRevealAnimating] = useState(false);
  const [hangmanGuessedLetters, setHangmanGuessedLetters] = useState<string[]>([]);
  const [hangmanMisses, setHangmanMisses] = useState<string[]>([]);
  const [, setHangmanResult] = useState<string | null>(null);
  const [mastermindInput, setMastermindInput] = useState("");
  const [mastermindAttempts, setMastermindAttempts] = useState<MastermindAttempt[]>([]);
  const [, setMastermindResult] = useState<string | null>(null);
  const [selectedMastermindDifficulty, setSelectedMastermindDifficulty] = useState<ChallengeDifficulty | null>(null);
  const [anagramInput, setAnagramInput] = useState("");
  const [anagramAttempts, setAnagramAttempts] = useState(0);
  const [anagramResult, setAnagramResult] = useState<string | null>(null);
  const [caesarInput, setCaesarInput] = useState("");
  const [caesarAttempts, setCaesarAttempts] = useState(0);
  const [caesarResult, setCaesarResult] = useState<string | null>(null);
  const [memoryDeck, setMemoryDeck] = useState<MemoryCard[]>([]);
  const [memorySelection, setMemorySelection] = useState<string[]>([]);
  const [, setMemoryResult] = useState<string | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [simonInput, setSimonInput] = useState<string[]>([]);
  const [simonTargetLength, setSimonTargetLength] = useState(SIMON_INITIAL_SEQUENCE_LENGTH);
  const [simonMistakes, setSimonMistakes] = useState(0);
  const [simonActivePlaybackButtonId, setSimonActivePlaybackButtonId] = useState<string | null>(null);
  const [simonActiveInputButtonId, setSimonActiveInputButtonId] = useState<string | null>(null);
  const [isSimonPlaybackActive, setIsSimonPlaybackActive] = useState(false);
  const [isSimonSequenceStarted, setIsSimonSequenceStarted] = useState(false);
  const [, setSimonResult] = useState<string | null>(null);
  const [rebusInput, setRebusInput] = useState("");
  const [rebusAttempts, setRebusAttempts] = useState(0);
  const [rebusResult, setRebusResult] = useState<string | null>(null);
  const [openQuizInput, setOpenQuizInput] = useState("");
  const [openQuizAttempts, setOpenQuizAttempts] = useState(0);
  const [openQuizResult, setOpenQuizResult] = useState<string | null>(null);
  // Parallel to the station's statements; null until the team marks one.
  const [trueFalseSelections, setTrueFalseSelections] = useState<(boolean | null)[]>([]);
  const [trueFalseResult, setTrueFalseResult] = useState<string | null>(null);
  const [isSubmittingTrueFalse, setIsSubmittingTrueFalse] = useState(false);
  const [reviewedAnswerInput, setReviewedAnswerInput] = useState("");
  const [isSubmittingReviewedAnswer, setIsSubmittingReviewedAnswer] = useState(false);
  // Terminal once true: a reviewed-answer card cannot be retried, so the panel
  // swaps to "waiting for the Game Master" and stays there for this visit.
  const [hasSubmittedReviewedAnswer, setHasSubmittedReviewedAnswer] = useState(false);
  const [reviewedAnswerError, setReviewedAnswerError] = useState<string | null>(null);
  const [boggleInput, setBoggleInput] = useState("");
  const [boggleSelectedCellPath, setBoggleSelectedCellPath] = useState<number[]>([]);
  const [boggleAttempts, setBoggleAttempts] = useState(0);
  const [boggleResult, setBoggleResult] = useState<string | null>(null);
  const [miniSudokuValues, setMiniSudokuValues] = useState<string[]>(
    Array.from({ length: 81 }, () => ""),
  );
  const [miniSudokuResult, setMiniSudokuResult] = useState<string | null>(null);
  const [miniSudokuActiveCellIndex, setMiniSudokuActiveCellIndex] = useState<number | null>(null);
  const [selectedMiniSudokuDifficulty, setSelectedMiniSudokuDifficulty] = useState<ChallengeDifficulty | null>(null);
  const [matchingConnections, setMatchingConnections] = useState<Record<string, string>>({});
  const [matchingAttempts, setMatchingAttempts] = useState(0);
  const [matchingResult, setMatchingResult] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeResult, setCodeResult] = useState<string | null>(null);
  const [quizSubmitError, setQuizSubmitError] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [quizIconLoadFailed, setQuizIconLoadFailed] = useState(false);
  const [isSubmittingQuizAnswer, setIsSubmittingQuizAnswer] = useState(false);
  const [isSubmittingWordleGuess, setIsSubmittingWordleGuess] = useState(false);
  const [isSubmittingHangmanGuess, setIsSubmittingHangmanGuess] = useState(false);
  const [isSubmittingMastermindGuess, setIsSubmittingMastermindGuess] = useState(false);
  const [isSubmittingAnagram, setIsSubmittingAnagram] = useState(false);
  const [isSubmittingCaesar, setIsSubmittingCaesar] = useState(false);
  const [isSubmittingMemory, setIsSubmittingMemory] = useState(false);
  const [isSubmittingSimon, setIsSubmittingSimon] = useState(false);
  const [isSubmittingRebus, setIsSubmittingRebus] = useState(false);
  const [isSubmittingOpenQuiz, setIsSubmittingOpenQuiz] = useState(false);
  const [isSubmittingBoggle, setIsSubmittingBoggle] = useState(false);
  const [isSubmittingMiniSudoku, setIsSubmittingMiniSudoku] = useState(false);
  const [isSubmittingMatching, setIsSubmittingMatching] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isCodeInputInvalid, setIsCodeInputInvalid] = useState(false);
  const [isCodeInputSuccess, setIsCodeInputSuccess] = useState(false);
  const [wordleKeyboardContainerWidth, setWordleKeyboardContainerWidth] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [displayedStation, setDisplayedStation] = useState<StationTestViewModel | null>(stationProp);
  const [isOverlayMounted, setIsOverlayMounted] = useState(Boolean(stationProp));
  const [quizOutcomePopup, setQuizOutcomePopup] = useState<QuizOutcomePopup | null>(null);
  const [timeoutPopupSecondsLeft, setTimeoutPopupSecondsLeft] = useState<number | null>(null);
  const overlaySlideAnimation = useAnimatedValue(stationProp ? 1 : 0);
  const quizFeedbackAnimation = useAnimatedValue(0);
  const timerPulseAnimation = useAnimatedValue(0);
  const codeInputShakeAnimation = useAnimatedValue(0);
  const codeInputResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeInputSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simonPlaybackRunRef = useRef(0);
  const simonInputHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const memoryHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousBoggleTargetWordRef = useRef<string | null>(null);
  const wordleRevealTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timeoutPopupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quizOutcomeActionRef = useRef<(() => void) | null>(null);
  const previousStatusByStationIdRef = useRef<Record<string, StationTestViewModel["status"]>>({});
  const quizOptions = useMemo(
    () =>
      displayedStation?.quizAnswers ?? text.fallbackQuizOptions,
    [displayedStation?.quizAnswers, text.fallbackQuizOptions],
  );
  const clearWordleRevealTimeouts = useCallback(() => {
    wordleRevealTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    wordleRevealTimeoutsRef.current = [];
  }, []);
  const runWordleRevealSequence = useCallback(
    (attemptIndex: number, revealLength: number) =>
      new Promise<void>((resolve) => {
        if (revealLength <= 0) {
          setIsWordleRevealAnimating(false);
          resolve();
          return;
        }

        clearWordleRevealTimeouts();
        setIsWordleRevealAnimating(true);
        for (let columnIndex = 0; columnIndex < revealLength; columnIndex += 1) {
          const timeoutId = setTimeout(() => {
            setWordleRevealedCellCounts((current) => {
              const next = [...current];
              if (next.length <= attemptIndex) {
                next.length = attemptIndex + 1;
              }
              const alreadyRevealed = next[attemptIndex] ?? 0;
              next[attemptIndex] = Math.max(alreadyRevealed, columnIndex + 1);
              return next;
            });
          }, columnIndex * WORDLE_REVEAL_CELL_DELAY_MS);
          wordleRevealTimeoutsRef.current.push(timeoutId);
        }

        const finalizeTimeoutId = setTimeout(() => {
          setIsWordleRevealAnimating(false);
          clearWordleRevealTimeouts();
          resolve();
        }, revealLength * WORDLE_REVEAL_CELL_DELAY_MS + WORDLE_REVEAL_FINISH_BUFFER_MS);
        wordleRevealTimeoutsRef.current.push(finalizeTimeoutId);
      }),
    [clearWordleRevealTimeouts],
  );
  const clearTimeoutPopupCountdown = useCallback(() => {
    if (timeoutPopupIntervalRef.current) {
      clearInterval(timeoutPopupIntervalRef.current);
      timeoutPopupIntervalRef.current = null;
    }
    setTimeoutPopupSecondsLeft(null);
  }, []);
  const showQuizOutcomePopup = useCallback(
    (variant: QuizOutcomePopup["variant"], message: string, onDismiss?: () => void) => {
      Keyboard.dismiss();
      if (variant !== "timeout") {
        clearTimeoutPopupCountdown();
      }
      quizOutcomeActionRef.current = onDismiss ?? onClose;
      setQuizOutcomePopup({
        variant,
        message,
      });
    },
    [clearTimeoutPopupCountdown, onClose],
  );
  const closeQuizOutcomePopup = useCallback(() => {
    const onDismiss = quizOutcomeActionRef.current ?? onClose;
    quizOutcomeActionRef.current = null;
    clearTimeoutPopupCountdown();
    setQuizOutcomePopup(null);
    onDismiss?.();
  }, [clearTimeoutPopupCountdown, onClose]);

  useEffect(() => {
    const stationId = displayedStation?.stationId;
    if (!stationId) {
      return;
    }

    const currentStatus = displayedStation.status;
    const previousStatus = previousStatusByStationIdRef.current[stationId];
    previousStatusByStationIdRef.current[stationId] = currentStatus;

    const stationSeenBefore = previousStatus !== undefined;
    const transitionedToDone = stationSeenBefore && previousStatus !== "done" && currentStatus === "done";
    const transitionedToFailed =
      stationSeenBefore && previousStatus !== "failed" && previousStatus !== "done" && currentStatus === "failed";

    if (transitionedToDone && quizOutcomePopup?.variant !== "success") {
      const baseMessage = resolveSuccessOutcomeMessage(displayedStation, text);
      const bonusSuffix = displayedStation.fastestBonusPoints
        ? text.fastestBonusEarnedSuffix(displayedStation.fastestBonusPoints)
        : "";
      showQuizOutcomePopup("success", `${baseMessage}${bonusSuffix}`);
      return;
    }

    if (
      transitionedToFailed &&
      quizOutcomePopup?.variant !== "failed" &&
      quizOutcomePopup?.variant !== "timeout"
    ) {
      showQuizOutcomePopup("failed", resolveFailureOutcomeMessage(displayedStation, text));
    }
  }, [displayedStation, quizOutcomePopup?.variant, showQuizOutcomePopup, text]);
  const {
    audioLoadError,
    isAudioLoading,
    isAudioPlaying,
    hasAudioPlaybackStarted,
    resetAudioPlaybackState,
    handlePlayAudio,
    handleStopAudio,
  } = useAudioQuizPlayback({
    stationType: displayedStation?.stationType,
    quizAudioUrl: displayedStation?.quizAudioUrl,
    text: {
      audioSourceMissing: text.audioSourceMissing,
      audioLoadFailed: text.audioLoadFailed,
      audioPlayFailed: text.audioPlayFailed,
    },
  });
  const {
    prepareSimonAudio,
    playSequenceTone,
    playInputTone,
    startSequenceRun,
    stopSequenceAudio,
    stopAllSimonAudio,
    releaseSimonAudio,
  } = useSimonAudio({
    toneAssetByButton: SIMON_TONE_ASSET_BY_BUTTON,
  });
  const clearSimonInputHighlight = useCallback(() => {
    if (!simonInputHighlightTimeoutRef.current) {
      return;
    }
    clearTimeout(simonInputHighlightTimeoutRef.current);
    simonInputHighlightTimeoutRef.current = null;
  }, []);
  const stopSimonPlayback = useCallback(() => {
    simonPlaybackRunRef.current += 1;
    clearSimonInputHighlight();
    stopAllSimonAudio();
    setSimonActivePlaybackButtonId(null);
    setSimonActiveInputButtonId(null);
    setIsSimonPlaybackActive(false);
  }, [clearSimonInputHighlight, stopAllSimonAudio]);
  const playSimonSequence = useCallback(
    async (sequence: string[]) => {
      if (!sequence.length) {
        stopSimonPlayback();
        return;
      }

      const runId = startSequenceRun();
      simonPlaybackRunRef.current = runId;
      setIsSimonPlaybackActive(true);
      setSimonActivePlaybackButtonId(null);
      setSimonActiveInputButtonId(null);
      setSimonInput([]);

      const wait = (durationMs: number) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, durationMs);
        });

      await wait(SIMON_SEQUENCE_START_DELAY_MS);
      if (simonPlaybackRunRef.current !== runId) {
        return;
      }

      for (const buttonId of sequence) {
        if (simonPlaybackRunRef.current !== runId) {
          return;
        }
        setSimonActivePlaybackButtonId(buttonId);
        await playSequenceTone(buttonId, runId);
        await wait(SIMON_PLAY_STEP_MS);
        stopSequenceAudio();

        if (simonPlaybackRunRef.current !== runId) {
          return;
        }
        setSimonActivePlaybackButtonId(null);
        await wait(SIMON_PAUSE_BETWEEN_STEPS_MS);
      }

      if (simonPlaybackRunRef.current !== runId) {
        return;
      }
      setSimonActivePlaybackButtonId(null);
      setIsSimonPlaybackActive(false);
    },
    [playSequenceTone, startSequenceRun, stopSequenceAudio, stopSimonPlayback],
  );
  useEffect(() => {
    if (stationProp) {
      setDisplayedStation((current) => {
        if (
          current &&
          current.stationId === stationProp.stationId &&
          current.status === stationProp.status &&
          current.startedAt === stationProp.startedAt &&
          current.quizFailed === stationProp.quizFailed &&
          current.timeLimitSeconds === stationProp.timeLimitSeconds &&
          current.points === stationProp.points &&
          current.qrScanCompletedCount === stationProp.qrScanCompletedCount &&
          current.qrScanRequiredCount === stationProp.qrScanRequiredCount &&
          // Also compare the localized content fields, otherwise switching the
          // content language while a station is open keeps showing whatever was
          // displayed when the overlay first opened — the app chrome (buttons,
          // labels) updates immediately since that's driven by uiLanguage, but
          // the station's own name/description/quiz stayed pinned to this stale
          // snapshot.
          current.name === stationProp.name &&
          current.description === stationProp.description &&
          current.quizQuestion === stationProp.quizQuestion &&
          current.quizCorrectAnswerIndex === stationProp.quizCorrectAnswerIndex &&
          current.quizAudioUrl === stationProp.quizAudioUrl &&
          JSON.stringify(current.quizAnswers) === JSON.stringify(stationProp.quizAnswers) &&
          JSON.stringify(current.quizAcceptedAnswers) === JSON.stringify(stationProp.quizAcceptedAnswers)
        ) {
          return current;
        }

        return stationProp;
      });
      setIsOverlayMounted((current) => (current ? current : true));
      overlaySlideAnimation.stopAnimation();
      Animated.timing(overlaySlideAnimation, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
      return;
    }

    overlaySlideAnimation.stopAnimation();
    Animated.timing(overlaySlideAnimation, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsOverlayMounted(false);
        setDisplayedStation(null);
      }
    });
  }, [
    overlaySlideAnimation,
    stationProp,
    stationProp?.points,
    stationProp?.quizFailed,
    stationProp?.qrScanCompletedCount,
    stationProp?.qrScanRequiredCount,
    stationProp?.startedAt,
    stationProp?.stationId,
    stationProp?.status,
    stationProp?.timeLimitSeconds,
  ]);

  useEffect(() => {
    if (!displayedStation || displayedStation.stationType !== "mastermind") {
      setSelectedMastermindDifficulty(null);
      return;
    }

    setSelectedMastermindDifficulty(
      displayedStation.challengeDifficultyMode === "player"
        ? null
        : displayedStation.challengeDifficulty ?? "medium",
    );
  }, [displayedStation]);

  useEffect(() => {
    if (!displayedStation || displayedStation.stationType !== "mini-sudoku") {
      setSelectedMiniSudokuDifficulty(null);
      return;
    }

    setSelectedMiniSudokuDifficulty(
      displayedStation.challengeDifficultyMode === "player"
        ? null
        : displayedStation.challengeDifficulty ?? "medium",
    );
  }, [displayedStation]);

  useStationOverlayReset({
    displayedStation,
    stationResetKey: displayedStation?.stationId ?? null,
    clearTimeoutPopupCountdown,
    clearWordleRevealTimeouts,
    resetAudioPlaybackState,
    stopSimonPlayback,
    quizFeedbackAnimation,
    timerPulseAnimation,
    codeInputShakeAnimation,
    codeInputResetTimeoutRef,
    codeInputSuccessTimeoutRef,
    timerPulseLoopRef,
    memoryHideTimeoutRef,
    setSelectedQuizOption,
    setQuizResult,
    setWordleInput,
    setWordleAttempts,
    setWordleResult,
    setWordleRevealedCellCounts,
    setIsWordleRevealAnimating,
    setHangmanGuessedLetters,
    setHangmanMisses,
    setHangmanResult,
    setMastermindInput,
    setMastermindAttempts,
    setMastermindResult,
    setAnagramInput,
    setAnagramAttempts,
    setAnagramResult,
    setCaesarInput,
    setCaesarAttempts,
    setCaesarResult,
    setMemoryDeck,
    setMemorySelection,
    setMemoryResult,
    setMemoryBusy,
    setSimonInput,
    setSimonTargetLength,
    setSimonMistakes,
    setSimonActivePlaybackButtonId,
    setIsSimonPlaybackActive,
    setSimonResult,
    setRebusInput,
    setRebusAttempts,
    setRebusResult,
    setOpenQuizInput,
    setOpenQuizAttempts,
    setOpenQuizResult,
    setTrueFalseSelections,
    setTrueFalseResult,
    setReviewedAnswerInput,
    setHasSubmittedReviewedAnswer,
    setReviewedAnswerError,
    setBoggleInput,
    setBoggleSelectedCellPath,
    setBoggleAttempts,
    setBoggleResult,
    setMiniSudokuValues,
    setMiniSudokuResult,
    setMiniSudokuActiveCellIndex,
    setMatchingConnections,
    setMatchingAttempts,
    setMatchingResult,
    setVerificationCode,
    setCodeResult,
    setQuizSubmitError,
    setImageLoadFailed,
    setQuizIconLoadFailed,
    setIsSubmittingQuizAnswer,
    setIsSubmittingWordleGuess,
    setIsSubmittingHangmanGuess,
    setIsSubmittingMastermindGuess,
    setIsSubmittingAnagram,
    setIsSubmittingCaesar,
    setIsSubmittingMemory,
    setIsSubmittingSimon,
    setIsSubmittingRebus,
    setIsSubmittingOpenQuiz,
    setIsSubmittingBoggle,
    setIsSubmittingMiniSudoku,
    setIsSubmittingMatching,
    setIsSubmittingCode,
    setIsCodeInputInvalid,
    setIsCodeInputSuccess,
    setNowMs,
  });

  useEffect(() => {
    if (quizOutcomePopup?.variant !== "timeout") {
      clearTimeoutPopupCountdown();
      return;
    }

    if (timeoutPopupIntervalRef.current) {
      clearInterval(timeoutPopupIntervalRef.current);
    }
    setTimeoutPopupSecondsLeft(TIMEOUT_POPUP_AUTO_CLOSE_SECONDS);
    timeoutPopupIntervalRef.current = setInterval(() => {
      setTimeoutPopupSecondsLeft((current) => {
        if (current === null) {
          return null;
        }
        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => {
      if (timeoutPopupIntervalRef.current) {
        clearInterval(timeoutPopupIntervalRef.current);
        timeoutPopupIntervalRef.current = null;
      }
    };
  }, [clearTimeoutPopupCountdown, quizOutcomePopup?.variant]);

  useEffect(() => {
    if (quizOutcomePopup?.variant !== "timeout" || timeoutPopupSecondsLeft !== 0) {
      return;
    }
    closeQuizOutcomePopup();
  }, [closeQuizOutcomePopup, quizOutcomePopup?.variant, timeoutPopupSecondsLeft]);

  useEffect(() => {
    if (!displayedStation || displayedStation.stationType !== "simon") {
      stopSimonPlayback();
      setIsSimonSequenceStarted(false);
      return;
    }

    const sequence = resolveSimonSequence(displayedStation);
    const initialLength = Math.max(
      1,
      Math.min(SIMON_INITIAL_SEQUENCE_LENGTH, sequence.length),
    );
    setSimonInput([]);
    setSimonMistakes(0);
    setSimonTargetLength(initialLength);
    setSimonResult(null);
    // Wait for the player to tap Start (see handleStartSimonSequence) instead
    // of auto-playing the first sequence the moment the station opens.
    setIsSimonSequenceStarted(false);

    return () => {
      stopSimonPlayback();
    };
  }, [displayedStation, stopSimonPlayback]);

  const handleStartSimonSequence = useCallback(() => {
    if (!displayedStation || displayedStation.stationType !== "simon" || isSimonSequenceStarted) {
      return;
    }

    setIsSimonSequenceStarted(true);
    const sequence = resolveSimonSequence(displayedStation);
    const initialLength = Math.max(1, Math.min(SIMON_INITIAL_SEQUENCE_LENGTH, sequence.length));
    void prepareSimonAudio().then(() => {
      void playSimonSequence(sequence.slice(0, initialLength));
    });
  }, [displayedStation, isSimonSequenceStarted, playSimonSequence, prepareSimonAudio]);

  useEffect(() => {
    return () => {
      if (codeInputResetTimeoutRef.current) {
        clearTimeout(codeInputResetTimeoutRef.current);
        codeInputResetTimeoutRef.current = null;
      }
      if (codeInputSuccessTimeoutRef.current) {
        clearTimeout(codeInputSuccessTimeoutRef.current);
        codeInputSuccessTimeoutRef.current = null;
      }
      if (memoryHideTimeoutRef.current) {
        clearTimeout(memoryHideTimeoutRef.current);
        memoryHideTimeoutRef.current = null;
      }
      stopSimonPlayback();
      releaseSimonAudio();
      clearWordleRevealTimeouts();
      clearTimeoutPopupCountdown();
      quizOutcomeActionRef.current = null;
    };
  }, [clearTimeoutPopupCountdown, clearWordleRevealTimeouts, releaseSimonAudio, stopSimonPlayback]);

  const { remainingTimeSeconds, finalTenSecondsProgress } = useStationCountdownPulse({
    station: displayedStation,
    isOverlayMounted,
    nowMs,
    setNowMs,
    timerPulseAnimation,
    timerPulseLoopRef,
  });

  const { elapsedTimeSeconds } = useStationCompletionStopwatch({
    station: displayedStation,
    isOverlayMounted,
    nowMs,
    setNowMs,
  });

  useStationTimeoutOutcome({
    station: displayedStation,
    remainingTimeSeconds,
    isSubmittingCode,
    pendingByType: {
      quiz: isSubmittingQuizAnswer,
      wordle: isSubmittingWordleGuess,
      hangman: isSubmittingHangmanGuess,
      mastermind: isSubmittingMastermindGuess,
      anagram: isSubmittingAnagram,
      caesar: isSubmittingCaesar,
      memory: isSubmittingMemory,
      simon: isSubmittingSimon,
      rebus: isSubmittingRebus,
      boggle: isSubmittingBoggle,
      miniSudoku: isSubmittingMiniSudoku,
      matching: isSubmittingMatching,
      strongPassword: false,
      openQuiz: isSubmittingOpenQuiz,
      reviewedAnswer: isSubmittingReviewedAnswer || hasSubmittedReviewedAnswer,
      trueFalse: isSubmittingTrueFalse,
    },
    onQuizFailed,
    onTimeExpired,
    showQuizOutcomePopup,
    text: {
      timeoutWordle: text.timeoutWordle,
      timeoutHangman: text.timeoutHangman,
      timeoutMastermind: text.timeoutMastermind,
      timeoutAnagram: text.timeoutAnagram,
      timeoutCaesar: text.timeoutCaesar,
      timeoutMemory: text.timeoutMemory,
      timeoutSimon: text.timeoutSimon,
      timeoutRebus: text.timeoutRebus,
      timeoutBoggle: text.timeoutBoggle,
      timeoutMiniSudoku: text.timeoutMiniSudoku,
      timeoutMatching: text.timeoutMatching,
      timeoutQuiz: text.timeoutQuiz,
      timeoutCodeTask: text.timeoutCodeTask,
    },
  });

  const wordleSecretForInputReset =
    displayedStation?.stationType === "wordle" ? resolvePuzzleSecret(displayedStation, "wordle") : "";
  const wordleLengthForInputReset = Array.from(wordleSecretForInputReset).length;
  const wordleDisplayLengthForTracking = Math.max(1, wordleLengthForInputReset || 5);
  const normalizedWordleInputForReset = normalizeWordleSecret(wordleInput).slice(0, wordleLengthForInputReset || 32);
  useEffect(() => {
    if (wordleResult !== null) {
      setWordleResult(null);
    }
    if (quizSubmitError !== null) {
      setQuizSubmitError(null);
    }
  }, [normalizedWordleInputForReset, quizSubmitError, wordleResult]);
  useEffect(() => {
    if (!wordleAttempts.length) {
      if (wordleRevealedCellCounts.length > 0) {
        setWordleRevealedCellCounts([]);
      }
      return;
    }

    setWordleRevealedCellCounts((current) => {
      const next = current.slice(0, wordleAttempts.length);
      while (next.length < wordleAttempts.length) {
        next.push(wordleDisplayLengthForTracking);
      }
      return next;
    });
  }, [wordleAttempts.length, wordleDisplayLengthForTracking, wordleRevealedCellCounts.length]);

  const photoTaskCapture = usePhotoTaskCapture(
    displayedStation,
    onSubmitPhotoTask,
    () => {
      showQuizOutcomePopup("pending", text.pendingReviewPopupMessage);
    },
    // Ryzykanci (inline): the viewfinder is live as soon as the card opens.
    { autoOpenCapture: presentationProfile.behavior.autoOpenPhotoCapture },
  );
  const qrHuntScan = useQrHuntScan(displayedStation, onSubmitQrScan);

  if (!isOverlayMounted || !displayedStation) {
    return null;
  }
  const station = displayedStation;
  const dynamicAvailablePoints = (() => {
    const safePoints = Math.max(0, Math.round(station.points));
    const safeLimitMs = Math.max(0, Math.round(station.timeLimitSeconds)) * 1000;
    if (!timedStationPointsDecayEnabled || safePoints === 0 || safeLimitMs <= 0 || !station.startedAt) {
      return safePoints;
    }

    const startedAtMs = new Date(station.startedAt).getTime();
    if (!Number.isFinite(startedAtMs)) {
      return safePoints;
    }

    const elapsedMs = Math.max(0, nowMs - startedAtMs);
    if (elapsedMs >= safeLimitMs) {
      return 0;
    }

    return Math.max(0, Math.round(safePoints * (1 - elapsedMs / safeLimitMs)));
  })();
  const shouldShowDynamicPoints =
    timedStationPointsDecayEnabled && station.timeLimitSeconds > 0 && Boolean(station.startedAt);
  const pointsAccentColor = isLightTheme ? "#92400e" : "#fcd34d";
  const mastermindDifficulty: ChallengeDifficulty =
    station.challengeDifficultyMode === "player"
      ? selectedMastermindDifficulty ?? station.challengeDifficulty ?? "medium"
      : station.challengeDifficulty ?? "medium";
  const miniSudokuDifficulty: ChallengeDifficulty =
    station.challengeDifficultyMode === "player"
      ? selectedMiniSudokuDifficulty ?? station.challengeDifficulty ?? "medium"
      : station.challengeDifficulty ?? "medium";
  const {
    isClassicQuizStation,
    isAudioQuizStation,
    isWordleStation,
    isHangmanStation,
    isMastermindStation,
    isAnagramStation,
    isCaesarStation,
    isMemoryStation,
    isSimonStation,
    isRebusStation,
    isOpenQuizStation,
    isBoggleStation,
    isMiniSudokuStation,
    isMatchingStation,
    isQuizStation,
    requiresCode,
    requiresPhotoUpload,
    requiresQrScan,
    isNumericCodeStation,
    shouldShowQuizFallbackGraphic,
    stationImageUri,
    hasRealStationImage,
    stationDescription,
    stationMediaHeight,
    hasTimerStarted,
    wordleSecret,
    wordleLength,
    wordleDisplayLength,
    normalizedWordleInput,
    wordleInputCharacters,
    wordleKeyStateByLetter,
    wordleKeyboardKeyGap,
    wordleInputCellGap,
    wordleInputActionGap,
    wordleBoardCellSize,
    wordleKeyboardKeyWidth,
    guessedHangmanSet,
    hangmanSecret,
    hangmanAttemptsLeft,
    mastermindSecret,
    mastermindConfig,
    normalizedMastermindInput,
    mastermindSolved,
    mastermindAttemptsLeft,
    anagramTarget,
    anagramHintWordCount,
    anagramHintLettersLayout,
    anagramScrambledWords,
    normalizedAnagramInput,
    anagramAttemptsLeft,
    caesarShiftValue,
    caesarDecoded,
    caesarMaxLength,
    normalizedCaesarInput,
    caesarAttemptsLeft,
    memoryMatchedCount,
    memoryAllMatched,
    simonSequence,
    simonRoundLength,
    simonProgress,
    rebusAnswer,
    normalizedRebusInput,
    rebusAttemptsLeft,
    openQuizAnswer,
    openQuizAcceptedAnswers,
    normalizedOpenQuizInput,
    openQuizAttemptsLeft,
    boggleTargetWord,
    boggleBoardLetters,
    boggleMaxInputLength,
    boggleBoardSide,
    normalizedBoggleInput,
    boggleAttemptsLeft,
    miniSudokuPuzzle,
    normalizedMiniSudokuValues,
    miniSudokuGridMeta,
    miniSudokuAttemptedValues,
    miniSudokuConflictIndexes,
    miniSudokuHasConflicts,
    matchingPairs,
    matchingMatchedCount,
    matchingAllMatched,
    matchingAttemptsLeft,
    matchingMatchedRightSet,
    matchingLeftOptions,
    matchingRightOptions,
    feedbackTone,
    executionTimeLabel,
    shouldShowExecutionTimer,
    isCompletionStopwatchActive,
    hasTimedLimit,
    isTimeExpired,
    isWordleInteractiveDisabled,
    isAudioOverlayControlDisabled,
    isAudioStopDisabled,
    isCodeActionDisabled,
    isInteractiveLocked,
    anagramIsActionDisabled,
    anagramIsInputLocked,
    mastermindIsActionDisabled,
    mastermindIsSymbolDisabled,
    caesarIsActionDisabled,
    rebusIsActionDisabled,
    boggleIsActionDisabled,
    miniSudokuIsActionDisabled,
    hangmanIsGuessDisabled,
    matchingIsInteractiveLocked,
    isTrueFalseStation,
    trueFalseStatements,
    trueFalseAllAnswered,
    trueFalseIsCorrect,
    trueFalseIsActionDisabled,
    timerTextColor,
    timerPulseStyle,
  } = buildStationPreviewModel({
    station,
    uiLanguage,
    viewportHeight,
    viewportWidth,
    isTabletOverlay,
    adaptiveScale: adaptiveLayout.s,
    imageLoadFailed,
    selectedQuizOption,
    wordleInput,
    wordleAttempts,
    wordleRevealedCellCounts,
    wordleKeyboardContainerWidth,
    isWordleRevealAnimating,
    hangmanGuessedLetters,
    hangmanMisses,
    mastermindInput,
    mastermindAttempts,
    mastermindDifficulty,
    miniSudokuDifficulty,
    anagramInput,
    anagramAttempts,
    caesarInput,
    caesarAttempts,
    memoryDeck,
    simonTargetLength,
    simonInput,
    rebusInput,
    rebusAttempts,
    openQuizInput,
    openQuizAttempts,
    boggleInput,
    boggleAttempts,
    miniSudokuValues,
    miniSudokuResult,
    matchingConnections,
    matchingAttempts,
    trueFalseSelections,
    isSubmittingTrueFalse,
    remainingTimeSeconds,
    elapsedTimeSeconds,
    finalTenSecondsProgress,
    timerPulseAnimation,
    isSubmittingQuizAnswer,
    isSubmittingWordleGuess,
    isSubmittingHangmanGuess,
    isSubmittingMastermindGuess,
    isSubmittingAnagram,
    isSubmittingCaesar,
    isSubmittingMemory,
    isSubmittingSimon,
    isSubmittingRebus,
    isSubmittingOpenQuiz,
    isSubmittingBoggle,
    isSubmittingMiniSudoku,
    isSubmittingMatching,
    isSubmittingCode,
    isCodeInputSuccess,
    isAudioLoading,
    isAudioPlaying,
    hasAudioPlaybackStarted,
    text: {
      miniSudokuIncorrect: text.miniSudokuIncorrect,
    },
  });

  // The Boggle target word (and therefore the board's letter layout) is
  // re-derived from the translated answer text whenever the content language
  // changes, while the station itself stays the same — so the normal
  // per-station reset (keyed only by station id) never fires here. A
  // selection built against the previous language's board no longer points
  // at the same letters on the new one, so clear it in lockstep with the
  // target word change. Adjusted during render (not in an effect) so the
  // stale board never gets a chance to paint. The ref itself is declared
  // unconditionally near the component's other refs (above the early
  // `return null`); only this comparison — plain JS, not a hook call — is
  // skipped when that early return fires, which rules-of-hooks allows.
  if (previousBoggleTargetWordRef.current !== boggleTargetWord) {
    previousBoggleTargetWordRef.current = boggleTargetWord;
    setBoggleInput("");
    setBoggleSelectedCellPath([]);
    setBoggleAttempts(0);
    setBoggleResult(null);
  }

  const {
    submitVerificationCode,
    submitWordleGuess,
    submitQuizAnswer,
    submitHangmanGuess,
    submitMastermindGuess,
    submitAnagram,
    submitCaesar,
    handleMemoryCardPress,
    handleSimonPress,
    submitRebus,
    submitOpenQuiz,
    handleOpenQuizInputChange,
    submitBoggle,
    selectBoggleBoardCell,
    backspaceBoggleInput,
    handleMiniSudokuChangeCell,
    handleMiniSudokuSubmit,
    submitMatchingPair,
    handleAnagramInputChange,
    handleCaesarInputChange,
    appendCaesarCharacter,
    backspaceCaesarInput,
    handleRebusInputChange,
    handleBoggleInput,
    handleMastermindInput,
    addMastermindSymbol,
    backspaceMastermindInput,
  } = createStationPreviewActions({
    stationId: station.stationId,
    stationStatus: station.status,
    startedAt: station.startedAt,
    onCompleteTask,
    onQuizFailed,
    onQuizPassed,
    onClose,
    showQuizOutcomePopup,
    isClassicQuizStation,
    isAudioQuizStation,
    isWordleStation,
    isHangmanStation,
    isMastermindStation,
    isAnagramStation,
    isCaesarStation,
    isMemoryStation,
    isSimonStation,
    isRebusStation,
    isOpenQuizStation,
    isBoggleStation,
    isMiniSudokuStation,
    isMatchingStation,
    isInteractiveLocked,
    hasTimedLimit,
    hasTimerStarted,
    isTimeExpired,
    verificationCode,
    selectedQuizOption,
    isSubmittingQuizAnswer,
    quizCorrectAnswerIndex: station.quizCorrectAnswerIndex,
    quizFeedbackAnimation,
    wordleLength,
    wordleSecret,
    wordleDisplayLength,
    normalizedWordleInput,
    wordleAttempts,
    isSubmittingWordleGuess,
    isWordleRevealAnimating,
    guessedHangmanSet,
    hangmanMisses,
    hangmanGuessedLetters,
    hangmanSecret,
    isSubmittingHangmanGuess,
    normalizedMastermindInput,
    mastermindSecret,
    mastermindDifficulty,
    miniSudokuDifficulty,
    mastermindCodeLength: mastermindConfig.codeLength,
    mastermindMaxAttempts: mastermindConfig.maxAttempts,
    mastermindSymbols: mastermindConfig.symbols,
    mastermindSolved,
    mastermindAttemptsLeft,
    mastermindAttempts,
    isSubmittingMastermindGuess,
    normalizedAnagramInput,
    anagramTarget,
    anagramAttemptsLeft,
    anagramAttempts,
    isSubmittingAnagram,
    normalizedCaesarInput,
    caesarDecoded,
    caesarAttemptsLeft,
    caesarAttempts,
    caesarMaxLength,
    isSubmittingCaesar,
    memoryBusy,
    memoryAllMatched,
    memoryDeck,
    memorySelection,
    isSubmittingMemory,
    simonInput,
    simonRoundLength,
    simonSequence,
    simonMistakes,
    simonMaxMistakes: SIMON_MAX_MISTAKES,
    simonInputHighlightMs: SIMON_INPUT_HIGHLIGHT_MS,
    isSubmittingSimon,
    isSimonPlaybackActive,
    normalizedRebusInput,
    rebusAnswer,
    rebusAttemptsLeft,
    rebusAttempts,
    isSubmittingRebus,
    normalizedOpenQuizInput,
    openQuizAnswer,
    openQuizAcceptedAnswers,
    openQuizAttemptsLeft,
    openQuizAttempts,
    isSubmittingOpenQuiz,
    normalizedBoggleInput,
    boggleInput,
    boggleMaxInputLength,
    boggleAttemptsLeft,
    boggleBoardLetters,
    boggleTargetWord,
    boggleAttempts,
    boggleBoardSide,
    boggleSelectedCellPath,
    isSubmittingBoggle,
    hasMiniSudokuPuzzle: Boolean(miniSudokuPuzzle),
    miniSudokuGridMeta,
    miniSudokuAttemptedValues,
    miniSudokuHasConflicts,
    isSubmittingMiniSudoku,
    matchingAllMatched,
    matchingAttemptsLeft,
    matchingConnections,
    matchingMatchedRightSet,
    matchingPairs,
    matchingAttempts,
    isSubmittingMatching,
    codeInputShakeAnimation,
    codeInputResetTimeoutRef,
    memoryHideTimeoutRef,
    simonInputHighlightTimeoutRef,
    clearSimonInputHighlight,
    playSimonTone: playInputTone,
    playSimonSequence,
    runWordleRevealSequence,
    setIsCodeInputInvalid,
    setIsCodeInputSuccess,
    setCodeResult,
    setIsSubmittingCode,
    setSelectedQuizOption,
    setQuizResult,
    setQuizSubmitError,
    setIsSubmittingQuizAnswer,
    setWordleAttempts,
    setWordleRevealedCellCounts,
    setWordleInput,
    setWordleResult,
    setIsSubmittingWordleGuess,
    setHangmanResult,
    setHangmanGuessedLetters,
    setHangmanMisses,
    setIsSubmittingHangmanGuess,
    setMastermindAttempts,
    setMastermindInput,
    setMastermindResult,
    setIsSubmittingMastermindGuess,
    setAnagramInput,
    setAnagramAttempts,
    setAnagramResult,
    setIsSubmittingAnagram,
    setCaesarInput,
    setCaesarAttempts,
    setCaesarResult,
    setIsSubmittingCaesar,
    setMemoryDeck,
    setMemorySelection,
    setMemoryResult,
    setIsSubmittingMemory,
    setMemoryBusy,
    setSimonInput,
    setSimonMistakes,
    setSimonResult,
    setSimonTargetLength,
    setIsSubmittingSimon,
    setSimonActiveInputButtonId,
    setRebusInput,
    setRebusAttempts,
    setRebusResult,
    setIsSubmittingRebus,
    setOpenQuizInput,
    setOpenQuizAttempts,
    setOpenQuizResult,
    setIsSubmittingOpenQuiz,
    setBoggleInput,
    setBoggleSelectedCellPath,
    setBoggleAttempts,
    setBoggleResult,
    setIsSubmittingBoggle,
    setMiniSudokuResult,
    setMiniSudokuValues,
    setIsSubmittingMiniSudoku,
    setMatchingConnections,
    setMatchingResult,
    setIsSubmittingMatching,
    setMatchingAttempts,
    text: {
      alertErrorTitle: text.alertErrorTitle,
      codeEnter: text.codeEnter,
      codeApproved: text.codeApproved,
      wordleEnterGuess: text.wordleEnterGuess,
      wordleLengthExact: text.wordleLengthExact,
      wordleAttemptsExhausted: text.wordleAttemptsExhausted,
      wordleTryAgain: text.wordleTryAgain,
      wordleNoAttempts: text.wordleNoAttempts,
      wordleFailedPopup: text.wordleFailedPopup,
      wordleSolved: text.wordleSolved,
      wordleSolvedPopup: text.wordleSolvedPopup,
      quizCorrect: text.quizCorrect,
      quizIncorrect: text.quizIncorrect,
      quizWrongPopup: text.quizWrongPopup,
      quizSuccessPopup: text.quizSuccessPopup,
      hangmanEnterLetter: text.hangmanEnterLetter,
      hangmanLetterAlreadyChecked: text.hangmanLetterAlreadyChecked,
      hangmanNoAttempts: text.hangmanNoAttempts,
      hangmanFailedPopup: text.hangmanFailedPopup,
      hangmanMiss: text.hangmanMiss,
      hangmanSolved: text.hangmanSolved,
      hangmanSolvedPopup: text.hangmanSolvedPopup,
      mastermindInvalidCode: text.mastermindInvalidCode,
      mastermindNoAttempts: text.mastermindNoAttempts,
      mastermindFailedPopup: text.mastermindFailedPopup,
      mastermindFeedback: text.mastermindFeedback,
      mastermindSolved: text.mastermindSolved,
      mastermindSolvedPopup: text.mastermindSolvedPopup,
      anagramEnter: text.anagramEnter,
      anagramNoAttempts: text.anagramNoAttempts,
      anagramFailedPopup: text.anagramFailedPopup,
      anagramIncorrect: text.anagramIncorrect,
      anagramSolved: text.anagramSolved,
      anagramSolvedPopup: text.anagramSolvedPopup,
      caesarEnter: text.caesarEnter,
      caesarNoAttempts: text.caesarNoAttempts,
      caesarFailedPopup: text.caesarFailedPopup,
      caesarIncorrect: text.caesarIncorrect,
      caesarSolved: text.caesarSolved,
      caesarSolvedPopup: text.caesarSolvedPopup,
      memorySolved: text.memorySolved,
      memorySolvedPopup: text.memorySolvedPopup,
      memoryPairFound: text.memoryPairFound,
      memoryMiss: text.memoryMiss,
      simonWrong: text.simonWrong,
      simonFailedPopup: text.simonFailedPopup,
      simonProgress: text.simonProgress,
      simonSolved: text.simonSolved,
      simonSolvedPopup: text.simonSolvedPopup,
      rebusEnter: text.rebusEnter,
      rebusNoAttempts: text.rebusNoAttempts,
      rebusFailedPopup: text.rebusFailedPopup,
      rebusIncorrect: text.rebusIncorrect,
      rebusSolved: text.rebusSolved,
      rebusSolvedPopup: text.rebusSolvedPopup,
      openQuizEnter: text.openQuizEnter,
      openQuizNoAttempts: text.openQuizNoAttempts,
      openQuizFailedPopup: text.openQuizFailedPopup,
      openQuizIncorrect: text.openQuizIncorrect,
      openQuizSolved: text.openQuizSolved,
      openQuizSolvedPopup: text.openQuizSolvedPopup,
      boggleEnterMin: text.boggleEnterMin,
      boggleMaxLength: text.boggleMaxLength,
      boggleNoAttempts: text.boggleNoAttempts,
      boggleFailedPopup: text.boggleFailedPopup,
      boggleIncorrect: text.boggleIncorrect,
      boggleSolved: text.boggleSolved,
      boggleSolvedPopup: text.boggleSolvedPopup,
      boggleAdjacentOnly: text.boggleAdjacentOnly,
      miniSudokuIncorrect: text.miniSudokuIncorrect,
      miniSudokuFillAll: text.miniSudokuFillAll,
      miniSudokuSolved: text.miniSudokuSolved,
      miniSudokuSolvedPopup: text.miniSudokuSolvedPopup,
      matchingPairGood: text.matchingPairGood,
      matchingSolved: text.matchingSolved,
      matchingSolvedPopup: text.matchingSolvedPopup,
      matchingNoAttempts: text.matchingNoAttempts,
      matchingFailedPopup: text.matchingFailedPopup,
      matchingWrongPair: text.matchingWrongPair,
    },
  });
  const appendRebusCharacter = (character: string) => {
    if (rebusIsActionDisabled) {
      return;
    }

    setRebusInput((current) => {
      if (character === " " && (current.length === 0 || current.endsWith(" "))) {
        return current;
      }
      return `${current}${character}`;
    });
    setRebusResult(null);
    setQuizSubmitError(null);
  };
  const backspaceRebusInput = () => {
    if (rebusIsActionDisabled) {
      return;
    }

    setRebusInput((current) => current.slice(0, -1));
    setRebusResult(null);
    setQuizSubmitError(null);
  };
  const overlayBackdropStyle = {
    opacity: overlaySlideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  } as const;
  const overlayPanelStyle = {
    opacity: overlaySlideAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
    transform: [
      {
        translateY: overlaySlideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [160, 0],
        }),
      },
    ],
  } as const;
  const stationQuizPrompt = resolveStationQuizPrompt({ station, wordleLength, uiLanguage });
  // Ryzykanci: these tasks are their own visual object (the wordle grid, the
  // hangman word, the anagram tiles), so the wrapper's rounded border and
  // muted fill only draw a second box around a box. They sit straight on the
  // card instead.
  const isChromelessInlineTask =
    isInlinePresentation &&
    (isWordleStation || isHangmanStation || isAnagramStation || isCaesarStation);

  // Krzyżówki prezentacji z typem stanowiska albo ze stanem danych. Celowo NIE
  // trafiają do profilu prezentacji: profil odpowiada na pytanie "jak wygląda
  // ta prezentacja", a poniższe na "jak wygląda TEN typ w TEJ prezentacji przy
  // TYCH danych". Wciągnięte do profilu zmusiłyby go do poznania typu
  // stanowiska i przestałby być jedną decyzją. Stoją tutaj razem, żeby dało się
  // je policzyć i przeczytać naraz, zamiast wyławiać z JSX-a niżej.

  // Anagram to jeden mały obiekt (rząd kafelków nad jednoliniowym opisem) —
  // przy schowanej klawiaturze wisiałby u góry wysokiej karty z pustką pod
  // spodem. Wyśrodkuj zamiast tego kolumnę.
  const shouldCentreInlineAnagramColumn = isInlinePresentation && isAnagramStation && !compactMedia;

  // flex-1 tego wrappera zagarnia całą pozostałą wysokość — w pełnoekranowym
  // overlayu to w porządku, ale w układzie dzielonym z gospodarzem nie zostaje
  // nic dla treści zadania pod spodem, dla typów o stałej wysokości mediów.
  const shouldMediaWrapperHugContent =
    isInlinePresentation && (isOpenQuizStation || isAnagramStation);

  // Media i opis wchłaniają całą wysokość, jaka zostaje po stałym bloku
  // input/klawiatura u Ryzykantów.
  const shouldMediaWrapperAbsorbHeight = isInlinePresentation && requiresCode;

  // Zapas, żeby treść nigdy nie renderowała się pod pływającą stopką z
  // timerem i punktami. Inline stopki nie rysuje, a pozostałe typy rezerwują
  // ten zapas u siebie.
  const shouldReserveFooterClearance =
    !isInlinePresentation && !requiresCode && !isMiniSudokuStation && !isOpenQuizStation;

  // Pusta ramka mediów przy open-quiz bez zdjęcia rysowałaby u Ryzykantów
  // pudełko wokół niczego.
  const shouldHideEmptyInlineMediaBox =
    isOpenQuizStation && isInlinePresentation && !hasRealStationImage;

  // Bez zdjęcia opis jest jedyną treścią górnej części karty, więc zamiast
  // stałego sufitu wysokości dostaje tyle miejsca, ile zostało.
  const shouldDescriptionAbsorbHeight = isInlinePresentation && !hasRealStationImage;

  // Własna obramowana karta open-quiz jest ostatnia w przepływie stanowiska —
  // zapas idzie po niej, nie w środku, gdzie tylko rozciągnąłby ramkę wokół
  // pustki.
  const shouldReserveFooterClearanceAfterOpenQuiz = isOpenQuizStation && !isInlinePresentation;

  // Ryzykanci: aparat wyżej jest ograniczony, więc reszta karty należy do
  // treści zadania — weź ją i scrolluj w środku zamiast wychodzić poza krawędź.
  const shouldScrollPhotoPromptInline = isInlinePresentation;
  const stationMediaContext = buildStationMediaContext({
    wordleMediaBoardProps: {
      stationId: station.stationId,
      displayLength: wordleDisplayLength,
      attempts: wordleAttempts,
      revealedCellCounts: wordleRevealedCellCounts,
      cellSize: wordleBoardCellSize,
      letterGap: wordleInputCellGap,
      rowGap: wordleDisplayLength >= 12 ? 4 : 6,
    },
    simonPanelProps: {
      stationId: station.stationId,
      simonSequence,
      simonTargetLength: simonRoundLength,
      simonProgress,
      simonActivePlaybackButtonId,
      simonActiveInputButtonId,
      isSimonPlaybackActive,
      isInteractiveLocked,
      isSubmittingSimon,
      isSequenceStarted: isSimonSequenceStarted,
      onStartSequence: handleStartSimonSequence,
      onPressButton: (buttonId) => {
        void handleSimonPress(buttonId);
      },
    },
    mastermindMediaSectionProps: {
      stationId: station.stationId,
      minimalChrome: presentationProfile.panels.minimalChrome,
      prompt: stationQuizPrompt,
      mastermindAttempts,
      mastermindAttemptsLeft,
      mastermindInput,
      mastermindDifficulty,
      mastermindDifficultyMode: station.challengeDifficultyMode ?? "admin",
      selectedMastermindDifficulty,
      mastermindCodeLength: mastermindConfig.codeLength,
      mastermindMaxAttempts: mastermindConfig.maxAttempts,
      mastermindSymbols: mastermindConfig.symbols,
      isInteractiveLocked,
      isSubmittingMastermindGuess,
      mastermindSolved,
      isTabletOverlay,
      quizSubmitError,
      onChangeInput: (value) => {
        handleMastermindInput(value);
      },
      onSubmitGuess: () => {
        void submitMastermindGuess();
      },
      onAddSymbol: (symbol) => {
        addMastermindSymbol(symbol);
      },
      onBackspace: () => {
        backspaceMastermindInput();
      },
      onSelectDifficulty: (difficulty) => {
        setSelectedMastermindDifficulty(difficulty);
        setMastermindInput("");
        setMastermindAttempts([]);
        setMastermindResult(null);
        setQuizSubmitError(null);
      },
    },
    memoryMediaSectionProps: {
      prompt: stationQuizPrompt,
      memoryDeck,
      memoryMatchedCount,
      memoryBusy,
      isInteractiveLocked,
      isTabletOverlay,
      quizSubmitError,
      onPressCard: (cardId) => {
        void handleMemoryCardPress(cardId);
      },
    },
    miniSudokuMediaSectionProps: {
      stationId: station.stationId,
      miniSudokuPuzzle,
      normalizedMiniSudokuValues,
      conflictCellIndexes: miniSudokuConflictIndexes,
      isActionDisabled: miniSudokuIsActionDisabled,
      activeCellIndex: miniSudokuActiveCellIndex,
      onSelectCell: setMiniSudokuActiveCellIndex,
    },
    matchingMediaSectionProps: {
      matchingAttemptsLeft,
      matchingLeftOptions,
      matchingRightOptions,
      matchingConnections,
      matchingResult,
      isInteractiveLocked: matchingIsInteractiveLocked,
      onConnect: (left, right) => {
        if (matchingIsInteractiveLocked || matchingAttemptsLeft <= 0) {
          return;
        }
        setMatchingResult(null);
        setQuizSubmitError(null);
        void submitMatchingPair(left, right);
      },
      matchingAttemptsLabel: text.matchingAttempts,
      matchingMatchedLabel: text.matchingMatched,
      matchingMatchedCount,
      totalPairs: matchingPairs.length,
    },
    boggleMediaSectionProps: {
      stationId: station.stationId,
      boggleBoardLetters,
      boggleAttemptsLeft,
      boggleMaxInputLength,
      boggleInput,
      boggleResult,
      selectedCellPath: boggleSelectedCellPath,
      isActionDisabled: boggleIsActionDisabled,
      isSubmittingBoggle,
      onChangeInput: (value) => {
        handleBoggleInput(value);
      },
      onPressBoardCell: selectBoggleBoardCell,
      onBackspaceInput: backspaceBoggleInput,
      onSubmit: () => {
        void submitBoggle();
      },
    },
  });
  const renderedStationMedia =
    resolveStationDefinition(station.stationType).renderMedia?.(stationMediaContext) ?? null;
  const miniSudokuKeypadSectionProps = {
    stationId: station.stationId,
    miniSudokuPuzzle,
    activeCellIndex: miniSudokuActiveCellIndex,
    onSelectCell: setMiniSudokuActiveCellIndex,
    isActionDisabled: miniSudokuIsActionDisabled,
    isSubmittingMiniSudoku,
    onChangeCell: handleMiniSudokuChangeCell,
    onSubmit: handleMiniSudokuSubmit,
    quizSubmitError,
    miniSudokuDifficultyMode: station.challengeDifficultyMode ?? "admin",
    selectedMiniSudokuDifficulty,
    onSelectDifficulty: (difficulty: ChallengeDifficulty) => {
      setSelectedMiniSudokuDifficulty(difficulty);
      setMiniSudokuValues(Array.from({ length: 81 }, () => ""));
      setMiniSudokuActiveCellIndex(null);
      setMiniSudokuResult(null);
      setQuizSubmitError(null);
    },
  };
  // Sends the team's written answer to the Game Master. Unlike every other quiz
  // panel this reports no verdict: the card just becomes "waiting", and the
  // decision arrives later through whatever polls the host screen.
  function handleSelectTrueFalse(index: number, isTrue: boolean) {
    if (isInteractiveLocked || isSubmittingTrueFalse) {
      return;
    }

    setTrueFalseResult(null);
    setTrueFalseSelections((previous) => {
      const next = [...previous];
      // The array starts empty and grows to the statement count as marks land,
      // so fill any gap rather than assuming an index already exists.
      while (next.length <= index) {
        next.push(null);
      }
      next[index] = isTrue;
      return next;
    });
  }

  async function handleSubmitTrueFalse() {
    await submitTrueFalseController({
      isTrueFalseStation,
      isInteractiveLocked,
      isSubmittingTrueFalse,
      trueFalseAllAnswered,
      trueFalseIsCorrect,
      stationId: station.stationId,
      startedAt: station.startedAt ?? null,
      onCompleteTask,
      onQuizFailed,
      onQuizPassed,
      showQuizOutcomePopup,
      setQuizSubmitError,
      setTrueFalseResult,
      setIsSubmittingTrueFalse,
      onSubmitError: setQuizSubmitError,
      text: {
        trueFalseSolved: text.trueFalseSolved,
        trueFalseSolvedPopup: text.trueFalseSolvedPopup,
        trueFalseFailed: text.trueFalseFailed,
        trueFalseFailedPopup: text.trueFalseFailedPopup,
      },
    });
  }

  async function handleSubmitReviewedAnswer() {
    const answerText = reviewedAnswerInput.trim();
    if (!answerText || isSubmittingReviewedAnswer || hasSubmittedReviewedAnswer) {
      return;
    }

    // No handler means the host cannot store the answer anywhere (only the
    // Ryzykanci screen wires one up). Bail rather than flipping the panel to
    // "waiting for the Game Master" over a send that never happened.
    if (!onSubmitReviewedAnswer) {
      return;
    }

    setReviewedAnswerError(null);
    setIsSubmittingReviewedAnswer(true);
    try {
      const error = await onSubmitReviewedAnswer(station.stationId, answerText);
      if (error) {
        setReviewedAnswerError(error);
        return;
      }
      setHasSubmittedReviewedAnswer(true);
    } finally {
      setIsSubmittingReviewedAnswer(false);
    }
  }

  const stationInteractionContext = buildStationInteractionContext({
    quizAudioPanelSharedProps: {
      station,
      quizOptions,
      selectedQuizOption,
      isSubmittingQuizAnswer,
      hasTimedLimit,
      hasTimerStarted,
      isTimeExpired,
      isAudioLoading,
      audioLoadError,
      quizResult,
      feedbackTone,
      quizFeedbackAnimation,
      onSubmitQuizAnswer: (index) => {
        void submitQuizAnswer(index);
      },
    },
    wordleInteractionPanelProps: {
      stationId: station.stationId,
      displayLength: wordleDisplayLength,
      inputCharacters: wordleInputCharacters,
      boardCellSize: wordleBoardCellSize,
      inputCellGap: wordleInputCellGap,
      inputActionGap: wordleInputActionGap,
      keyboardKeySize: wordleKeyboardKeyWidth,
      keyboardKeyGap: wordleKeyboardKeyGap,
      keyStateByLetter: wordleKeyStateByLetter,
      isInteractiveDisabled: isWordleInteractiveDisabled,
      isRevealing: isWordleRevealAnimating,
      isSubmitting: isSubmittingWordleGuess,
      canSubmit: normalizedWordleInput.length === (wordleLength || 0),
      canBackspace: !isWordleInteractiveDisabled && normalizedWordleInput.length > 0,
      onLayoutKeyboard: (nextWidth) => {
        if (Math.abs(nextWidth - wordleKeyboardContainerWidth) > 1) {
          setWordleKeyboardContainerWidth(nextWidth);
        }
      },
      onPressKey: (key) => {
        setWordleInput((current) => {
          const nextValue = `${current}${key}`.slice(0, wordleLength || 32);
          return nextValue === current ? current : nextValue;
        });
      },
      onBackspace: () => {
        setWordleInput((current) => {
          if (!current.length) {
            return current;
          }
          return current.slice(0, -1);
        });
      },
      onSubmit: () => {
        void submitWordleGuess();
      },
    },
    hangmanStationPanelProps: {
      stationId: station.stationId,
      hangmanMisses,
      hangmanAttemptsLeft,
      guessedHangmanSet,
      compactAttempts: presentationProfile.panels.compactAttempts,
      isGuessDisabled: hangmanIsGuessDisabled,
      isSubmittingHangmanGuess,
      onSubmitLetter: (letter) => {
        void submitHangmanGuess(letter);
      },
    },
    mastermindStationPanelProps: {
      stationId: station.stationId,
      mastermindAttempts,
      mastermindAttemptsLeft,
      mastermindInput,
      mastermindDifficulty,
      mastermindDifficultyMode: station.challengeDifficultyMode ?? "admin",
      selectedMastermindDifficulty,
      mastermindCodeLength: mastermindConfig.codeLength,
      mastermindMaxAttempts: mastermindConfig.maxAttempts,
      mastermindSymbols: mastermindConfig.symbols,
      isInputEditable: !isInteractiveLocked && !isSubmittingMastermindGuess && !mastermindSolved,
      isActionDisabled: mastermindIsActionDisabled,
      isSymbolDisabled: mastermindIsSymbolDisabled,
      isSubmittingMastermindGuess,
      onChangeInput: (value) => {
        handleMastermindInput(value);
      },
      onSubmitGuess: () => {
        void submitMastermindGuess();
      },
      onAddSymbol: (symbol) => {
        addMastermindSymbol(symbol);
      },
      onBackspace: () => {
        backspaceMastermindInput();
      },
      onSelectDifficulty: (difficulty) => {
        setSelectedMastermindDifficulty(difficulty);
        setMastermindInput("");
        setMastermindAttempts([]);
        setMastermindResult(null);
        setQuizSubmitError(null);
      },
    },
      anagramStationPanelProps: {
        scrambledWords: anagramScrambledWords,
        hintWordCount: anagramHintWordCount,
        hintLettersLayout: anagramHintLettersLayout,
        anagramAttemptsLeft,
        anagramInput,
        anagramResult,
        isActionDisabled: anagramIsActionDisabled,
        // Letter tiles and backspace must stay tappable while the word is still
        // being built — unlike isActionDisabled (which gates the Check button
        // and is true whenever the input isn't yet full-length), this excludes
        // the length check so tiles aren't disabled from the very first render.
        isInputLocked: anagramIsInputLocked,
        isSubmittingAnagram,
        onChangeInput: (value) => {
          handleAnagramInputChange(value);
        },
        onSubmit: () => {
          void submitAnagram();
        },
      },
    caesarStationPanelProps: {
      caesarInput,
      caesarMaxLength,
        caesarResult,
        isActionDisabled: caesarIsActionDisabled,
        isSubmittingCaesar,
        onChangeInput: (value) => {
          handleCaesarInputChange(value);
        },
        onAppendCharacter: (character) => {
          appendCaesarCharacter(character);
        },
        onBackspace: () => {
          backspaceCaesarInput();
        },
        onSubmit: () => {
          void submitCaesar();
        },
      },
    rebusStationPanelProps: {
      rebusQuestion: station.quizQuestion?.trim() || "🏕️ + QUEST = ?",
      rebusAttemptsLeft,
      rebusInput,
        rebusResult,
        isActionDisabled: rebusIsActionDisabled,
        isSubmittingRebus,
        onChangeInput: (value) => {
          handleRebusInputChange(value);
        },
        onAppendCharacter: (character) => {
          appendRebusCharacter(character);
        },
        onBackspace: () => {
          backspaceRebusInput();
        },
        onSubmit: () => {
          void submitRebus();
        },
      },
    openQuizStationPanelProps: {
      hideAttempts: presentationProfile.panels.hideAttempts,
      openQuizAttemptsLeft,
      openQuizInput,
      openQuizResult,
      isActionDisabled: isInteractiveLocked || isSubmittingOpenQuiz || openQuizAttemptsLeft <= 0,
      isSubmittingOpenQuiz,
      onChangeInput: (value) => {
        handleOpenQuizInputChange(value);
      },
      onSubmit: () => {
        void submitOpenQuiz();
      },
    },
    trueFalseStationPanelProps: {
      statements: trueFalseStatements,
      selections: trueFalseSelections,
      result: trueFalseResult,
      isActionDisabled: trueFalseIsActionDisabled,
      isInteractiveLocked,
      isSubmitting: isSubmittingTrueFalse,
      onSelect: handleSelectTrueFalse,
      onSubmit: () => {
        void handleSubmitTrueFalse();
      },
    },
    reviewedAnswerStationPanelProps: {
      input: reviewedAnswerInput,
      isActionDisabled: isInteractiveLocked,
      isSubmitting: isSubmittingReviewedAnswer,
      hasSubmitted: hasSubmittedReviewedAnswer,
      submitError: reviewedAnswerError,
      onChangeInput: (value: string) => {
        setReviewedAnswerInput(value);
        setReviewedAnswerError(null);
      },
      onSubmit: () => {
        void handleSubmitReviewedAnswer();
      },
    },
    strongPasswordStationPanelProps: {
      stationId: station.stationId,
      configuredDifficulty: station.challengeDifficulty ?? "medium",
      difficultyMode: station.challengeDifficultyMode,
      basePoints: station.points,
      startedAt: station.startedAt,
      isActionDisabled: isInteractiveLocked,
      onComplete: (difficulty) => {
        void onCompleteTask?.(station.stationId, "STRONG-PASSWORD", station.startedAt ?? undefined, difficulty).then((error) => {
          if (!error) {
            showQuizOutcomePopup("success", text.quizSuccessPopup, onClose);
            onQuizPassed?.(station.stationId);
          }
        });
      },
    },
  });
  const renderedQuizStation =
    resolveStationDefinition(station.stationType).renderInteraction?.(stationInteractionContext) ??
    null;
  const stationHeaderLabel = `${station.name} • ${station.typeLabel}`;
  const closeButtonDiameter = adaptiveLayout.s(isTabletOverlay ? 48 : 30, 28, 56);
  const overlayCardContentWidth = presentationProfile.card.contentWidth;

  return (
    <Animated.View
      className={presentationProfile.root.className}
      style={[
        presentationProfile.root.fillsParent ? { flex: 1, minHeight: 0 } : null,
        { backgroundColor: presentationProfile.root.backgroundColor },
        overlayBackdropStyle,
      ]}
    >
      <Animated.View
        className="flex-1"
        style={[
          {
            flex: 1,
            minHeight: 0,
            paddingHorizontal: presentationProfile.frame.paddingHorizontal,
            paddingTop: presentationProfile.frame.paddingTop,
            paddingBottom: presentationProfile.frame.paddingBottom,
          },
          overlayPanelStyle,
        ]}
      >
        <View
          className={presentationProfile.card.className}
          onTouchEnd={() => {
            // Tapping empty space anywhere in the card dismisses the
            // keyboard; nested Pressables/TextInputs still claim their own
            // touches first, so buttons and the input itself are unaffected.
            // Plain View + onTouchEnd instead of Pressable: Pressable's own
            // responder-negotiation ("is this a press, or should a nested
            // gesture — like the description ScrollView's drag — take it
            // instead?") was intermittently winning that negotiation and
            // swallowing the first bit of a scroll drag, making the
            // description scroll only work after several attempts.
            Keyboard.dismiss();
          }}
          style={{
            borderColor: presentationProfile.card.borderColor,
            backgroundColor: presentationProfile.card.backgroundColor,
            borderRadius: presentationProfile.card.borderRadius,
            paddingBottom: presentationProfile.card.paddingBottom,
          }}
        >
          {presentationProfile.chrome.showHeader ? (
          <View
            className="flex-row items-start justify-between"
            style={{
              columnGap: adaptiveLayout.s(isTabletOverlay ? 12 : 8, 6, 16),
              paddingHorizontal: adaptiveLayout.s(isTabletOverlay ? 16 : 10, 8, 22),
              paddingTop: adaptiveLayout.s(isTabletOverlay ? 16 : 10, 8, 22),
              paddingBottom: adaptiveLayout.s(isTabletOverlay ? 8 : 4, 3, 12),
            }}
          >
            <View className="flex-1">
                <Text
                  className="uppercase tracking-widest"
                  style={{ color: EXPEDITION_THEME.textSubtle, fontSize: adaptiveLayout.fs(isTabletOverlay ? 13 : 9, 8, 16) }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {stationHeaderLabel}
                </Text>
            </View>
            {showLanguageButton && languageFlag && onOpenLanguagePicker ? (
              <Pressable
                className="items-center justify-center rounded-full border active:opacity-90"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                  width: closeButtonDiameter,
                  height: closeButtonDiameter,
                }}
                onPress={onOpenLanguagePicker}
                hitSlop={8}
              >
                <Text
                  className="text-center"
                  style={{
                    fontSize: adaptiveLayout.fs(isTabletOverlay ? 20 : 13, 12, 24),
                    includeFontPadding: false,
                    width: closeButtonDiameter,
                    height: closeButtonDiameter,
                    lineHeight: closeButtonDiameter,
                    verticalAlign: "middle",
                  }}
                >
                  {languageFlag}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              className="items-center justify-center rounded-full border active:opacity-90"
                style={{
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                  width: closeButtonDiameter,
                  height: closeButtonDiameter,
                }}
              onPress={onRequestClose ?? onClose}
              hitSlop={8}
            >
              <Text
                className="font-semibold text-center"
                style={{
                  color: EXPEDITION_THEME.textPrimary,
                  fontSize: adaptiveLayout.fs(isTabletOverlay ? 20 : 13, 12, 24),
                  includeFontPadding: false,
                  width: closeButtonDiameter,
                  height: closeButtonDiameter,
                  lineHeight: closeButtonDiameter,
                  verticalAlign: "middle",
                  // The ✕ glyph sits low within its own line box in the system font,
                  // even when the box itself is perfectly centered — nudge it up a bit.
                  transform: [{ translateY: -closeButtonDiameter * 0.04 }],
                }}
              >
                ✕
              </Text>
            </Pressable>
            </View>
          ) : null}

            <View
              className="flex-1"
              style={{
                paddingHorizontal: adaptiveLayout.s(isTabletOverlay ? 16 : 10, 8, 22),
                // With the keyboard up (compactMedia), stack this column's
                // content against its bottom edge — the host has already
                // shrunk that edge to sit right on top of the keyboard, so
                // this is what removes the dead gap between the answer input
                // and the keyboard instead of leaving the content pinned to
                // the top of the freed space.
                ...(compactMedia ? { justifyContent: "flex-end" as const } : {}),
                // The anagram is a single small object (a row of letter tiles
                // over a one-line description), so with the keyboard down it
                // would otherwise hang from the top edge of a tall card with
                // all the empty space below it. Centre the column instead.
                ...(shouldCentreInlineAnagramColumn ? { justifyContent: "center" as const } : {}),
                // Inline presentation shares screen space with a host's own
                // chrome (top bar, timer, bottom panel) instead of owning the
                // full screen like the overlay does, so content that doesn't
                // fit must be reachable by scrolling the host's own container
                // rather than clipped here.
                overflow: presentationProfile.content.overflow,
              }}
            >
              <View
                // This wrapper's flex-1 greedily claims all remaining
                // vertical space in the overlay's much larger full-screen
                // layout — fine there, but in the host-shared inline layout
                // (Ryzykanci) it leaves nothing for the actual quiz task
                // content (question/input) that follows as a sibling below,
                // for types whose media box has a fixed (not flex-filled)
                // height. Let it size to its own content instead for those.
                className={
                  shouldMediaWrapperHugContent ? undefined : "flex-1"
                }
                style={{
                  // The media and description absorb all height left after the
                  // fixed input/keyboard block in Ryzykanci.
                  ...(shouldMediaWrapperAbsorbHeight
                    ? {
                        overflow: "hidden" as const,
                        flexGrow: 1,
                        flexBasis: 0,
                        minHeight: 0,
                      }
                    : {}),
                  // Reserve space so station content never renders under the
                  // absolutely-positioned timer/points footer below (this
                  // used to be duplicated per-panel in code-station-panel.tsx
                  // and wordle-station-panel.tsx — centralized here instead).
                  marginBottom:
                    shouldReserveFooterClearance
                      ? adaptiveLayout.s(isTabletOverlay ? 100 : 72, 60, 132)
                      : 0,
                }}
              >
                {isMemoryStation ? (
                  <Text
                    className="mb-2 px-1 text-center font-semibold"
                    style={{
                      color: EXPEDITION_THEME.textPrimary,
                      fontSize: adaptiveLayout.fs(isTabletOverlay ? 17 : 12, 11, 21),
                    }}
                  >
                    {stationQuizPrompt}
                  </Text>
                ) : null}

                {(isBoggleStation || isAnagramStation) && stationDescription.length > 0 ? (
                  <AutoScrollingBox className="mb-1">
                    <Text
                      style={{
                        color: EXPEDITION_THEME.textMuted,
                        fontSize: stationPanelLayout.descriptionFontSize,
                        lineHeight: adaptiveLayout.s(isTabletOverlay ? 20 : 13, 12, 24),
                      }}
                    >
                      {stationDescription}
                    </Text>
                  </AutoScrollingBox>
                ) : null}

                {station.stationType !== "strong-password" &&
                !requiresQrScan &&
                !isAnagramStation &&
                !(station.stationType === "quiz" && !hasRealStationImage) &&
                !(requiresCode && !hasRealStationImage) &&
                !shouldHideEmptyInlineMediaBox ? (
                  <StationMediaPanel
                    minimalChrome={presentationProfile.panels.minimalChrome}
                    stationId={station.stationId}
                    stationType={station.stationType}
                    viewportHeight={viewportHeight}
                    stationMediaHeight={
                      compactMedia
                        ? Math.min(stationMediaHeight, adaptiveLayout.s(240, 180, 280))
                        : stationMediaHeight
                    }
                    requiresCode={requiresCode || requiresPhotoUpload}
                    isNumericCodeStation={isNumericCodeStation}
                    renderedStationMedia={renderedStationMedia}
                    shouldShowQuizFallbackGraphic={shouldShowQuizFallbackGraphic}
                    stationImageUri={stationImageUri}
                    quizIconLoadFailed={quizIconLoadFailed}
                    onQuizIconLoadError={() => setQuizIconLoadFailed(true)}
                    onStationImageLoadError={() => setImageLoadFailed(true)}
                    caesarMedia={{
                      decodedText: caesarDecoded,
                      shiftValue: caesarShiftValue,
                      attemptsLeft: caesarAttemptsLeft,
                      shiftHintLabel: text.caesarShiftHint(caesarShiftValue),
                      attemptsLabel: text.caesarAttemptsLeftLabel,
                    }}
                    hangmanMedia={{
                      secret: hangmanSecret,
                      guessedLetters: guessedHangmanSet,
                    }}
                    audioOverlay={
                      isAudioQuizStation
                          ? {
                              hasPlaybackStarted: hasAudioPlaybackStarted,
                              isPlayDisabled: isAudioOverlayControlDisabled,
                              isStopDisabled: isAudioStopDisabled,
                              isPlaying: isAudioPlaying,
                              playLabel: text.audioOverlayPlay,
                              replayLabel: text.audioOverlayReplay,
                              stopLabel: text.audioOverlayStop,
                              statusReadyLabel: text.audioOverlayStatusReady,
                              statusPlayingLabel: text.audioOverlayStatusPlaying,
                              statusDisabledLabel: text.audioOverlayStatusDisabled,
                              onPlay: () => {
                                void handlePlayAudio();
                              },
                            onStop: () => {
                              void handleStopAudio();
                            },
                          }
                        : undefined
                    }
                    photoTaskCapture={
                      requiresPhotoUpload
                        ? {
                            canCapture: photoTaskCapture.canCapture,
                            previewUri: photoTaskCapture.previewUri,
                            onOpenCamera: photoTaskCapture.openCapture,
                            takePhotoLabel: photoTaskCapture.text.takePhoto,
                            retakePhotoLabel: photoTaskCapture.text.retakePhoto,
                            isCaptureActive: photoTaskCapture.isCaptureActive,
                            isUploading: photoTaskCapture.isUploading,
                            uploadError: photoTaskCapture.uploadError,
                            cameraAccessTitle: photoTaskCapture.text.cameraAccessTitle,
                            cameraAccessDescription: photoTaskCapture.text.cameraAccessDescription,
                            enableCameraLabel: photoTaskCapture.text.enableCamera,
                            switchCameraLabel: photoTaskCapture.text.switchCamera,
                            onCancelCapture: photoTaskCapture.closeCapture,
                            onConfirmCapture: photoTaskCapture.handleConfirmedCapture,
                          }
                        : undefined
                    }
                  />
                ) : null}

              {isSimonStation ? (
                <View className="mt-2 items-center">
                  <SimonMistakesRow simonMistakes={simonMistakes} simonMaxMistakes={SIMON_MAX_MISTAKES} />
                </View>
              ) : null}

              {isMemoryStation ? (
                <View className="mt-2 items-center">
                  <MemoryPairsRow memoryDeck={memoryDeck} memoryMatchedCount={memoryMatchedCount} />
                </View>
              ) : null}

              {requiresPhotoUpload ? (
                <View
                  className="items-center"
                  style={{
                    marginTop: adaptiveLayout.s(isTabletOverlay ? 12 : 8, 6, 16),
                    rowGap: adaptiveLayout.s(6, 4, 10),
                    // Ryzykanci: the camera above is capped, so whatever is
                    // left of the card belongs to the task text — take it, and
                    // scroll inside instead of pushing past the card's edge.
                    ...(shouldScrollPhotoPromptInline
                      ? {
                          flexGrow: 1,
                          flexShrink: 1,
                          flexBasis: 0,
                          minHeight: 0,
                          width: "100%" as const,
                          justifyContent: "center" as const,
                        }
                      : {}),
                  }}
                >
                  {shouldScrollPhotoPromptInline ? (
                    <AutoScrollingBox className="w-full" style={{ flexShrink: 1, minHeight: 0 }}>
                      <Text
                        className="text-center"
                        style={{
                          color: EXPEDITION_THEME.textPrimary,
                          fontSize: stationPanelLayout.promptFontSize,
                          lineHeight: adaptiveLayout.s(isTabletOverlay ? 28 : 20, 18, 32),
                        }}
                      >
                        {stationQuizPrompt}
                      </Text>
                    </AutoScrollingBox>
                  ) : (
                    <Text
                      className="text-center"
                      style={{
                        color: EXPEDITION_THEME.textPrimary,
                        fontSize: stationPanelLayout.descriptionFontSize,
                        lineHeight: adaptiveLayout.s(isTabletOverlay ? 24 : 18, 16, 28),
                      }}
                    >
                      {stationQuizPrompt}
                    </Text>
                  )}
                  <PhotoTaskStatusText
                    text={photoTaskCapture.text}
                    isApproved={photoTaskCapture.isApproved}
                    isRejected={photoTaskCapture.isRejected}
                    hasPendingSubmission={photoTaskCapture.hasPendingSubmission}
                  />
                </View>
              ) : null}

              {requiresQrScan ? (
                <View
                  className="mt-1 w-full overflow-hidden rounded-2xl border"
                  style={{
                    height: stationMediaHeight,
                    borderColor: EXPEDITION_THEME.border,
                    backgroundColor: EXPEDITION_THEME.panelMuted,
                  }}
                >
                  {!qrHuntScan.isScannerOpen ? (
                    <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
                      <SvgUri
                        uri={QR_HUNT_WATERMARK_ICON_URI}
                        width={Math.round(stationMediaHeight * 0.5)}
                        height={Math.round(stationMediaHeight * 0.5)}
                        color={EXPEDITION_THEME.textSubtle}
                        stroke={EXPEDITION_THEME.textSubtle}
                        opacity={0.16}
                      />
                    </View>
                  ) : null}
                  {qrHuntScan.showScanConfirmation ? (
                    <View
                      className="absolute inset-x-0 items-center"
                      style={{ top: adaptiveLayout.s(10, 6, 14), zIndex: 20 }}
                      pointerEvents="none"
                    >
                      <View
                        className="flex-row items-center rounded-full"
                        style={{
                          columnGap: adaptiveLayout.s(6, 4, 8),
                          paddingHorizontal: adaptiveLayout.s(14, 10, 18),
                          paddingVertical: adaptiveLayout.s(7, 5, 9),
                          backgroundColor: QR_HUNT_SCAN_SUCCESS_COLOR,
                        }}
                      >
                        <Text
                          className="font-semibold"
                          style={{
                            color: isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background,
                            fontSize: adaptiveLayout.fs(16, 13, 18),
                          }}
                        >
                          ✓
                        </Text>
                        <Text
                          className="font-semibold"
                          style={{
                            color: isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background,
                            fontSize: adaptiveLayout.fs(13, 11, 15),
                          }}
                        >
                          {qrHuntScan.text.scanConfirmed}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {qrHuntScan.showAlreadyScannedNotice ? (
                    <View
                      className="absolute inset-x-0 items-center"
                      style={{ top: adaptiveLayout.s(10, 6, 14), zIndex: 20 }}
                      pointerEvents="none"
                    >
                      <View
                        className="flex-row items-center rounded-full"
                        style={{
                          columnGap: adaptiveLayout.s(6, 4, 8),
                          paddingHorizontal: adaptiveLayout.s(14, 10, 18),
                          paddingVertical: adaptiveLayout.s(7, 5, 9),
                          backgroundColor: getQrHuntScanNeutralColor(),
                        }}
                      >
                        <Text
                          className="font-semibold"
                          style={{
                            color: isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background,
                            fontSize: adaptiveLayout.fs(16, 13, 18),
                          }}
                        >
                          ℹ
                        </Text>
                        <Text
                          className="font-semibold"
                          style={{
                            color: isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background,
                            fontSize: adaptiveLayout.fs(13, 11, 15),
                          }}
                        >
                          {qrHuntScan.text.alreadyScanned}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {qrHuntScan.isScannerOpen ? (
                    <InlineQrScanner
                      isResolving={qrHuntScan.isSubmitting}
                      onClose={qrHuntScan.closeScanner}
                      onDetected={qrHuntScan.handleDetected}
                    />
                  ) : (
                    <View
                      className="flex-1 items-center justify-center"
                      style={{
                        rowGap: adaptiveLayout.s(16, 10, 22),
                        paddingHorizontal: adaptiveLayout.s(isTabletOverlay ? 16 : 10, 8, 22),
                        paddingVertical: adaptiveLayout.s(isTabletOverlay ? 16 : 10, 8, 22),
                      }}
                    >
                      {qrHuntScan.canScan ? (
                        <Pressable
                          className="items-center justify-center rounded-2xl active:opacity-90"
                          style={{
                            backgroundColor: EXPEDITION_THEME.accent,
                            minHeight: adaptiveLayout.s(isTabletOverlay ? 84 : 64, 56, 96),
                            minWidth: adaptiveLayout.s(isTabletOverlay ? 260 : 200, 170, 300),
                            paddingHorizontal: adaptiveLayout.s(isTabletOverlay ? 40 : 30, 24, 48),
                            opacity: qrHuntScan.isSubmitting ? MOBILE_UX_TOKENS.disabledOpacity : 1,
                          }}
                          onPress={qrHuntScan.openScanner}
                          disabled={qrHuntScan.isSubmitting}
                        >
                          <Text
                            className="font-semibold text-center"
                            style={{
                              color: isLightTheme ? EXPEDITION_THEME.panel : EXPEDITION_THEME.background,
                              fontSize: adaptiveLayout.fs(isTabletOverlay ? 20 : 16, 14, 24),
                            }}
                          >
                            {qrHuntScan.scannedCount > 0 ? qrHuntScan.text.scanNextCode : qrHuntScan.text.scanCode}
                          </Text>
                        </Pressable>
                      ) : null}
                      {qrHuntScan.submitError ? (
                        <Text
                          className="text-center"
                          style={{ color: EXPEDITION_THEME.danger, fontSize: stationPanelLayout.resultFontSize }}
                        >
                          {qrHuntScan.submitError}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>
              ) : null}

              {requiresQrScan ? (
                <View className="mt-2 w-full items-center">
                  <QrHuntProgressDots
                    text={qrHuntScan.text}
                    requiredCount={qrHuntScan.requiredCount}
                    scannedCount={qrHuntScan.scannedCount}
                    isDone={station.status === "done"}
                  />
                </View>
              ) : null}

              {requiresQrScan && stationDescription.length > 0 ? (
                <View
                  className="px-1"
                  style={{
                    marginTop: adaptiveLayout.s(isTabletOverlay ? 10 : 6, 5, 14),
                    maxHeight: isTabletOverlay
                      ? QR_HUNT_DESCRIPTION_RESERVE.tablet
                      : QR_HUNT_DESCRIPTION_RESERVE.phone,
                  }}
                >
                  <AutoScrollingBox
                    autoScrollEnabled={false}
                    showsBottomFadeWhenScrollable
                    bottomFadeColor={EXPEDITION_THEME.panel}
                  >
                    <Text
                      className="leading-6"
                      style={{
                        color: EXPEDITION_THEME.textMuted,
                        textAlign: "justify",
                        fontSize: stationPanelLayout.descriptionFontSize,
                        lineHeight: adaptiveLayout.s(isTabletOverlay ? 24 : 17, 16, 30),
                      }}
                    >
                      {stationDescription}
                    </Text>
                  </AutoScrollingBox>
                </View>
              ) : null}

              {requiresCode ? (
                <View
                  className="px-1"
                  style={{
                    marginVertical: adaptiveLayout.s(isTabletOverlay ? 12 : 6, 5, 16),
                    // A fixed, precomputed cap instead of flex-shrinking against
                    // siblings (the image above is itself flex:1 and can still be
                    // settling its own async-loaded size right after the station
                    // opens) — that made this box's available height a moving
                    // target during the first moments, which is what made the
                    // auto-scroll cycle look jumpy right from station start.
                    // A fixed maxHeight is stable from the very first layout pass.
                    maxHeight:
                      shouldDescriptionAbsorbHeight
                        ? undefined
                        : adaptiveLayout.s(isTabletOverlay ? 160 : 110, 80, 260),
                    ...(shouldDescriptionAbsorbHeight ? { flexGrow: 1, minHeight: 0 } : {}),
                  }}
                >
                  <AutoScrollingBox
                    style={
                      shouldDescriptionAbsorbHeight ? { flexGrow: 1 } : undefined
                    }
                    autoScrollEnabled={false}
                    showsBottomFadeWhenScrollable
                    bottomFadeColor={EXPEDITION_THEME.panel}
                  >
                    <Text
                      className="leading-6"
                      style={{
                        color: EXPEDITION_THEME.textMuted,
                        textAlign: "justify",
                        fontSize: stationPanelLayout.descriptionFontSize,
                        lineHeight: adaptiveLayout.s(isTabletOverlay ? 24 : 17, 16, 30),
                      }}
                    >
                      {stationDescription.length > 0
                        ? stationDescription
                        : text.taskDescriptionMissing}
                    </Text>
                  </AutoScrollingBox>
                </View>
              ) : !isCaesarStation && !requiresPhotoUpload && !isAnagramStation && !isClassicQuizStation && !requiresQrScan && !isBoggleStation && station.stationType !== "strong-password" && stationDescription.length > 0 ? (
                <AutoScrollingBox className="mt-1">
                  <Text
                    style={{
                      color: EXPEDITION_THEME.textMuted,
                      fontSize: stationPanelLayout.descriptionFontSize,
                      lineHeight: adaptiveLayout.s(isTabletOverlay ? 20 : 13, 12, 24),
                    }}
                  >
                    {stationDescription}
                  </Text>
                </AutoScrollingBox>
              ) : null}
              {isAnagramStation ? (
                <Text
                  className="mt-1"
                  style={{
                    color: EXPEDITION_THEME.textSubtle,
                    fontSize: adaptiveLayout.fs(isTabletOverlay ? 14 : 10, 9, 17),
                    lineHeight: adaptiveLayout.s(isTabletOverlay ? 20 : 14, 13, 24),
                  }}
                >
                  {text.anagramDisplayHint}
                </Text>
              ) : null}

              {isClassicQuizStation && stationDescription.length > 0 ? (
                <AutoScrollingBox className="mt-2">
                  <Text
                    style={{
                      color: EXPEDITION_THEME.textMuted,
                      fontSize: stationPanelLayout.descriptionFontSize,
                      lineHeight: adaptiveLayout.s(isTabletOverlay ? 20 : 13, 12, 24),
                    }}
                  >
                    {stationDescription}
                  </Text>
                </AutoScrollingBox>
              ) : null}

              {isQuizStation && !isMatchingStation && !isBoggleStation && !isMastermindStation && !isMemoryStation && !isMiniSudokuStation && !isSimonStation ? (
                <View
                  style={{
                    // Open-quiz's own bordered card is the last thing in this
                    // station's flow — reserve clearance after it (not inside
                    // it, which would just stretch the border around blank
                    // space) so it never renders under the absolutely-
                    // positioned timer/points footer below, same treatment as
                    // code-station-panel.tsx / mini-sudoku's keypad section.
                    marginBottom:
                      shouldReserveFooterClearanceAfterOpenQuiz
                        ? adaptiveLayout.s(isTabletOverlay ? 100 : 72, 60, 132)
                        : 0,
                  }}
                >
                  <StationQuizTaskWrapper
                    className={isTabletOverlay ? "mt-3" : "mt-2"}
                    prompt={stationQuizPrompt}
                    hidePrompt={isRebusStation}
                    isTabletOverlay={isTabletOverlay}
                    error={quizSubmitError}
                    errorPlacement="inside"
                    showBorder={!isChromelessInlineTask}
                    transparentBackground={isChromelessInlineTask}
                  >
                    {renderedQuizStation}
                  </StationQuizTaskWrapper>
                </View>
              ) : null}

            </View>

            {requiresCode ? (
              <CodeStationPanel
                minimalChrome={presentationProfile.panels.minimalChrome}
                availableContentWidth={overlayCardContentWidth}
                station={station}
                isNumericCodeStation={isNumericCodeStation}
                isCodeActionDisabled={isCodeActionDisabled}
                verificationCode={verificationCode}
                isCodeInputInvalid={isCodeInputInvalid}
                isCodeInputSuccess={isCodeInputSuccess}
                codeResult={codeResult}
                isSubmittingCode={isSubmittingCode}
                codeInputShakeAnimation={codeInputShakeAnimation}
                onBackspaceVerificationCode={() => {
                  setVerificationCode((current) => current.slice(0, -1));
                }}
                onAppendVerificationCode={(value) => {
                  setVerificationCode((current) => `${current}${value}`.slice(0, 32));
                }}
                onSubmitVerificationCode={() => {
                  void submitVerificationCode();
                }}
                onResetCodeFeedback={() => {
                  setIsCodeInputInvalid(false);
                  setIsCodeInputSuccess(false);
                  setCodeResult(null);
                }}
              />
            ) : null}

            {isMiniSudokuStation ? (
              <MiniSudokuKeypadSection {...miniSudokuKeypadSectionProps} />
            ) : null}

          </View>

          {presentationProfile.chrome.showFooterBar ? (
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingHorizontal: adaptiveLayout.s(isTabletOverlay ? 16 : 10, 8, 22),
              paddingTop: adaptiveLayout.s(isNumericCodeStation ? (isTabletOverlay ? 4 : 2) : isTabletOverlay ? 8 : 4, 1, 12),
              paddingBottom: adaptiveLayout.s(isNumericCodeStation ? (isTabletOverlay ? 12 : 6) : isTabletOverlay ? 16 : 8, 5, 22),
            }}
          >
            {shouldShowExecutionTimer ? (
              <View className="items-start px-4 py-2">
                <Animated.Text
                  className="text-center font-extrabold"
                  style={[
                    {
                      color: timerTextColor,
                      fontSize: adaptiveLayout.fs(
                        isTabletOverlay ? (isNumericCodeStation ? 40 : 50) : isNumericCodeStation ? 30 : 36,
                        26,
                        58,
                      ),
                    },
                    timerPulseStyle,
                  ]}
                >
                  {executionTimeLabel}
                </Animated.Text>
                <Text
                  className="mt-1 text-center text-[10px] uppercase tracking-widest"
                  style={{ color: EXPEDITION_THEME.textSubtle }}
                >
                  {isCompletionStopwatchActive ? text.executionStopwatchLabel : text.executionTimerLabel}
                </Text>
                {isCompletionStopwatchActive && (displayedStation.fastestCompletionBonusPoints ?? 0) > 0 ? (
                  <Text
                    className="mt-0.5 text-center text-[10px] font-semibold"
                    style={{ color: EXPEDITION_THEME.accent }}
                  >
                    {text.fastestBonusAvailableLabel(displayedStation.fastestCompletionBonusPoints ?? 0)}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View />
            )}
            <View className="items-end px-2 py-1">
              <Text
                className="text-center font-extrabold"
                style={{
                  color: pointsAccentColor,
                  fontSize: adaptiveLayout.fs(
                    isTabletOverlay ? (isNumericCodeStation ? 40 : 50) : isNumericCodeStation ? 30 : 36,
                    26,
                    58,
                  ),
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {shouldShowDynamicPoints ? dynamicAvailablePoints : station.points}
              </Text>
              <Text
                className="mt-1 text-center text-[10px] uppercase tracking-widest"
                style={{ color: pointsAccentColor }}
              >
                {text.points}
              </Text>
            </View>
          </View>
          ) : null}

        </View>
      </Animated.View>
      <QuizOutcomePopupPanel
        popup={quizOutcomePopup}
        timeoutSecondsLeft={timeoutPopupSecondsLeft}
        isLightTheme={isLightTheme}
        // Ryzykanci: dressed like that screen's bottom bar.
        cornerStyle={presentationProfile.panels.cornerStyle}
        onClose={closeQuizOutcomePopup}
        text={{
          outcomePassed: text.outcomePassed,
          outcomeTimedOut: text.outcomeTimedOut,
          outcomeFailed: text.outcomeFailed,
          outcomePending: text.outcomePending,
          backToMapNow: text.backToMapNow,
          backToMap: text.backToMap,
        }}
      />
    </Animated.View>
  );
}
