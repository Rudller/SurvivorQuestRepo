import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { Alert, Animated, Image, Pressable, Text, View, useWindowDimensions } from "react-native";
import { EXPEDITION_THEME } from "../../../onboarding/model/constants";
import { AnagramStationPanel } from "./station-panels/anagram-station-panel";
import { BoggleStationPanel } from "./station-panels/boggle-station-panel";
import { CaesarStationPanel } from "./station-panels/caesar-station-panel";
import { CodeStationPanel } from "./station-panels/code-station-panel";
import { HangmanStationPanel } from "./station-panels/hangman-station-panel";
import { MatchingStationPanel } from "./station-panels/matching-station-panel";
import { MastermindStationPanel, type MastermindAttempt } from "./station-panels/mastermind-station-panel";
import { MemoryStationPanel } from "./station-panels/memory-station-panel";
import { MiniSudokuStationPanel } from "./station-panels/mini-sudoku-station-panel";
import { QuizAudioPanel, resolveStationQuizPrompt } from "./station-panels/quiz-audio-station-panel";
import { RebusStationPanel } from "./station-panels/rebus-station-panel";
import { SimonStationPanel } from "./station-panels/simon-station-panel";
import { WordleInteractionPanel, WordleMediaBoard, type WordleAttempt } from "./station-panels/wordle-station-panel";
import type {
  StationPreviewOverlayProps,
  StationTestType,
  StationTestViewModel,
} from "./types";

import {
  CAESAR_SHIFT,
  HANGMAN_MAX_MISSES,
  MASTERMIND_MAX_ATTEMPTS,
  MEMORY_MAX_MISTAKES,
  QUIZ_BRAIN_ICON_URI,
  TEXT_PUZZLE_MAX_ATTEMPTS,
  WORDLE_MAX_ATTEMPTS,
  type MemoryCard,
  type WordleCellState,
  blendHexColors,
  buildMastermindFeedback,
  buildWordleEvaluation,
  canBuildWordFromLetters,
  canTraceWordOnBoggle,
  caesarShift,
  clamp01,
  formatRemainingTimeLabel,
  isGuessableHangmanCharacter,
  isInvalidCompletionCodeErrorMessage,
  normalizeHangmanSecret,
  normalizePuzzleText,
  normalizePuzzleWord,
  normalizeWordleSecret,
  resolveBoggleBoard,
  resolveBoggleTarget,
  resolveCorrectAnswerText,
  resolveMatchingPairs,
  resolveMastermindSecret,
  resolveMemoryDeck,
  resolveMiniSudokuPuzzle,
  resolvePuzzleSecret,
  resolveSimonSequence,
  scrambleWord,
  shuffleDeterministic,
} from "./puzzle-helpers";

function isQuizStationType(stationType: StationTestType) {
  return (
    stationType === "quiz" ||
    stationType === "audio-quiz" ||
    stationType === "wordle" ||
    stationType === "hangman" ||
    stationType === "mastermind" ||
    stationType === "anagram" ||
    stationType === "caesar-cipher" ||
    stationType === "memory" ||
    stationType === "simon" ||
    stationType === "rebus" ||
    stationType === "boggle" ||
    stationType === "mini-sudoku" ||
    stationType === "matching"
  );
}


export function StationPreviewOverlay({
  station: stationProp,
  onClose,
  onRequestClose,
  onCompleteTask,
  onQuizFailed,
  onQuizPassed,
  onTimeExpired,
}: StationPreviewOverlayProps) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [wordleInput, setWordleInput] = useState("");
  const [wordleAttempts, setWordleAttempts] = useState<WordleAttempt[]>([]);
  const [wordleResult, setWordleResult] = useState<string | null>(null);
  const [hangmanInput, setHangmanInput] = useState("");
  const [hangmanGuessedLetters, setHangmanGuessedLetters] = useState<string[]>([]);
  const [hangmanMisses, setHangmanMisses] = useState<string[]>([]);
  const [hangmanResult, setHangmanResult] = useState<string | null>(null);
  const [mastermindInput, setMastermindInput] = useState("");
  const [mastermindAttempts, setMastermindAttempts] = useState<MastermindAttempt[]>([]);
  const [mastermindResult, setMastermindResult] = useState<string | null>(null);
  const [anagramInput, setAnagramInput] = useState("");
  const [anagramAttempts, setAnagramAttempts] = useState(0);
  const [anagramResult, setAnagramResult] = useState<string | null>(null);
  const [caesarInput, setCaesarInput] = useState("");
  const [caesarAttempts, setCaesarAttempts] = useState(0);
  const [caesarResult, setCaesarResult] = useState<string | null>(null);
  const [memoryDeck, setMemoryDeck] = useState<MemoryCard[]>([]);
  const [memorySelection, setMemorySelection] = useState<string[]>([]);
  const [memoryMistakes, setMemoryMistakes] = useState(0);
  const [memoryResult, setMemoryResult] = useState<string | null>(null);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const [simonInput, setSimonInput] = useState<string[]>([]);
  const [simonHintVisible, setSimonHintVisible] = useState(true);
  const [simonResult, setSimonResult] = useState<string | null>(null);
  const [rebusInput, setRebusInput] = useState("");
  const [rebusAttempts, setRebusAttempts] = useState(0);
  const [rebusResult, setRebusResult] = useState<string | null>(null);
  const [boggleInput, setBoggleInput] = useState("");
  const [boggleAttempts, setBoggleAttempts] = useState(0);
  const [boggleResult, setBoggleResult] = useState<string | null>(null);
  const [miniSudokuValues, setMiniSudokuValues] = useState<string[]>(["", "", "", ""]);
  const [miniSudokuAttempts, setMiniSudokuAttempts] = useState(0);
  const [miniSudokuResult, setMiniSudokuResult] = useState<string | null>(null);
  const [matchingSelectionLeft, setMatchingSelectionLeft] = useState<string | null>(null);
  const [matchingMatchedLeft, setMatchingMatchedLeft] = useState<string[]>([]);
  const [matchingAttempts, setMatchingAttempts] = useState(0);
  const [matchingResult, setMatchingResult] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [codeResult, setCodeResult] = useState<string | null>(null);
  const [quizSubmitError, setQuizSubmitError] = useState<string | null>(null);
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
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
  const [isSubmittingBoggle, setIsSubmittingBoggle] = useState(false);
  const [isSubmittingMiniSudoku, setIsSubmittingMiniSudoku] = useState(false);
  const [isSubmittingMatching, setIsSubmittingMatching] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isCodeInputInvalid, setIsCodeInputInvalid] = useState(false);
  const [isCodeInputSuccess, setIsCodeInputSuccess] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [displayedStation, setDisplayedStation] = useState<StationTestViewModel | null>(stationProp);
  const [isOverlayMounted, setIsOverlayMounted] = useState(Boolean(stationProp));
  const overlaySlideAnimation = useRef(new Animated.Value(stationProp ? 1 : 0)).current;
  const quizFeedbackAnimation = useRef(new Animated.Value(0)).current;
  const timerPulseAnimation = useRef(new Animated.Value(0)).current;
  const codeInputShakeAnimation = useRef(new Animated.Value(0)).current;
  const codeInputResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeInputSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioPlaybackSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const timerPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const memoryHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simonHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutPopupShownRef = useRef(false);
  const quizOptions = useMemo(
    () =>
      displayedStation?.quizAnswers ?? [
        "Sprawdzam komunikację i plan zespołu.",
        "Działam bez konsultacji z drużyną.",
        "Ignoruję zasady bezpieczeństwa.",
        "Rozdzielam zespół i tracę kontakt.",
      ],
    [displayedStation?.quizAnswers],
  );
  const unloadAudioSound = useCallback(async () => {
    const activePlayer = audioPlayerRef.current;
    audioPlayerRef.current = null;
    setIsAudioPlaying(false);
    if (audioPlaybackSubscriptionRef.current) {
      audioPlaybackSubscriptionRef.current.remove();
      audioPlaybackSubscriptionRef.current = null;
    }
    if (!activePlayer) {
      return;
    }

    try {
      activePlayer.pause();
    } catch {
      // noop
    }

    try {
      activePlayer.remove();
    } catch {
      // noop
    }
  }, []);
  const loadAudioSound = useCallback(
    async (audioUrl: string) => {
      const normalizedAudioUrl = audioUrl.trim();
      if (!normalizedAudioUrl) {
        setAudioLoadError("Brak źródła audio dla tego stanowiska.");
        setIsAudioLoading(false);
        return null;
      }

      await unloadAudioSound();
      setAudioLoadError(null);
      setIsAudioLoading(true);
      try {
        const player = createAudioPlayer(
          { uri: normalizedAudioUrl },
          {
            updateInterval: 250,
          },
        );
        audioPlayerRef.current = player;
        audioPlaybackSubscriptionRef.current = player.addListener(
          "playbackStatusUpdate",
          (status: AudioStatus) => {
            if (!status.isLoaded) {
              setIsAudioPlaying(false);
              return;
            }

            setIsAudioLoading(false);
            setIsAudioPlaying(status.playing);
            if (status.didJustFinish) {
              void audioPlayerRef.current?.seekTo(0).catch(() => undefined);
              setIsAudioPlaying(false);
            }
          },
        );
        setIsAudioLoading(!player.isLoaded);
        return player;
      } catch {
        setAudioLoadError("Nie udało się załadować nagrania audio.");
        return null;
      } finally {
        if (!audioPlayerRef.current) {
          setIsAudioLoading(false);
        }
      }
    },
    [unloadAudioSound],
  );
  const handlePlayAudio = useCallback(async () => {
    if (!displayedStation || displayedStation.stationType !== "audio-quiz") {
      return;
    }

    const audioUrl = displayedStation.quizAudioUrl?.trim() ?? "";
    let activePlayer = audioPlayerRef.current;
    if (!activePlayer) {
      activePlayer = await loadAudioSound(audioUrl);
    }

    if (!activePlayer) {
      return;
    }

    try {
      await activePlayer.seekTo(0);
      activePlayer.play();
    } catch {
      setAudioLoadError("Nie udało się odtworzyć nagrania audio.");
      setIsAudioPlaying(false);
    }
  }, [displayedStation, loadAudioSound]);

  useEffect(() => {
    if (stationProp) {
      setDisplayedStation(stationProp);
      setIsOverlayMounted(true);
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
  }, [overlaySlideAnimation, stationProp]);

  useEffect(() => {
    setSelectedQuizOption(null);
    setQuizResult(null);
    setWordleInput("");
    setWordleAttempts([]);
    setWordleResult(null);
    setHangmanInput("");
    setHangmanGuessedLetters([]);
    setHangmanMisses([]);
    setHangmanResult(null);
    setMastermindInput("");
    setMastermindAttempts([]);
    setMastermindResult(null);
    setAnagramInput("");
    setAnagramAttempts(0);
    setAnagramResult(null);
    setCaesarInput("");
    setCaesarAttempts(0);
    setCaesarResult(null);
    setMemoryDeck(displayedStation ? resolveMemoryDeck(displayedStation) : []);
    setMemorySelection([]);
    setMemoryMistakes(0);
    setMemoryResult(null);
    setMemoryBusy(false);
    setSimonInput([]);
    setSimonHintVisible(true);
    setSimonResult(null);
    setRebusInput("");
    setRebusAttempts(0);
    setRebusResult(null);
    setBoggleInput("");
    setBoggleAttempts(0);
    setBoggleResult(null);
    setMiniSudokuValues(["", "", "", ""]);
    setMiniSudokuAttempts(0);
    setMiniSudokuResult(null);
    setMatchingSelectionLeft(null);
    setMatchingMatchedLeft([]);
    setMatchingAttempts(0);
    setMatchingResult(null);
    setVerificationCode("");
    setCodeResult(null);
    setQuizSubmitError(null);
    setAudioLoadError(null);
    setIsAudioLoading(false);
    setIsAudioPlaying(false);
    setImageLoadFailed(false);
    setQuizIconLoadFailed(false);
    setIsSubmittingQuizAnswer(false);
    setIsSubmittingWordleGuess(false);
    setIsSubmittingHangmanGuess(false);
    setIsSubmittingMastermindGuess(false);
    setIsSubmittingAnagram(false);
    setIsSubmittingCaesar(false);
    setIsSubmittingMemory(false);
    setIsSubmittingSimon(false);
    setIsSubmittingRebus(false);
    setIsSubmittingBoggle(false);
    setIsSubmittingMiniSudoku(false);
    setIsSubmittingMatching(false);
    setIsSubmittingCode(false);
    setIsCodeInputInvalid(false);
    setIsCodeInputSuccess(false);
    setNowMs(Date.now());
    quizFeedbackAnimation.setValue(0);
    timerPulseAnimation.setValue(0);
    codeInputShakeAnimation.setValue(0);
    if (codeInputResetTimeoutRef.current) {
      clearTimeout(codeInputResetTimeoutRef.current);
      codeInputResetTimeoutRef.current = null;
    }
    if (codeInputSuccessTimeoutRef.current) {
      clearTimeout(codeInputSuccessTimeoutRef.current);
      codeInputSuccessTimeoutRef.current = null;
    }
    timerPulseLoopRef.current?.stop();
    if (memoryHideTimeoutRef.current) {
      clearTimeout(memoryHideTimeoutRef.current);
      memoryHideTimeoutRef.current = null;
    }
    if (simonHintTimeoutRef.current) {
      clearTimeout(simonHintTimeoutRef.current);
      simonHintTimeoutRef.current = null;
    }
    timeoutPopupShownRef.current = false;
  }, [codeInputShakeAnimation, displayedStation?.stationId, quizFeedbackAnimation, timerPulseAnimation]);

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldRouteThroughEarpiece: false,
      shouldPlayInBackground: false,
    }).catch(() => undefined);

    return () => {
      void unloadAudioSound();
    };
  }, [unloadAudioSound]);

  useEffect(() => {
    if (!displayedStation || displayedStation.stationType !== "audio-quiz") {
      void unloadAudioSound();
      return;
    }

    const audioUrl = displayedStation.quizAudioUrl?.trim() ?? "";
    if (!audioUrl) {
      void unloadAudioSound();
      setAudioLoadError("Brak źródła audio dla tego stanowiska.");
      return;
    }

    let cancelled = false;
    void loadAudioSound(audioUrl).then((loadedSound) => {
      if (!cancelled || !loadedSound) {
        return;
      }

      try {
        loadedSound.pause();
      } catch {
        // noop
      }
      try {
        loadedSound.remove();
      } catch {
        // noop
      }
      if (audioPlayerRef.current === loadedSound) {
        audioPlayerRef.current = null;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [displayedStation, loadAudioSound, unloadAudioSound]);

  useEffect(() => {
    if (!displayedStation || displayedStation.stationType !== "simon") {
      if (simonHintTimeoutRef.current) {
        clearTimeout(simonHintTimeoutRef.current);
        simonHintTimeoutRef.current = null;
      }
      return;
    }

    setSimonHintVisible(true);
    if (simonHintTimeoutRef.current) {
      clearTimeout(simonHintTimeoutRef.current);
    }
    simonHintTimeoutRef.current = setTimeout(() => {
      setSimonHintVisible(false);
      simonHintTimeoutRef.current = null;
    }, 2300);
  }, [displayedStation?.stationId, displayedStation?.stationType]);

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
      if (simonHintTimeoutRef.current) {
        clearTimeout(simonHintTimeoutRef.current);
        simonHintTimeoutRef.current = null;
      }
      void unloadAudioSound();
    };
  }, [unloadAudioSound]);

  useEffect(() => {
    if (
      !displayedStation ||
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0 ||
      displayedStation.status === "done" ||
      displayedStation.status === "failed"
    ) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const now = Date.now();
      setNowMs(now);
      const msToNextSecond = 1000 - (now % 1000);
      timeout = setTimeout(tick, Math.max(40, msToNextSecond + 12));
    };

    tick();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [displayedStation]);

  const remainingTimeSeconds = (() => {
    if (
      !displayedStation ||
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0
    ) {
      return null;
    }

    const startedMs = new Date(displayedStation.startedAt).getTime();
    if (!Number.isFinite(startedMs)) {
      return null;
    }

    const endsAtMs = startedMs + displayedStation.timeLimitSeconds * 1000;
    const remainingMs = Math.max(0, endsAtMs - nowMs);
    return Math.max(0, Math.ceil(remainingMs / 1000));
  })();
  const finalTenSecondsProgress =
    remainingTimeSeconds !== null && remainingTimeSeconds <= 10 ? clamp01((10 - remainingTimeSeconds) / 10) : 0;
  const isUrgentPulse = remainingTimeSeconds !== null && remainingTimeSeconds <= 10;
  const hasCountdownForPulse = Boolean(
    displayedStation?.startedAt &&
      displayedStation.timeLimitSeconds > 0 &&
      displayedStation.status !== "done" &&
      displayedStation.status !== "failed",
  );
  const hasTimerStartedForPulse = Boolean(displayedStation?.startedAt);
  const stationStatusForPulse = displayedStation?.status;

  useEffect(() => {
    timerPulseLoopRef.current?.stop();
    timerPulseAnimation.setValue(0);

    if (
      !isOverlayMounted ||
      !hasCountdownForPulse ||
      !hasTimerStartedForPulse ||
      stationStatusForPulse === "done" ||
      stationStatusForPulse === "failed" ||
      remainingTimeSeconds === null
    ) {
      return;
    }

    const pulseDuration = isUrgentPulse ? 220 : 620;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulseAnimation, {
          toValue: 1,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
        Animated.timing(timerPulseAnimation, {
          toValue: 0,
          duration: pulseDuration,
          useNativeDriver: true,
        }),
      ]),
    );

    timerPulseLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [
    hasCountdownForPulse,
    hasTimerStartedForPulse,
    isUrgentPulse,
    isOverlayMounted,
    stationStatusForPulse,
    timerPulseAnimation,
  ]);

  useEffect(() => {
    if (!displayedStation || !isQuizStationType(displayedStation.stationType)) {
      return;
    }

    if (
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0 ||
      displayedStation.status === "done" ||
      displayedStation.status === "failed"
    ) {
      return;
    }

    if (remainingTimeSeconds === null || remainingTimeSeconds > 0) {
      return;
    }

    const isQuizAnswerPending =
      (displayedStation.stationType === "quiz" || displayedStation.stationType === "audio-quiz") &&
      (selectedQuizOption !== null || isSubmittingQuizAnswer);
    const isWordlePending = displayedStation.stationType === "wordle" && isSubmittingWordleGuess;
    const isHangmanPending = displayedStation.stationType === "hangman" && isSubmittingHangmanGuess;
    const isMastermindPending = displayedStation.stationType === "mastermind" && isSubmittingMastermindGuess;
    const isAnagramPending = displayedStation.stationType === "anagram" && isSubmittingAnagram;
    const isCaesarPending = displayedStation.stationType === "caesar-cipher" && isSubmittingCaesar;
    const isMemoryPending = displayedStation.stationType === "memory" && isSubmittingMemory;
    const isSimonPending = displayedStation.stationType === "simon" && isSubmittingSimon;
    const isRebusPending = displayedStation.stationType === "rebus" && isSubmittingRebus;
    const isBogglePending = displayedStation.stationType === "boggle" && isSubmittingBoggle;
    const isMiniSudokuPending = displayedStation.stationType === "mini-sudoku" && isSubmittingMiniSudoku;
    const isMatchingPending = displayedStation.stationType === "matching" && isSubmittingMatching;
    if (
      isQuizAnswerPending ||
      isWordlePending ||
      isHangmanPending ||
      isMastermindPending ||
      isAnagramPending ||
      isCaesarPending ||
      isMemoryPending ||
      isSimonPending ||
      isRebusPending ||
      isBogglePending ||
      isMiniSudokuPending ||
      isMatchingPending ||
      timeoutPopupShownRef.current
    ) {
      return;
    }

    timeoutPopupShownRef.current = true;
    onQuizFailed?.(displayedStation.stationId, "time_limit_expired");
    const timeoutMessage =
      displayedStation.stationType === "wordle"
        ? "Czas na Wordle minął. Zadanie nie zostało zaliczone."
        : displayedStation.stationType === "hangman"
          ? "Czas na Wisielca minął. Zadanie nie zostało zaliczone."
          : displayedStation.stationType === "mastermind"
            ? "Czas na Mastermind minął. Zadanie nie zostało zaliczone."
            : displayedStation.stationType === "anagram"
              ? "Czas na anagram minął. Zadanie nie zostało zaliczone."
              : displayedStation.stationType === "caesar-cipher"
                ? "Czas na szyfr Cezara minął. Zadanie nie zostało zaliczone."
                : displayedStation.stationType === "memory"
                  ? "Czas na grę Memory minął. Zadanie nie zostało zaliczone."
                  : displayedStation.stationType === "simon"
                    ? "Czas na grę Simon minął. Zadanie nie zostało zaliczone."
                    : displayedStation.stationType === "rebus"
                      ? "Czas na rebus minął. Zadanie nie zostało zaliczone."
                      : displayedStation.stationType === "boggle"
                        ? "Czas na Boggle minął. Zadanie nie zostało zaliczone."
                        : displayedStation.stationType === "mini-sudoku"
                          ? "Czas na mini Sudoku minął. Zadanie nie zostało zaliczone."
                          : displayedStation.stationType === "matching"
                            ? "Czas na łączenie par minął. Zadanie nie zostało zaliczone."
          : "Czas na quiz minął. Zadanie nie zostało zaliczone.";
    Alert.alert("Czas minął", timeoutMessage, [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  }, [
    displayedStation,
    isSubmittingAnagram,
    isSubmittingBoggle,
    isSubmittingCaesar,
    isSubmittingHangmanGuess,
    isSubmittingMastermindGuess,
    isSubmittingMatching,
    isSubmittingMemory,
    isSubmittingMiniSudoku,
    isSubmittingQuizAnswer,
    isSubmittingRebus,
    isSubmittingSimon,
    isSubmittingWordleGuess,
    onClose,
    onQuizFailed,
    remainingTimeSeconds,
    selectedQuizOption,
  ]);

  useEffect(() => {
    if (!displayedStation || isQuizStationType(displayedStation.stationType)) {
      return;
    }

    if (
      !displayedStation.startedAt ||
      displayedStation.timeLimitSeconds <= 0 ||
      displayedStation.status === "done" ||
      displayedStation.status === "failed"
    ) {
      return;
    }

    if (remainingTimeSeconds === null || remainingTimeSeconds > 0) {
      return;
    }

    if (isSubmittingCode || timeoutPopupShownRef.current) {
      return;
    }

    timeoutPopupShownRef.current = true;
    onTimeExpired?.(displayedStation.stationId);
    Alert.alert("Czas minął", "Czas na ukończenie zadania się skończył. Zadanie nie zostało zaliczone.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  }, [
    displayedStation,
    isSubmittingCode,
    onClose,
    onTimeExpired,
    remainingTimeSeconds,
  ]);

  if (!isOverlayMounted || !displayedStation) {
    return null;
  }
  const station = displayedStation;

  const isClassicQuizStation = station.stationType === "quiz";
  const isAudioQuizStation = station.stationType === "audio-quiz";
  const isWordleStation = station.stationType === "wordle";
  const isHangmanStation = station.stationType === "hangman";
  const isMastermindStation = station.stationType === "mastermind";
  const isAnagramStation = station.stationType === "anagram";
  const isCaesarStation = station.stationType === "caesar-cipher";
  const isMemoryStation = station.stationType === "memory";
  const isSimonStation = station.stationType === "simon";
  const isRebusStation = station.stationType === "rebus";
  const isBoggleStation = station.stationType === "boggle";
  const isMiniSudokuStation = station.stationType === "mini-sudoku";
  const isMatchingStation = station.stationType === "matching";
  const isQuizStation = isQuizStationType(station.stationType);
  const requiresCode = station.stationType === "time" || station.stationType === "points";
  const isNumericCodeStation =
    requiresCode && station.completionCodeInputMode === "numeric";
  const normalizedImageUrl = station.imageUrl?.trim() || "";
  const isDicebearFallback = normalizedImageUrl.includes("api.dicebear.com/9.x/shapes/svg");
  const shouldShowQuizFallbackGraphic =
    isQuizStation && (imageLoadFailed || !normalizedImageUrl || isDicebearFallback);
  const stationImageUri = shouldShowQuizFallbackGraphic ? undefined : normalizedImageUrl || undefined;
  const stationDescription = station.description.trim();
  const stationMediaHeight = (() => {
    if (isNumericCodeStation) {
      return Math.max(104, Math.round(viewportHeight * 0.14));
    }
    if (requiresCode) {
      return Math.max(128, Math.round(viewportHeight * 0.2));
    }
    if (isWordleStation) {
      return Math.max(230, Math.round(viewportHeight * 0.4));
    }
    return Math.max(190, Math.round(viewportHeight * 0.33));
  })();
  const hasTimerStarted = Boolean(station.startedAt);
  const hasQuizAnswer = selectedQuizOption !== null;
  const wordleSecret = isWordleStation ? resolvePuzzleSecret(station, "wordle") : "";
  const wordleLength = Array.from(wordleSecret).length;
  const wordleDisplayLength = Math.max(1, wordleLength || 5);
  const normalizedWordleInput = normalizeWordleSecret(wordleInput).slice(0, wordleLength || 32);
  const wordleInputCharacters = useMemo(() => Array.from(normalizedWordleInput), [normalizedWordleInput]);
  const normalizedWordleAttemptsCount = wordleAttempts.length;
  const wordleSolved = wordleAttempts.some((attempt) => attempt.evaluation.every((cell) => cell === "correct"));
  const wordleAttemptsLeft = Math.max(0, WORDLE_MAX_ATTEMPTS - normalizedWordleAttemptsCount);
  const wordleKeyStateByLetter = useMemo(() => {
    const statePriority: Record<WordleCellState, number> = {
      absent: 1,
      present: 2,
      correct: 3,
    };
    const map = new Map<string, WordleCellState>();

    wordleAttempts.forEach((attempt) => {
      const guessCharacters = Array.from(attempt.guess);
      attempt.evaluation.forEach((state, index) => {
        const letter = (guessCharacters[index] ?? "").toUpperCase();
        if (!letter) {
          return;
        }
        const current = map.get(letter);
        if (!current || statePriority[state] > statePriority[current]) {
          map.set(letter, state);
        }
      });
    });

    return map;
  }, [wordleAttempts]);
  const [wordleKeyboardContainerWidth, setWordleKeyboardContainerWidth] = useState(0);
  const wordleKeyboardKeyGap = 2;
  const wordleKeyboardKeyWidth = useMemo(() => {
    const availableWidth =
      wordleKeyboardContainerWidth > 0 ? wordleKeyboardContainerWidth : Math.max(260, viewportWidth - 72);
    return Math.max(24, Math.floor((availableWidth - 9 * wordleKeyboardKeyGap) / 10));
  }, [viewportWidth, wordleKeyboardContainerWidth, wordleKeyboardKeyGap]);
  const wordleBoardCellSize = wordleKeyboardKeyWidth;
  const guessedHangmanSet = new Set(hangmanGuessedLetters);
  const hangmanSecret = isHangmanStation ? resolvePuzzleSecret(station, "hangman") : "";
  const hangmanMaskedSecret = isHangmanStation
    ? Array.from(hangmanSecret)
        .map((character) => {
          if (!isGuessableHangmanCharacter(character)) {
            return character;
          }

          return guessedHangmanSet.has(character) ? character : "_";
        })
        .join(" ")
    : "";
  const normalizedHangmanInput = normalizeHangmanSecret(hangmanInput).replace(/[^A-ZĄĆĘŁŃÓŚŹŻ0-9]/g, "").slice(0, 1);
  const hangmanHasWon = isHangmanStation
    ? Array.from(hangmanSecret).every((character) => !isGuessableHangmanCharacter(character) || guessedHangmanSet.has(character))
    : false;
  const hangmanAttemptsLeft = Math.max(0, HANGMAN_MAX_MISSES - hangmanMisses.length);
  const puzzleSourceAnswer = resolveCorrectAnswerText(station);
  const mastermindSecret = isMastermindStation ? resolveMastermindSecret(station) : "";
  const normalizedMastermindInput = mastermindInput
    .toUpperCase()
    .replace(/[^A-F]/g, "")
    .slice(0, 4);
  const mastermindSolved = mastermindAttempts.some((attempt) => attempt.exact === mastermindSecret.length);
  const mastermindAttemptsLeft = Math.max(0, MASTERMIND_MAX_ATTEMPTS - mastermindAttempts.length);
  const anagramTarget = isAnagramStation ? normalizePuzzleWord(puzzleSourceAnswer || station.name) : "";
  const anagramScrambled = isAnagramStation ? scrambleWord(anagramTarget || "SURVIVOR", station.stationId) : "";
  const normalizedAnagramInput = normalizePuzzleWord(anagramInput);
  const anagramAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - anagramAttempts);
  const caesarDecoded = isCaesarStation ? normalizePuzzleText(puzzleSourceAnswer || station.name || "SURVIVOR QUEST") : "";
  const caesarEncoded = isCaesarStation ? caesarShift(caesarDecoded, CAESAR_SHIFT) : "";
  const normalizedCaesarInput = normalizePuzzleText(caesarInput);
  const caesarAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - caesarAttempts);
  const memoryMatchedCount = memoryDeck.filter((card) => card.matched).length;
  const memoryAllMatched = isMemoryStation && memoryDeck.length > 0 && memoryMatchedCount === memoryDeck.length;
  const memoryAttemptsLeft = Math.max(0, MEMORY_MAX_MISTAKES - memoryMistakes);
  const simonSequence = isSimonStation ? resolveSimonSequence(station) : [];
  const simonHiddenHint = simonSequence.map(() => "•").join(" ");
  const simonProgress = simonInput.length;
  const rebusAnswer = isRebusStation ? normalizePuzzleText(puzzleSourceAnswer || station.name || "SURVIVOR") : "";
  const normalizedRebusInput = normalizePuzzleText(rebusInput);
  const rebusAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - rebusAttempts);
  const boggleTargetWord = isBoggleStation ? resolveBoggleTarget(station) : "";
  const boggleBoardLetters = isBoggleStation ? resolveBoggleBoard(station, boggleTargetWord || "TEAM") : [];
  const normalizedBoggleInput = normalizePuzzleWord(boggleInput);
  const boggleAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - boggleAttempts);
  const miniSudokuPuzzle = isMiniSudokuStation ? resolveMiniSudokuPuzzle(station) : null;
  const normalizedMiniSudokuValues = miniSudokuValues.map((value) => value.replace(/[^1-2]/g, "").slice(0, 1));
  const miniSudokuAttemptsLeft = Math.max(0, TEXT_PUZZLE_MAX_ATTEMPTS - miniSudokuAttempts);
  const matchingPairs = isMatchingStation ? resolveMatchingPairs(station) : [];
  const matchingRightOptions = isMatchingStation
    ? shuffleDeterministic(
        matchingPairs.map((pair) => pair.right),
        `${station.stationId}-matching-right`,
      )
    : [];
  const matchingAllMatched = isMatchingStation && matchingMatchedLeft.length === matchingPairs.length && matchingPairs.length > 0;
  const matchingAttemptsLeft = Math.max(0, MEMORY_MAX_MISTAKES - matchingAttempts);
  const feedbackTone =
    hasQuizAnswer && station.quizCorrectAnswerIndex === selectedQuizOption ? "success" : hasQuizAnswer ? "error" : null;
  const remainingTimeLabel = remainingTimeSeconds !== null ? formatRemainingTimeLabel(remainingTimeSeconds) : null;
  const timerScalePeak = 1.04 + finalTenSecondsProgress * 0.14;
  const timerMinOpacity = 0.94 - finalTenSecondsProgress * 0.18;
  const timerTextColor =
    hasTimerStarted && station.timeLimitSeconds > 0
      ? blendHexColors(EXPEDITION_THEME.textPrimary, EXPEDITION_THEME.danger, finalTenSecondsProgress)
      : EXPEDITION_THEME.textPrimary;
  const timerPulseStyle =
    hasTimerStarted && station.timeLimitSeconds > 0 && remainingTimeSeconds !== null
      ? ({
          opacity: timerPulseAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [timerMinOpacity, 1],
          }),
          transform: [
            {
              scale: timerPulseAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, timerScalePeak],
              }),
            },
          ],
        } as const)
      : undefined;
  const executionTimeLabel = remainingTimeLabel ?? station.timeLimitLabel;
  const shouldShowExecutionTimer = executionTimeLabel.trim().length > 0;
  const hasTimedLimit = station.timeLimitSeconds > 0;
  const isTimeExpired =
    hasTimedLimit &&
    hasTimerStarted &&
    remainingTimeSeconds !== null &&
    remainingTimeSeconds <= 0;
  const isWordleInteractiveDisabled =
    station.status === "done" ||
    station.status === "failed" ||
    isSubmittingWordleGuess ||
    (hasTimedLimit && !hasTimerStarted) ||
    isTimeExpired ||
    wordleAttemptsLeft <= 0 ||
    wordleSolved;
  const hasAudioSource = Boolean(station.quizAudioUrl?.trim());
  const isCodeActionDisabled =
    station.status === "done" ||
    station.status === "failed" ||
    isSubmittingCode ||
    isCodeInputSuccess ||
    (hasTimedLimit && !hasTimerStarted) ||
    isTimeExpired;
  const isInteractiveLocked =
    station.status === "done" ||
    station.status === "failed" ||
    (hasTimedLimit && !hasTimerStarted) ||
    isTimeExpired;
  const matchedRightSet = new Set(
    matchingMatchedLeft
      .map((leftKey) => matchingPairs.find((pair) => pair.left === leftKey)?.right ?? "")
      .filter((value) => value.length > 0),
  );
  const codeInputShakeStyle = {
    transform: [{ translateX: codeInputShakeAnimation }],
  } as const;
  const triggerInvalidCodeFeedback = () => {
    setIsCodeInputInvalid(true);
    codeInputShakeAnimation.stopAnimation();
    codeInputShakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(codeInputShakeAnimation, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: -4, duration: 35, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 4, duration: 35, useNativeDriver: true }),
      Animated.timing(codeInputShakeAnimation, { toValue: 0, duration: 35, useNativeDriver: true }),
    ]).start();

    if (codeInputResetTimeoutRef.current) {
      clearTimeout(codeInputResetTimeoutRef.current);
    }
    codeInputResetTimeoutRef.current = setTimeout(() => {
      setIsCodeInputInvalid(false);
      codeInputResetTimeoutRef.current = null;
    }, 1000);
  };
  const submitVerificationCode = async () => {
    if (!verificationCode.trim()) {
      setCodeResult("Wpisz kod, aby zatwierdzić stanowisko.");
      return;
    }

    if (!onCompleteTask) {
      setIsCodeInputInvalid(false);
      setIsCodeInputSuccess(true);
      setCodeResult("Kod zatwierdzony (tryb testowy).");
      if (codeInputSuccessTimeoutRef.current) {
        clearTimeout(codeInputSuccessTimeoutRef.current);
      }
      codeInputSuccessTimeoutRef.current = setTimeout(() => {
        codeInputSuccessTimeoutRef.current = null;
        onClose();
      }, 5000);
      return;
    }

    setIsSubmittingCode(true);
    const error = await onCompleteTask(station.stationId, verificationCode, station.startedAt ?? undefined);
    setIsSubmittingCode(false);

    if (error) {
      if (isInvalidCompletionCodeErrorMessage(error)) {
        setCodeResult(null);
        triggerInvalidCodeFeedback();
        return;
      }
      setCodeResult(error);
      return;
    }

    setIsCodeInputInvalid(false);
    setIsCodeInputSuccess(true);
    setCodeResult("Kod zatwierdzony.");
    if (codeInputSuccessTimeoutRef.current) {
      clearTimeout(codeInputSuccessTimeoutRef.current);
    }
    codeInputSuccessTimeoutRef.current = setTimeout(() => {
      codeInputSuccessTimeoutRef.current = null;
      onClose();
    }, 5000);
  };
  const submitWordleGuess = async () => {
    if (!isWordleStation) {
      return;
    }

    if (!normalizedWordleInput.trim()) {
      setWordleResult("Wpisz próbę, aby sprawdzić słowo.");
      return;
    }

    if (!wordleLength || normalizedWordleInput.length !== wordleLength) {
      setWordleResult(`Słowo musi mieć dokładnie ${wordleLength} znaków.`);
      return;
    }

    if (
      station.status === "done" ||
      station.status === "failed" ||
      isSubmittingWordleGuess ||
      (hasTimedLimit && !hasTimerStarted) ||
      isTimeExpired
    ) {
      return;
    }

    if (wordleAttempts.length >= WORDLE_MAX_ATTEMPTS) {
      setWordleResult("Wykorzystano wszystkie próby.");
      return;
    }

    const evaluation = buildWordleEvaluation(normalizedWordleInput, wordleSecret);
    const nextAttempts = [...wordleAttempts, { guess: normalizedWordleInput, evaluation }];
    setWordleAttempts(nextAttempts);
    setWordleInput("");
    setQuizSubmitError(null);

    const solved = evaluation.every((item) => item === "correct");
    if (!solved) {
      const exhausted = nextAttempts.length >= WORDLE_MAX_ATTEMPTS;
      if (!exhausted) {
        setWordleResult("Nietrafione — spróbuj ponownie.");
        return;
      }

      setWordleResult("Brak prób. Zadanie niezaliczone.");
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      Alert.alert("Nie zaliczono", "Wykorzystano wszystkie próby Wordle.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    if (!onCompleteTask) {
      setWordleResult("Brawo! Poprawne słowo.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Poprawne słowo. Zadanie zaliczone.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingWordleGuess(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingWordleGuess(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    setWordleResult("Brawo! Poprawne słowo.");
    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Poprawne słowo. Zadanie zaliczone.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  useEffect(() => {
    if (wordleResult !== null) {
      setWordleResult(null);
    }
    if (quizSubmitError !== null) {
      setQuizSubmitError(null);
    }
  }, [normalizedWordleInput]);
  const submitQuizAnswer = async (index: number) => {
    if (!isClassicQuizStation && !isAudioQuizStation) {
      return;
    }

    if (
      selectedQuizOption !== null ||
      isSubmittingQuizAnswer ||
      station.status === "done" ||
      station.status === "failed" ||
      (hasTimedLimit && !hasTimerStarted) ||
      isTimeExpired
    ) {
      return;
    }

    setSelectedQuizOption(index);
    setQuizSubmitError(null);
    const correct = station.quizCorrectAnswerIndex === index;
    setQuizResult(correct ? "Dobra odpowiedź" : "Zła odpowiedź");
    quizFeedbackAnimation.setValue(0);
    Animated.timing(quizFeedbackAnimation, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();

    if (!correct) {
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      Alert.alert("Nie zaliczono", "Wybrano nieprawidłową odpowiedź.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    if (!onCompleteTask) {
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Poprawna odpowiedź. Zadanie zaliczone.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingQuizAnswer(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingQuizAnswer(false);

    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Poprawna odpowiedź. Zadanie zaliczone.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  const submitHangmanGuess = async (forcedLetter?: string) => {
    if (!isHangmanStation) {
      return;
    }

    const candidate = (forcedLetter ?? normalizedHangmanInput).trim();
    const letter = normalizeHangmanSecret(candidate).replace(/[^A-ZĄĆĘŁŃÓŚŹŻ0-9]/g, "").slice(0, 1);

    if (!letter) {
      setHangmanResult("Wpisz jedną literę.");
      return;
    }

    if (
      station.status === "done" ||
      station.status === "failed" ||
      isSubmittingHangmanGuess ||
      (hasTimedLimit && !hasTimerStarted) ||
      isTimeExpired
    ) {
      return;
    }

    if (guessedHangmanSet.has(letter) || hangmanMisses.includes(letter)) {
      setHangmanInput("");
      setHangmanResult("Ta litera była już sprawdzana.");
      return;
    }

    const isHit = hangmanSecret.includes(letter);
    const nextGuessedLetters = isHit ? [...hangmanGuessedLetters, letter] : hangmanGuessedLetters;
    const nextMisses = isHit ? hangmanMisses : [...hangmanMisses, letter];
    setHangmanInput("");
    setQuizSubmitError(null);

    if (isHit) {
      setHangmanGuessedLetters(nextGuessedLetters);
    } else {
      setHangmanMisses(nextMisses);
    }

    const solvedNow = Array.from(hangmanSecret).every(
      (character) =>
        !isGuessableHangmanCharacter(character) || nextGuessedLetters.includes(character),
    );

    if (!solvedNow) {
      if (!isHit && nextMisses.length >= HANGMAN_MAX_MISSES) {
        setHangmanResult(`Brak prób. Hasło: ${hangmanSecret}`);
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        Alert.alert("Nie zaliczono", "Wykorzystano wszystkie próby w Wisielcu.", [
          {
            text: "Wróć do mapy",
            onPress: onClose,
          },
        ]);
        return;
      }

      setHangmanResult(isHit ? "Dobra litera!" : "Pudło.");
      return;
    }

    if (!onCompleteTask) {
      setHangmanResult("Brawo! Odkryto całe hasło.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Hasło odgadnięte. Zadanie zaliczone.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingHangmanGuess(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingHangmanGuess(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    setHangmanResult("Brawo! Odkryto całe hasło.");
    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Hasło odgadnięte. Zadanie zaliczone.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  const submitMastermindGuess = async () => {
    if (!isMastermindStation) {
      return;
    }

    if (normalizedMastermindInput.length !== mastermindSecret.length) {
      setMastermindResult(`Kod musi mieć ${mastermindSecret.length} znaki i używać liter A-F.`);
      return;
    }

    if (isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0) {
      return;
    }

    const feedback = buildMastermindFeedback(normalizedMastermindInput, mastermindSecret);
    const nextAttempts = [...mastermindAttempts, { guess: normalizedMastermindInput, ...feedback }];
    setMastermindAttempts(nextAttempts);
    setMastermindInput("");
    setQuizSubmitError(null);

    if (feedback.exact !== mastermindSecret.length) {
      if (nextAttempts.length >= MASTERMIND_MAX_ATTEMPTS) {
        setMastermindResult(`Brak prób. Poprawny kod: ${mastermindSecret}`);
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        Alert.alert("Nie zaliczono", "Wyczerpano próby w Mastermind.", [
          {
            text: "Wróć do mapy",
            onPress: onClose,
          },
        ]);
        return;
      }
      setMastermindResult(`Trafione: ${feedback.exact}, na złej pozycji: ${feedback.misplaced}.`);
      return;
    }

    if (!onCompleteTask) {
      setMastermindResult("Brawo! Kod odgadnięty.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Kod odgadnięty. Zadanie zaliczone.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingMastermindGuess(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingMastermindGuess(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    setMastermindResult("Brawo! Kod odgadnięty.");
    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Kod odgadnięty. Zadanie zaliczone.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  const submitAnagram = async () => {
    if (!isAnagramStation) {
      return;
    }

    if (!normalizedAnagramInput) {
      setAnagramResult("Wpisz rozwiązanie anagramu.");
      return;
    }

    if (isInteractiveLocked || isSubmittingAnagram || anagramAttemptsLeft <= 0) {
      return;
    }

    setQuizSubmitError(null);
    const isCorrect = normalizedAnagramInput === anagramTarget;
    if (!isCorrect) {
      const nextAttempts = anagramAttempts + 1;
      setAnagramAttempts(nextAttempts);
      if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
        setAnagramResult(`Brak prób. Poprawne słowo: ${anagramTarget}`);
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        Alert.alert("Nie zaliczono", "Nie udało się rozwiązać anagramu.", [
          {
            text: "Wróć do mapy",
            onPress: onClose,
          },
        ]);
        return;
      }

      setAnagramResult("Niepoprawnie. Spróbuj ponownie.");
      return;
    }

    if (!onCompleteTask) {
      setAnagramResult("Brawo! Anagram rozwiązany.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Anagram rozwiązany poprawnie.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingAnagram(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingAnagram(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    setAnagramResult("Brawo! Anagram rozwiązany.");
    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Anagram rozwiązany poprawnie.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  const submitCaesar = async () => {
    if (!isCaesarStation) {
      return;
    }

    if (!normalizedCaesarInput) {
      setCaesarResult("Wpisz odszyfrowaną frazę.");
      return;
    }

    if (isInteractiveLocked || isSubmittingCaesar || caesarAttemptsLeft <= 0) {
      return;
    }

    setQuizSubmitError(null);
    const isCorrect = normalizedCaesarInput === caesarDecoded;
    if (!isCorrect) {
      const nextAttempts = caesarAttempts + 1;
      setCaesarAttempts(nextAttempts);
      if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
        setCaesarResult(`Brak prób. Poprawna fraza: ${caesarDecoded}`);
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        Alert.alert("Nie zaliczono", "Nie udało się odszyfrować frazy.", [
          {
            text: "Wróć do mapy",
            onPress: onClose,
          },
        ]);
        return;
      }

      setCaesarResult("Niepoprawnie. Sprawdź przesunięcie i spróbuj ponownie.");
      return;
    }

    if (!onCompleteTask) {
      setCaesarResult("Brawo! Fraza odszyfrowana.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Szyfr Cezara rozwiązany poprawnie.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingCaesar(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingCaesar(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    setCaesarResult("Brawo! Fraza odszyfrowana.");
    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Szyfr Cezara rozwiązany poprawnie.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  const handleMemoryCardPress = async (cardId: string) => {
    if (!isMemoryStation || isInteractiveLocked || memoryBusy || isSubmittingMemory || memoryAllMatched || memoryAttemptsLeft <= 0) {
      return;
    }

    const card = memoryDeck.find((entry) => entry.id === cardId);
    if (!card || card.matched || card.revealed || memorySelection.length >= 2) {
      return;
    }

    const nextDeck = memoryDeck.map((entry) => (entry.id === cardId ? { ...entry, revealed: true } : entry));
    const nextSelection = [...memorySelection, cardId];
    setMemoryDeck(nextDeck);
    setMemorySelection(nextSelection);
    setQuizSubmitError(null);

    if (nextSelection.length < 2) {
      return;
    }

    const [firstId, secondId] = nextSelection;
    const firstCard = nextDeck.find((entry) => entry.id === firstId);
    const secondCard = nextDeck.find((entry) => entry.id === secondId);
    if (!firstCard || !secondCard) {
      setMemorySelection([]);
      return;
    }

    if (firstCard.symbol === secondCard.symbol) {
      const matchedDeck = nextDeck.map((entry) =>
        entry.id === firstId || entry.id === secondId ? { ...entry, matched: true } : entry,
      );
      setMemoryDeck(matchedDeck);
      setMemorySelection([]);
      if (matchedDeck.every((entry) => entry.matched)) {
        if (!onCompleteTask) {
          setMemoryResult("Brawo! Wszystkie pary znalezione.");
          onQuizPassed?.(station.stationId);
          Alert.alert("Zaliczono", "Gra Memory ukończona.", [
            {
              text: "Wróć do mapy",
              onPress: onClose,
            },
          ]);
          return;
        }

        setIsSubmittingMemory(true);
        const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
        setIsSubmittingMemory(false);
        if (error) {
          setQuizSubmitError(error);
          Alert.alert("Błąd", error);
          return;
        }
        setMemoryResult("Brawo! Wszystkie pary znalezione.");
        onQuizPassed?.(station.stationId);
        Alert.alert("Zaliczono", "Gra Memory ukończona.", [
          {
            text: "Wróć do mapy",
            onPress: onClose,
          },
        ]);
      } else {
        setMemoryResult("Dobrze! Para znaleziona.");
      }
      return;
    }

    const nextMistakes = memoryMistakes + 1;
    setMemoryMistakes(nextMistakes);
    setMemoryBusy(true);
    setMemoryResult("Pudło. Spróbuj zapamiętać pozycje.");
    if (memoryHideTimeoutRef.current) {
      clearTimeout(memoryHideTimeoutRef.current);
    }
    memoryHideTimeoutRef.current = setTimeout(() => {
      setMemoryDeck((current) =>
        current.map((entry) =>
          nextSelection.includes(entry.id) && !entry.matched ? { ...entry, revealed: false } : entry,
        ),
      );
      setMemorySelection([]);
      setMemoryBusy(false);
      memoryHideTimeoutRef.current = null;
    }, 650);

    if (nextMistakes >= MEMORY_MAX_MISTAKES) {
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      Alert.alert("Nie zaliczono", "Za dużo błędnych prób w Memory.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
    }
  };
  const handleSimonPress = async (buttonId: string) => {
    if (!isSimonStation || isInteractiveLocked || isSubmittingSimon || simonInput.length >= simonSequence.length) {
      return;
    }

    const nextInput = [...simonInput, buttonId];
    setSimonInput(nextInput);
    setQuizSubmitError(null);

    const isPrefixValid = nextInput.every((entry, index) => entry === simonSequence[index]);
    if (!isPrefixValid) {
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      setSimonResult("Błędna sekwencja.");
      Alert.alert("Nie zaliczono", "Sekwencja Simona została przerwana.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    if (nextInput.length < simonSequence.length) {
      setSimonResult(`Dobrze! Postęp: ${nextInput.length}/${simonSequence.length}`);
      return;
    }

    if (!onCompleteTask) {
      setSimonResult("Brawo! Sekwencja poprawna.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Sekwencja Simona odtworzona poprawnie.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingSimon(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingSimon(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    setSimonResult("Brawo! Sekwencja poprawna.");
    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Sekwencja Simona odtworzona poprawnie.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  const submitRebus = async () => {
    if (!isRebusStation) {
      return;
    }

    if (!normalizedRebusInput) {
      setRebusResult("Wpisz rozwiązanie rebusu.");
      return;
    }

    if (isInteractiveLocked || isSubmittingRebus || rebusAttemptsLeft <= 0) {
      return;
    }

    setQuizSubmitError(null);
    const isCorrect = normalizedRebusInput === rebusAnswer;
    if (!isCorrect) {
      const nextAttempts = rebusAttempts + 1;
      setRebusAttempts(nextAttempts);
      if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
        setRebusResult(`Brak prób. Poprawna odpowiedź: ${rebusAnswer}`);
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        Alert.alert("Nie zaliczono", "Nie udało się rozwiązać rebusu.", [
          {
            text: "Wróć do mapy",
            onPress: onClose,
          },
        ]);
        return;
      }

      setRebusResult("Niepoprawnie. Spróbuj ponownie.");
      return;
    }

    if (!onCompleteTask) {
      setRebusResult("Brawo! Rebus rozwiązany.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Rebus rozwiązany poprawnie.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingRebus(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingRebus(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    setRebusResult("Brawo! Rebus rozwiązany.");
    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Rebus rozwiązany poprawnie.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  const submitBoggle = async () => {
    if (!isBoggleStation) {
      return;
    }

    if (!normalizedBoggleInput || normalizedBoggleInput.length < 3) {
      setBoggleResult("Wpisz słowo (minimum 3 litery).");
      return;
    }

    if (isInteractiveLocked || isSubmittingBoggle || boggleAttemptsLeft <= 0) {
      return;
    }

    setQuizSubmitError(null);
    const lettersAvailable = canBuildWordFromLetters(boggleBoardLetters, normalizedBoggleInput);
    const traceable = canTraceWordOnBoggle(boggleBoardLetters, normalizedBoggleInput);
    const isCorrect = normalizedBoggleInput === boggleTargetWord && lettersAvailable && traceable;
    if (!isCorrect) {
      const nextAttempts = boggleAttempts + 1;
      setBoggleAttempts(nextAttempts);
      if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
        setBoggleResult(`Brak prób. Szukane słowo: ${boggleTargetWord}`);
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        Alert.alert("Nie zaliczono", "Nie znaleziono poprawnego słowa w Boggle.", [
          {
            text: "Wróć do mapy",
            onPress: onClose,
          },
        ]);
        return;
      }

      setBoggleResult("To nie jest docelowe słowo. Spróbuj ponownie.");
      return;
    }

    if (!onCompleteTask) {
      setBoggleResult("Brawo! Słowo odnalezione.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Boggle rozwiązane poprawnie.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingBoggle(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingBoggle(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    setBoggleResult("Brawo! Słowo odnalezione.");
    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Boggle rozwiązane poprawnie.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  const submitMiniSudoku = async () => {
    if (!isMiniSudokuStation || !miniSudokuPuzzle) {
      return;
    }

    if (isInteractiveLocked || isSubmittingMiniSudoku || miniSudokuAttemptsLeft <= 0) {
      return;
    }

    const attemptedValues = miniSudokuPuzzle.given.map((givenValue, index) => givenValue ?? normalizedMiniSudokuValues[index] ?? "");
    if (attemptedValues.some((value) => value !== "1" && value !== "2")) {
      setMiniSudokuResult("Uzupełnij wszystkie pola wartościami 1 lub 2.");
      return;
    }

    const rowsValid = attemptedValues[0] !== attemptedValues[1] && attemptedValues[2] !== attemptedValues[3];
    const colsValid = attemptedValues[0] !== attemptedValues[2] && attemptedValues[1] !== attemptedValues[3];
    const matchesSolution = attemptedValues.every((value, index) => value === miniSudokuPuzzle.solution[index]);
    setQuizSubmitError(null);

    if (!(rowsValid && colsValid && matchesSolution)) {
      const nextAttempts = miniSudokuAttempts + 1;
      setMiniSudokuAttempts(nextAttempts);
      if (nextAttempts >= TEXT_PUZZLE_MAX_ATTEMPTS) {
        setMiniSudokuResult(`Brak prób. Poprawny układ: ${miniSudokuPuzzle.solution.join(" ")}`);
        onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
        Alert.alert("Nie zaliczono", "Nie udało się rozwiązać mini Sudoku.", [
          {
            text: "Wróć do mapy",
            onPress: onClose,
          },
        ]);
        return;
      }

      setMiniSudokuResult("Układ niepoprawny. Sprawdź wiersze i kolumny.");
      return;
    }

    if (!onCompleteTask) {
      setMiniSudokuResult("Brawo! Mini Sudoku rozwiązane.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Mini Sudoku rozwiązane poprawnie.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setIsSubmittingMiniSudoku(true);
    const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
    setIsSubmittingMiniSudoku(false);
    if (error) {
      setQuizSubmitError(error);
      Alert.alert("Błąd", error);
      return;
    }

    setMiniSudokuResult("Brawo! Mini Sudoku rozwiązane.");
    onQuizPassed?.(station.stationId);
    Alert.alert("Zaliczono", "Mini Sudoku rozwiązane poprawnie.", [
      {
        text: "Wróć do mapy",
        onPress: onClose,
      },
    ]);
  };
  const handleMatchingRightSelect = async (rightValue: string) => {
    if (!isMatchingStation || isInteractiveLocked || isSubmittingMatching || matchingAllMatched || matchingAttemptsLeft <= 0) {
      return;
    }

    if (!matchingSelectionLeft) {
      setMatchingResult("Najpierw wybierz element z lewej strony.");
      return;
    }

    const selectedPair = matchingPairs.find((pair) => pair.left === matchingSelectionLeft);
    if (!selectedPair) {
      setMatchingSelectionLeft(null);
      return;
    }

    setQuizSubmitError(null);
    if (selectedPair.right === rightValue) {
      const nextMatched = [...matchingMatchedLeft, matchingSelectionLeft];
      setMatchingMatchedLeft(nextMatched);
      setMatchingSelectionLeft(null);
      if (nextMatched.length < matchingPairs.length) {
        setMatchingResult("Dobrze! Para połączona.");
        return;
      }

      if (!onCompleteTask) {
        setMatchingResult("Brawo! Wszystkie pary połączone.");
        onQuizPassed?.(station.stationId);
        Alert.alert("Zaliczono", "Zadanie łączenia par ukończone.", [
          {
            text: "Wróć do mapy",
            onPress: onClose,
          },
        ]);
        return;
      }

      setIsSubmittingMatching(true);
      const error = await onCompleteTask(station.stationId, "QUIZ", station.startedAt ?? undefined);
      setIsSubmittingMatching(false);
      if (error) {
        setQuizSubmitError(error);
        Alert.alert("Błąd", error);
        return;
      }

      setMatchingResult("Brawo! Wszystkie pary połączone.");
      onQuizPassed?.(station.stationId);
      Alert.alert("Zaliczono", "Zadanie łączenia par ukończone.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    const nextAttempts = matchingAttempts + 1;
    setMatchingAttempts(nextAttempts);
    setMatchingSelectionLeft(null);
    if (nextAttempts >= MEMORY_MAX_MISTAKES) {
      setMatchingResult("Brak prób.");
      onQuizFailed?.(station.stationId, "quiz_incorrect_answer");
      Alert.alert("Nie zaliczono", "Za dużo błędnych połączeń.", [
        {
          text: "Wróć do mapy",
          onPress: onClose,
        },
      ]);
      return;
    }

    setMatchingResult("To nie jest poprawna para.");
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

  return (
    <Animated.View className="absolute inset-0 z-50" style={[{ backgroundColor: "rgba(15, 25, 20, 0.9)" }, overlayBackdropStyle]}>
      <Animated.View className="flex-1 px-3 pb-5 pt-9" style={overlayPanelStyle}>
        <View className="flex-1 rounded-3xl border" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}>
          <View className="flex-row items-start justify-between gap-3 px-4 pb-2 pt-4">
            <View className="flex-1">
                <Text
                  className="text-[11px] uppercase tracking-widest"
                  style={{ color: EXPEDITION_THEME.textSubtle }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {`${station.name} • ${station.typeLabel}`}
                </Text>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full border active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={onRequestClose ?? onClose}
            >
              <Text
                className="text-base font-semibold text-center"
                style={{ color: EXPEDITION_THEME.textPrimary, lineHeight: 16, includeFontPadding: false }}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <View className="flex-1 px-4">
            <View className="flex-1">
              <View
                className={`${isNumericCodeStation ? "mt-0.5" : "mt-1"} w-full overflow-hidden rounded-2xl border`}
                style={{
                  ...(requiresCode
                    ? { flex: 1, minHeight: Math.max(140, Math.round(viewportHeight * 0.24)) }
                    : { height: stationMediaHeight }),
                  borderColor: EXPEDITION_THEME.border,
                  backgroundColor: EXPEDITION_THEME.panelMuted,
                }}
              >
                {isWordleStation ? (
                  <WordleMediaBoard
                    stationId={station.stationId}
                    attemptsCount={normalizedWordleAttemptsCount}
                    displayLength={wordleDisplayLength}
                    attempts={wordleAttempts}
                    cellSize={wordleBoardCellSize}
                  />
                ) : shouldShowQuizFallbackGraphic ? (
                  <View className="flex-1 items-center justify-center">
                    {!quizIconLoadFailed ? (
                      <Image
                        source={{ uri: QUIZ_BRAIN_ICON_URI }}
                        style={{ width: "62%", height: "62%", tintColor: "#ffffff" }}
                        resizeMode="contain"
                        onError={() => setQuizIconLoadFailed(true)}
                      />
                    ) : (
                      <Text className="text-4xl">🧠</Text>
                    )}
                  </View>
                ) : stationImageUri ? (
                  <Image
                    source={{ uri: stationImageUri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                    onError={() => setImageLoadFailed(true)}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-3xl">📍</Text>
                  </View>
                )}
              </View>

              {requiresCode ? (
                <View
                  className="my-3 px-1"
                >
                  <Text
                    className="text-base leading-6"
                    style={{ color: EXPEDITION_THEME.textMuted, textAlign: "justify" }}
                  >
                    {stationDescription.length > 0
                      ? stationDescription
                      : "Opis zadania nie został jeszcze dodany."}
                  </Text>
                </View>
              ) : stationDescription.length > 0 ? (
                <Text
                  className={`${isNumericCodeStation ? "mt-2" : "mt-3"} text-sm leading-5`}
                  style={{ color: EXPEDITION_THEME.textMuted }}
                >
                  {stationDescription}
                </Text>
              ) : null}

              {isQuizStation ? (
                <View
                  className="mt-3 rounded-2xl border px-3 py-3"
                  style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                >
                  <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                    {resolveStationQuizPrompt({ station, wordleLength })}
                  </Text>

                  {(isClassicQuizStation || isAudioQuizStation) ? (
                    <QuizAudioPanel
                      station={station}
                      isAudioQuizStation={isAudioQuizStation}
                      quizOptions={quizOptions}
                      selectedQuizOption={selectedQuizOption}
                      isSubmittingQuizAnswer={isSubmittingQuizAnswer}
                      hasTimedLimit={hasTimedLimit}
                      hasTimerStarted={hasTimerStarted}
                      isTimeExpired={isTimeExpired}
                      hasAudioSource={hasAudioSource}
                      isAudioLoading={isAudioLoading}
                      isAudioPlaying={isAudioPlaying}
                      audioLoadError={audioLoadError}
                      quizResult={quizResult}
                      feedbackTone={feedbackTone}
                      quizFeedbackAnimation={quizFeedbackAnimation}
                      onPlayAudio={() => {
                        void handlePlayAudio();
                      }}
                      onSubmitQuizAnswer={(index) => {
                        void submitQuizAnswer(index);
                      }}
                    />
                  ) : null}

                  {isWordleStation ? (
                    <WordleInteractionPanel
                      stationId={station.stationId}
                      displayLength={wordleDisplayLength}
                      inputCharacters={wordleInputCharacters}
                      boardCellSize={wordleBoardCellSize}
                      keyboardKeySize={wordleKeyboardKeyWidth}
                      keyboardKeyGap={wordleKeyboardKeyGap}
                      keyStateByLetter={wordleKeyStateByLetter}
                      isInteractiveDisabled={isWordleInteractiveDisabled}
                      isSubmitting={isSubmittingWordleGuess}
                      canSubmit={!isWordleInteractiveDisabled && normalizedWordleInput.length === (wordleLength || 0)}
                      canBackspace={!isWordleInteractiveDisabled && normalizedWordleInput.length > 0}
                      result={wordleResult}
                      onLayoutKeyboard={(nextWidth) => {
                        if (Math.abs(nextWidth - wordleKeyboardContainerWidth) > 1) {
                          setWordleKeyboardContainerWidth(nextWidth);
                        }
                      }}
                      onPressKey={(key) => {
                        setWordleInput((current) => {
                          const nextValue = `${current}${key}`.slice(0, wordleLength || 32);
                          return nextValue === current ? current : nextValue;
                        });
                      }}
                      onBackspace={() => {
                        setWordleInput((current) => {
                          if (!current.length) {
                            return current;
                          }
                          return current.slice(0, -1);
                        });
                      }}
                      onSubmit={() => {
                        void submitWordleGuess();
                      }}
                    />
                  ) : null}

                  {isHangmanStation ? (
                    <HangmanStationPanel
                      stationId={station.stationId}
                      hangmanMisses={hangmanMisses}
                      hangmanAttemptsLeft={hangmanAttemptsLeft}
                      hangmanMaskedSecret={hangmanMaskedSecret}
                      hangmanInput={hangmanInput}
                      hangmanResult={hangmanResult}
                      guessedHangmanSet={guessedHangmanSet}
                      isInputEditable={station.status !== "done" && station.status !== "failed" && !isSubmittingHangmanGuess}
                      isGuessDisabled={
                        station.status === "done" ||
                        station.status === "failed" ||
                        isSubmittingHangmanGuess ||
                        (hasTimedLimit && !hasTimerStarted) ||
                        isTimeExpired ||
                        hangmanAttemptsLeft <= 0 ||
                        hangmanHasWon
                      }
                      isSubmittingHangmanGuess={isSubmittingHangmanGuess}
                      onChangeInput={(value) => {
                        setHangmanInput(value);
                        setHangmanResult(null);
                        setQuizSubmitError(null);
                      }}
                      onSubmitGuess={() => {
                        void submitHangmanGuess();
                      }}
                      onSubmitLetter={(letter) => {
                        void submitHangmanGuess(letter);
                      }}
                    />
                  ) : null}

                  {isMastermindStation ? (
                    <MastermindStationPanel
                      stationId={station.stationId}
                      mastermindAttempts={mastermindAttempts}
                      mastermindAttemptsLeft={mastermindAttemptsLeft}
                      mastermindInput={mastermindInput}
                      mastermindResult={mastermindResult}
                      isInputEditable={!isInteractiveLocked && !isSubmittingMastermindGuess && !mastermindSolved}
                      isActionDisabled={isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0}
                      isSymbolDisabled={isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0}
                      isSubmittingMastermindGuess={isSubmittingMastermindGuess}
                      onChangeInput={(value) => {
                        setMastermindInput(value);
                        setMastermindResult(null);
                        setQuizSubmitError(null);
                      }}
                      onSubmitGuess={() => {
                        void submitMastermindGuess();
                      }}
                      onAddSymbol={(symbol) => {
                        if (isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0) {
                          return;
                        }
                        setMastermindInput((current) => `${current}${symbol}`.slice(0, 4));
                        setMastermindResult(null);
                      }}
                    />
                  ) : null}

                  {isAnagramStation ? (
                    <AnagramStationPanel
                      anagramScrambled={anagramScrambled}
                      anagramAttemptsLeft={anagramAttemptsLeft}
                      anagramInput={anagramInput}
                      anagramResult={anagramResult}
                      isActionDisabled={isInteractiveLocked || isSubmittingAnagram || anagramAttemptsLeft <= 0}
                      isSubmittingAnagram={isSubmittingAnagram}
                      onChangeInput={(value) => {
                        setAnagramInput(value);
                        setAnagramResult(null);
                        setQuizSubmitError(null);
                      }}
                      onSubmit={() => {
                        void submitAnagram();
                      }}
                    />
                  ) : null}

                  {isCaesarStation ? (
                    <CaesarStationPanel
                      caesarEncoded={caesarEncoded}
                      caesarAttemptsLeft={caesarAttemptsLeft}
                      caesarInput={caesarInput}
                      caesarResult={caesarResult}
                      isActionDisabled={isInteractiveLocked || isSubmittingCaesar || caesarAttemptsLeft <= 0}
                      isSubmittingCaesar={isSubmittingCaesar}
                      onChangeInput={(value) => {
                        setCaesarInput(value);
                        setCaesarResult(null);
                        setQuizSubmitError(null);
                      }}
                      onSubmit={() => {
                        void submitCaesar();
                      }}
                    />
                  ) : null}

                  {isMemoryStation ? (
                    <MemoryStationPanel
                      memoryDeck={memoryDeck}
                      memoryMatchedCount={memoryMatchedCount}
                      memoryMistakes={memoryMistakes}
                      memoryAttemptsLeft={memoryAttemptsLeft}
                      memoryBusy={memoryBusy}
                      memoryResult={memoryResult}
                      isInteractiveLocked={isInteractiveLocked}
                      onPressCard={(cardId) => {
                        void handleMemoryCardPress(cardId);
                      }}
                    />
                  ) : null}

                  {isSimonStation ? (
                    <SimonStationPanel
                      stationId={station.stationId}
                      simonSequence={simonSequence}
                      simonHiddenHint={simonHiddenHint}
                      simonHintVisible={simonHintVisible}
                      simonProgress={simonProgress}
                      simonResult={simonResult}
                      isInteractiveLocked={isInteractiveLocked}
                      isSubmittingSimon={isSubmittingSimon}
                      onPressButton={(buttonId) => {
                        void handleSimonPress(buttonId);
                      }}
                    />
                  ) : null}

                  {isRebusStation ? (
                    <RebusStationPanel
                      rebusQuestion={station.quizQuestion?.trim() || "🏕️ + QUEST = ?"}
                      rebusAttemptsLeft={rebusAttemptsLeft}
                      rebusInput={rebusInput}
                      rebusResult={rebusResult}
                      isActionDisabled={isInteractiveLocked || isSubmittingRebus || rebusAttemptsLeft <= 0}
                      isSubmittingRebus={isSubmittingRebus}
                      onChangeInput={(value) => {
                        setRebusInput(value);
                        setRebusResult(null);
                        setQuizSubmitError(null);
                      }}
                      onSubmit={() => {
                        void submitRebus();
                      }}
                    />
                  ) : null}

                  {isBoggleStation ? (
                    <BoggleStationPanel
                      stationId={station.stationId}
                      boggleBoardLetters={boggleBoardLetters}
                      boggleAttemptsLeft={boggleAttemptsLeft}
                      boggleInput={boggleInput}
                      boggleResult={boggleResult}
                      isActionDisabled={isInteractiveLocked || isSubmittingBoggle || boggleAttemptsLeft <= 0}
                      isSubmittingBoggle={isSubmittingBoggle}
                      onChangeInput={(value) => {
                        setBoggleInput(value);
                        setBoggleResult(null);
                        setQuizSubmitError(null);
                      }}
                      onSubmit={() => {
                        void submitBoggle();
                      }}
                    />
                  ) : null}

                  {isMiniSudokuStation ? (
                    <MiniSudokuStationPanel
                      stationId={station.stationId}
                      miniSudokuPuzzle={miniSudokuPuzzle}
                      normalizedMiniSudokuValues={normalizedMiniSudokuValues}
                      miniSudokuAttemptsLeft={miniSudokuAttemptsLeft}
                      miniSudokuResult={miniSudokuResult}
                      isActionDisabled={isInteractiveLocked || isSubmittingMiniSudoku || miniSudokuAttemptsLeft <= 0}
                      isSubmittingMiniSudoku={isSubmittingMiniSudoku}
                      onChangeCell={(index, nextValue) => {
                        setMiniSudokuValues((current) => {
                          const next = [...current];
                          next[index] = nextValue.replace(/[^1-2]/g, "").slice(0, 1);
                          return next;
                        });
                        setMiniSudokuResult(null);
                        setQuizSubmitError(null);
                      }}
                      onSubmit={() => {
                        void submitMiniSudoku();
                      }}
                    />
                  ) : null}

                  {isMatchingStation ? (
                    <MatchingStationPanel
                      stationId={station.stationId}
                      matchingAttemptsLeft={matchingAttemptsLeft}
                      matchingPairs={matchingPairs}
                      matchingMatchedLeft={matchingMatchedLeft}
                      matchingSelectionLeft={matchingSelectionLeft}
                      matchingRightOptions={matchingRightOptions}
                      matchedRightSet={matchedRightSet}
                      matchingResult={matchingResult}
                      isInteractiveLocked={isInteractiveLocked}
                      onSelectLeft={(left) => {
                        if (isInteractiveLocked || matchingMatchedLeft.includes(left) || matchingAttemptsLeft <= 0) {
                          return;
                        }
                        setMatchingSelectionLeft(left);
                        setMatchingResult(null);
                        setQuizSubmitError(null);
                      }}
                      onSelectRight={(right) => {
                        void handleMatchingRightSelect(right);
                      }}
                    />
                  ) : null}

                  {quizSubmitError ? (
                    <Text className="mt-2 text-center text-xs" style={{ color: EXPEDITION_THEME.danger }}>
                      {quizSubmitError}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {requiresCode ? (
              <CodeStationPanel
                station={station}
                isNumericCodeStation={isNumericCodeStation}
                hasTimedLimit={hasTimedLimit}
                hasTimerStarted={hasTimerStarted}
                isTimeExpired={isTimeExpired}
                isCodeActionDisabled={isCodeActionDisabled}
                verificationCode={verificationCode}
                isCodeInputInvalid={isCodeInputInvalid}
                isCodeInputSuccess={isCodeInputSuccess}
                codeResult={codeResult}
                isSubmittingCode={isSubmittingCode}
                codeInputShakeAnimation={codeInputShakeAnimation}
                onChangeVerificationCode={(value) => {
                  setVerificationCode(value);
                }}
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

          </View>

          <View className={`px-4 ${isNumericCodeStation ? "pb-3 pt-1" : "pb-4 pt-2"}`}>
            <View className="flex-row items-end">
              <View className="flex-1" />

              {shouldShowExecutionTimer ? (
                <View className="items-center px-4 py-2">
                  <Animated.Text
                    className={`text-center ${isNumericCodeStation ? "text-5xl" : "text-6xl"} font-extrabold`}
                    style={[{ color: timerTextColor }, timerPulseStyle]}
                  >
                    {executionTimeLabel}
                  </Animated.Text>
                  <Text
                    className="mt-1 text-center text-[10px] uppercase tracking-widest"
                    style={{ color: EXPEDITION_THEME.textSubtle }}
                  >
                    Czas do ukończenia zadania
                  </Text>
                </View>
              ) : null}

              <View className="flex-1 items-end">
                <View
                  className="rounded-2xl border px-3 py-2"
                  style={{ borderColor: "rgba(252, 211, 77, 0.4)", backgroundColor: "rgba(252, 211, 77, 0.1)" }}
                >
                  <Text className="text-[10px] uppercase tracking-widest" style={{ color: "#fcd34d" }}>
                    Punkty
                  </Text>
                  <Text className="mt-0.5 text-right text-lg font-extrabold" style={{ color: "#fcd34d" }}>
                    {station.points}
                  </Text>
                </View>
              </View>
            </View>
          </View>

        </View>
      </Animated.View>
    </Animated.View>
  );
}
