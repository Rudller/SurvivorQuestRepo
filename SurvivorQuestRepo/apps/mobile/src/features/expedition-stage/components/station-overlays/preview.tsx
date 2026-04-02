import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS, type AVPlaybackStatus } from "expo-av";
import { ActivityIndicator, Alert, Animated, Image, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { EXPEDITION_THEME } from "../../../onboarding/model/constants";
import type {
  StationPreviewOverlayProps,
  StationTestType,
  StationTestViewModel,
} from "./types";

import {
  CAESAR_SHIFT,
  HANGMAN_ALPHABET,
  HANGMAN_MAX_MISSES,
  MASTERMIND_SYMBOLS,
  MASTERMIND_MAX_ATTEMPTS,
  MEMORY_MAX_MISTAKES,
  NUMERIC_PINPAD_LAYOUT,
  NUMERIC_PINPAD_SUBLABELS,
  QUIZ_BRAIN_ICON_URI,
  SIMON_BUTTONS,
  TEXT_PUZZLE_MAX_ATTEMPTS,
  WORDLE_MAX_ATTEMPTS,
  type MatchingPair,
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

type WordleAttempt = {
  guess: string;
  evaluation: WordleCellState[];
};
type MastermindAttempt = {
  guess: string;
  exact: number;
  misplaced: number;
};

function getCodePlaceholder(stationType: StationTestType) {
  return stationType === "time" ? "np. TIME-2048" : "np. POINTS-2048";
}

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
  const { height: viewportHeight } = useWindowDimensions();
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
  const [isAudioReady, setIsAudioReady] = useState(false);
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
  const audioSoundRef = useRef<Audio.Sound | null>(null);
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
    const activeSound = audioSoundRef.current;
    audioSoundRef.current = null;
    setIsAudioReady(false);
    setIsAudioPlaying(false);
    if (!activeSound) {
      return;
    }

    try {
      await activeSound.stopAsync();
    } catch {
      // noop
    }

    try {
      await activeSound.unloadAsync();
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
        setIsAudioReady(false);
        return null;
      }

      await unloadAudioSound();
      setAudioLoadError(null);
      setIsAudioLoading(true);
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: normalizedAudioUrl },
          {
            shouldPlay: false,
            progressUpdateIntervalMillis: 250,
            positionMillis: 0,
          },
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) {
              setIsAudioPlaying(false);
              if (status.error) {
                setAudioLoadError("Nie udało się odtworzyć nagrania audio.");
              }
              return;
            }

            setIsAudioPlaying(status.isPlaying);
            if (status.didJustFinish) {
              void audioSoundRef.current?.setPositionAsync(0).catch(() => undefined);
              setIsAudioPlaying(false);
            }
          },
        );
        audioSoundRef.current = sound;
        setIsAudioReady(true);
        return sound;
      } catch {
        setAudioLoadError("Nie udało się załadować nagrania audio.");
        setIsAudioReady(false);
        return null;
      } finally {
        setIsAudioLoading(false);
      }
    },
    [unloadAudioSound],
  );
  const handlePlayAudio = useCallback(async () => {
    if (!displayedStation || displayedStation.stationType !== "audio-quiz") {
      return;
    }

    const audioUrl = displayedStation.quizAudioUrl?.trim() ?? "";
    let activeSound = audioSoundRef.current;
    if (!activeSound) {
      activeSound = await loadAudioSound(audioUrl);
    }

    if (!activeSound) {
      return;
    }

    try {
      await activeSound.replayAsync();
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
    setIsAudioReady(false);
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
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
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

      void loadedSound.unloadAsync().catch(() => undefined);
      if (audioSoundRef.current === loadedSound) {
        audioSoundRef.current = null;
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
  const isTimeStation = station.stationType === "time";
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
    return Math.max(190, Math.round(viewportHeight * 0.33));
  })();
  const hasTimerStarted = Boolean(station.startedAt);
  const hasQuizAnswer = selectedQuizOption !== null;
  const wordleSecret = isWordleStation ? resolvePuzzleSecret(station, "wordle") : "";
  const wordleLength = Array.from(wordleSecret).length;
  const normalizedWordleInput = normalizeWordleSecret(wordleInput).slice(0, wordleLength || 32);
  const normalizedWordleAttemptsCount = wordleAttempts.length;
  const wordleSolved = wordleAttempts.some((attempt) => attempt.evaluation.every((cell) => cell === "correct"));
  const wordleAttemptsLeft = Math.max(0, WORDLE_MAX_ATTEMPTS - normalizedWordleAttemptsCount);
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
  const quizFeedbackStyle = {
    opacity: quizFeedbackAnimation,
    transform: [
      {
        translateY: quizFeedbackAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  } as const;
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
                {shouldShowQuizFallbackGraphic ? (
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
                    {isClassicQuizStation
                      ? station.quizQuestion?.trim() || "Quiz: wybierz jedną z 4 odpowiedzi"
                      : isAudioQuizStation
                        ? station.quizQuestion?.trim() || "Quiz audio: odtwórz nagranie i wybierz poprawną odpowiedź."
                      : isWordleStation
                        ? station.quizQuestion?.trim() || `Wordle: odgadnij słowo (${wordleLength} liter).`
                        : isHangmanStation
                          ? station.quizQuestion?.trim() || "Wisielec: odgadnij hasło litera po literze."
                          : isMastermindStation
                            ? station.quizQuestion?.trim() || "Mastermind: odgadnij 4-znakowy kod z liter A-F."
                            : isAnagramStation
                              ? station.quizQuestion?.trim() || "Anagram: ułóż poprawne słowo."
                              : isCaesarStation
                                ? station.quizQuestion?.trim() || "Szyfr Cezara: odszyfruj tekst (przesunięcie +3)."
                                : isMemoryStation
                                  ? station.quizQuestion?.trim() || "Memory: znajdź wszystkie pary."
                                  : isSimonStation
                                    ? station.quizQuestion?.trim() || "Simon: odtwórz sekwencję."
                                    : isRebusStation
                                      ? station.quizQuestion?.trim() || "Rebus: wpisz hasło."
                                      : isBoggleStation
                                        ? station.quizQuestion?.trim() || "Boggle: znajdź docelowe słowo na planszy."
                                        : isMiniSudokuStation
                                          ? station.quizQuestion?.trim() || "Mini Sudoku: uzupełnij siatkę 2x2."
                                          : station.quizQuestion?.trim() || "Łączenie par: dopasuj elementy."}
                  </Text>

                  {(isClassicQuizStation || isAudioQuizStation) ? (
                    <>
                      {isAudioQuizStation ? (
                        <View className="mt-3 rounded-xl border px-3 py-3" style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}>
                          <Pressable
                            className="items-center rounded-xl py-2.5 active:opacity-90"
                            style={{
                              backgroundColor:
                                station.status === "done" ||
                                station.status === "failed" ||
                                isSubmittingQuizAnswer ||
                                isAudioLoading ||
                                (hasTimedLimit && !hasTimerStarted) ||
                                isTimeExpired ||
                                !hasAudioSource
                                  ? EXPEDITION_THEME.panelMuted
                                  : EXPEDITION_THEME.accent,
                            }}
                            onPress={() => {
                              void handlePlayAudio();
                            }}
                            disabled={
                              station.status === "done" ||
                              station.status === "failed" ||
                              isSubmittingQuizAnswer ||
                              isAudioLoading ||
                              (hasTimedLimit && !hasTimerStarted) ||
                              isTimeExpired ||
                              !hasAudioSource
                            }
                          >
                            <Text className="text-sm font-semibold text-zinc-950">
                              {isAudioPlaying ? "Odtwarzanie..." : "▶️ Odtwórz / odtwórz ponownie audio"}
                            </Text>
                          </Pressable>
                          {isAudioLoading ? (
                            <View className="mt-2 flex-row items-center gap-2">
                              <ActivityIndicator size="small" color={EXPEDITION_THEME.accentStrong} />
                              <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                                Ładowanie nagrania...
                              </Text>
                            </View>
                          ) : null}
                          {audioLoadError ? (
                            <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.danger }}>
                              {audioLoadError}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                      <View className="mt-3 flex-row flex-wrap justify-between gap-y-2">
                        {quizOptions.map((option, index) => {
                          const isSelected = selectedQuizOption === index;
                          const isCorrect = station.quizCorrectAnswerIndex === index;
                          const showCorrect = isSelected && isCorrect;
                          const showWrong = isSelected && !isCorrect;

                          return (
                            <Pressable
                              key={`${station.stationId}-quiz-${index}`}
                              className="rounded-2xl border px-3 py-3 active:opacity-90"
                              style={{
                                width: "49%",
                                minHeight: 92,
                                justifyContent: "center",
                                alignItems: "center",
                                shadowColor: "#000000",
                                shadowOpacity: 0.22,
                                shadowRadius: 7,
                                shadowOffset: { width: 0, height: 4 },
                                elevation: 4,
                                borderColor: showCorrect
                                  ? "rgba(52, 211, 153, 0.8)"
                                  : showWrong
                                    ? EXPEDITION_THEME.danger
                                    : isSelected
                                      ? EXPEDITION_THEME.accentStrong
                                      : EXPEDITION_THEME.border,
                                backgroundColor: showCorrect
                                  ? "rgba(22, 163, 74, 0.24)"
                                  : showWrong
                                    ? "rgba(239, 111, 108, 0.22)"
                                    : EXPEDITION_THEME.panelStrong,
                              }}
                              onPress={() => {
                                void submitQuizAnswer(index);
                              }}
                              disabled={
                                selectedQuizOption !== null ||
                                isSubmittingQuizAnswer ||
                                station.status === "done" ||
                                station.status === "failed" ||
                                (hasTimedLimit && !hasTimerStarted) ||
                                isTimeExpired
                              }
                            >
                              <Text className="text-center text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                                {option}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {quizResult && feedbackTone ? (
                        <Animated.View
                          className="mt-3 rounded-2xl border px-3 py-2"
                          style={[
                            {
                              borderColor: feedbackTone === "success" ? "rgba(52, 211, 153, 0.82)" : EXPEDITION_THEME.danger,
                              backgroundColor: feedbackTone === "success" ? "rgba(52, 211, 153, 0.18)" : "rgba(239, 111, 108, 0.18)",
                            },
                            quizFeedbackStyle,
                          ]}
                        >
                          <Text
                            className="text-center text-xs font-semibold"
                            style={{ color: EXPEDITION_THEME.textPrimary }}
                          >
                            {quizResult}
                          </Text>
                        </Animated.View>
                      ) : null}
                    </>
                  ) : null}

                  {isWordleStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Próby: {normalizedWordleAttemptsCount}/{WORDLE_MAX_ATTEMPTS} • Pozostało: {wordleAttemptsLeft}
                      </Text>
                      <View className="mt-2 gap-2">
                        {Array.from({ length: WORDLE_MAX_ATTEMPTS }).map((_, rowIndex) => {
                          const attempt = wordleAttempts[rowIndex];
                          const guessCharacters = Array.from(attempt?.guess ?? "");
                          const evaluation = attempt?.evaluation ?? [];
                          const secretLength = Math.max(1, wordleLength || 5);

                          return (
                            <View key={`${station.stationId}-wordle-row-${rowIndex}`} className="flex-row gap-1">
                              {Array.from({ length: secretLength }).map((__, columnIndex) => {
                                const letter = guessCharacters[columnIndex] ?? "";
                                const state = evaluation[columnIndex];
                                const backgroundColor =
                                  state === "correct"
                                    ? "rgba(34, 197, 94, 0.35)"
                                    : state === "present"
                                      ? "rgba(245, 158, 11, 0.28)"
                                      : state === "absent"
                                        ? "rgba(120, 120, 120, 0.25)"
                                        : EXPEDITION_THEME.panelStrong;
                                const borderColor =
                                  state === "correct"
                                    ? "rgba(34, 197, 94, 0.72)"
                                    : state === "present"
                                      ? "rgba(245, 158, 11, 0.72)"
                                      : state === "absent"
                                        ? "rgba(161, 161, 170, 0.5)"
                                        : EXPEDITION_THEME.border;

                                return (
                                  <View
                                    key={`${station.stationId}-wordle-cell-${rowIndex}-${columnIndex}`}
                                    className="h-10 flex-1 items-center justify-center rounded-lg border"
                                    style={{ borderColor, backgroundColor }}
                                  >
                                    <Text className="text-sm font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                                      {letter || " "}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })}
                      </View>

                      <TextInput
                        className="mt-3 rounded-xl border px-3 py-2 text-sm"
                        style={{
                          borderColor: EXPEDITION_THEME.border,
                          backgroundColor: EXPEDITION_THEME.panelStrong,
                          color: EXPEDITION_THEME.textPrimary,
                        }}
                        placeholder={`Wpisz ${wordleLength || 5}-literowe słowo`}
                        placeholderTextColor={EXPEDITION_THEME.textSubtle}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        value={wordleInput}
                        onChangeText={(value) => {
                          setWordleInput(value);
                          setWordleResult(null);
                          setQuizSubmitError(null);
                        }}
                        editable={station.status !== "done" && station.status !== "failed" && !isSubmittingWordleGuess}
                        onSubmitEditing={() => {
                          void submitWordleGuess();
                        }}
                      />
                      <Pressable
                        className="mt-2 items-center rounded-xl py-2.5 active:opacity-90"
                        style={{
                          backgroundColor:
                            station.status === "done" ||
                            station.status === "failed" ||
                            isSubmittingWordleGuess ||
                            (hasTimedLimit && !hasTimerStarted) ||
                            isTimeExpired ||
                            wordleAttemptsLeft <= 0 ||
                            wordleSolved
                              ? EXPEDITION_THEME.panelStrong
                              : EXPEDITION_THEME.accent,
                        }}
                        onPress={() => {
                          void submitWordleGuess();
                        }}
                        disabled={
                          station.status === "done" ||
                          station.status === "failed" ||
                          isSubmittingWordleGuess ||
                          (hasTimedLimit && !hasTimerStarted) ||
                          isTimeExpired ||
                          wordleAttemptsLeft <= 0 ||
                          wordleSolved
                        }
                      >
                        <Text className="text-sm font-semibold text-zinc-950">
                          {isSubmittingWordleGuess ? "Sprawdzanie..." : "Sprawdź słowo"}
                        </Text>
                      </Pressable>
                      {wordleResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {wordleResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isHangmanStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Pudła: {hangmanMisses.length}/{HANGMAN_MAX_MISSES} • Pozostało: {hangmanAttemptsLeft}
                      </Text>
                      <Text
                        className="mt-2 text-lg font-bold"
                        style={{ color: EXPEDITION_THEME.textPrimary, letterSpacing: 1.8 }}
                      >
                        {hangmanMaskedSecret}
                      </Text>
                      {hangmanMisses.length > 0 ? (
                        <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.danger }}>
                          Błędne litery: {hangmanMisses.join(", ")}
                        </Text>
                      ) : null}

                      <View className="mt-3 flex-row gap-2">
                        <TextInput
                          className="flex-1 rounded-xl border px-3 py-2 text-sm"
                          style={{
                            borderColor: EXPEDITION_THEME.border,
                            backgroundColor: EXPEDITION_THEME.panelStrong,
                            color: EXPEDITION_THEME.textPrimary,
                          }}
                          placeholder="Wpisz literę"
                          placeholderTextColor={EXPEDITION_THEME.textSubtle}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          value={hangmanInput}
                          onChangeText={(value) => {
                            setHangmanInput(value);
                            setHangmanResult(null);
                            setQuizSubmitError(null);
                          }}
                          editable={station.status !== "done" && station.status !== "failed" && !isSubmittingHangmanGuess}
                          onSubmitEditing={() => {
                            void submitHangmanGuess();
                          }}
                        />
                        <Pressable
                          className="items-center justify-center rounded-xl px-4 active:opacity-90"
                          style={{
                            backgroundColor:
                              station.status === "done" ||
                              station.status === "failed" ||
                              isSubmittingHangmanGuess ||
                              (hasTimedLimit && !hasTimerStarted) ||
                              isTimeExpired ||
                              hangmanAttemptsLeft <= 0 ||
                              hangmanHasWon
                                ? EXPEDITION_THEME.panelStrong
                                : EXPEDITION_THEME.accent,
                          }}
                          onPress={() => {
                            void submitHangmanGuess();
                          }}
                          disabled={
                            station.status === "done" ||
                            station.status === "failed" ||
                            isSubmittingHangmanGuess ||
                            (hasTimedLimit && !hasTimerStarted) ||
                            isTimeExpired ||
                            hangmanAttemptsLeft <= 0 ||
                            hangmanHasWon
                          }
                        >
                          <Text className="text-xs font-semibold text-zinc-950">
                            {isSubmittingHangmanGuess ? "..." : "Zgadnij"}
                          </Text>
                        </Pressable>
                      </View>

                      <View className="mt-3 flex-row flex-wrap gap-1.5">
                        {HANGMAN_ALPHABET.map((letter) => {
                          const used = guessedHangmanSet.has(letter) || hangmanMisses.includes(letter);
                          return (
                            <Pressable
                              key={`${station.stationId}-hangman-letter-${letter}`}
                              className="h-8 w-8 items-center justify-center rounded-md border active:opacity-90"
                              style={{
                                borderColor: used ? "rgba(161, 161, 170, 0.6)" : EXPEDITION_THEME.border,
                                backgroundColor: used ? "rgba(113, 113, 122, 0.22)" : EXPEDITION_THEME.panelStrong,
                              }}
                              onPress={() => {
                                void submitHangmanGuess(letter);
                              }}
                              disabled={
                                used ||
                                station.status === "done" ||
                                station.status === "failed" ||
                                isSubmittingHangmanGuess ||
                                (hasTimedLimit && !hasTimerStarted) ||
                                isTimeExpired ||
                                hangmanAttemptsLeft <= 0 ||
                                hangmanHasWon
                              }
                            >
                              <Text className="text-[11px] font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                                {letter}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {hangmanResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {hangmanResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isMastermindStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Kod składa się z 4 znaków (A-F). Próby: {mastermindAttempts.length}/{MASTERMIND_MAX_ATTEMPTS}
                      </Text>
                      <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                        Pozostało: {mastermindAttemptsLeft}
                      </Text>
                      <View className="mt-2 gap-1.5">
                        {mastermindAttempts.map((attempt, index) => (
                          <View
                            key={`${station.stationId}-mastermind-${index}`}
                            className="flex-row items-center justify-between rounded-xl border px-3 py-2"
                            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
                          >
                            <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                              {attempt.guess}
                            </Text>
                            <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                              ● trafione: {attempt.exact} • ◐ miejsce: {attempt.misplaced}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <View className="mt-2 flex-row gap-2">
                        <TextInput
                          className="flex-1 rounded-xl border px-3 py-2 text-sm"
                          style={{
                            borderColor: EXPEDITION_THEME.border,
                            backgroundColor: EXPEDITION_THEME.panelStrong,
                            color: EXPEDITION_THEME.textPrimary,
                          }}
                          placeholder="np. ABCD"
                          placeholderTextColor={EXPEDITION_THEME.textSubtle}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          value={mastermindInput}
                          onChangeText={(value) => {
                            setMastermindInput(value);
                            setMastermindResult(null);
                            setQuizSubmitError(null);
                          }}
                          editable={!isInteractiveLocked && !isSubmittingMastermindGuess && !mastermindSolved}
                          onSubmitEditing={() => {
                            void submitMastermindGuess();
                          }}
                        />
                        <Pressable
                          className="items-center justify-center rounded-xl px-4 active:opacity-90"
                          style={{
                            backgroundColor:
                              isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0
                                ? EXPEDITION_THEME.panelStrong
                                : EXPEDITION_THEME.accent,
                          }}
                          onPress={() => {
                            void submitMastermindGuess();
                          }}
                          disabled={isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0}
                        >
                          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingMastermindGuess ? "..." : "Sprawdź"}</Text>
                        </Pressable>
                      </View>
                      <View className="mt-2 flex-row flex-wrap gap-1.5">
                        {MASTERMIND_SYMBOLS.map((symbol) => (
                          <Pressable
                            key={`${station.stationId}-mastermind-symbol-${symbol}`}
                            className="h-8 w-8 items-center justify-center rounded-md border active:opacity-90"
                            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
                            onPress={() => {
                              if (isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0) {
                                return;
                              }
                              setMastermindInput((current) => `${current}${symbol}`.slice(0, 4));
                              setMastermindResult(null);
                            }}
                            disabled={isInteractiveLocked || isSubmittingMastermindGuess || mastermindSolved || mastermindAttemptsLeft <= 0}
                          >
                            <Text className="text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                              {symbol}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {mastermindResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {mastermindResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isAnagramStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Rozsypanka: <Text className="font-bold">{anagramScrambled || "—"}</Text> • Pozostało prób: {anagramAttemptsLeft}
                      </Text>
                      <View className="mt-2 flex-row gap-2">
                        <TextInput
                          className="flex-1 rounded-xl border px-3 py-2 text-sm"
                          style={{
                            borderColor: EXPEDITION_THEME.border,
                            backgroundColor: EXPEDITION_THEME.panelStrong,
                            color: EXPEDITION_THEME.textPrimary,
                          }}
                          placeholder="Wpisz poprawne słowo"
                          placeholderTextColor={EXPEDITION_THEME.textSubtle}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          value={anagramInput}
                          onChangeText={(value) => {
                            setAnagramInput(value);
                            setAnagramResult(null);
                            setQuizSubmitError(null);
                          }}
                          editable={!isInteractiveLocked && !isSubmittingAnagram && anagramAttemptsLeft > 0}
                          onSubmitEditing={() => {
                            void submitAnagram();
                          }}
                        />
                        <Pressable
                          className="items-center justify-center rounded-xl px-4 active:opacity-90"
                          style={{
                            backgroundColor:
                              isInteractiveLocked || isSubmittingAnagram || anagramAttemptsLeft <= 0
                                ? EXPEDITION_THEME.panelStrong
                                : EXPEDITION_THEME.accent,
                          }}
                          onPress={() => {
                            void submitAnagram();
                          }}
                          disabled={isInteractiveLocked || isSubmittingAnagram || anagramAttemptsLeft <= 0}
                        >
                          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingAnagram ? "..." : "Sprawdź"}</Text>
                        </Pressable>
                      </View>
                      {anagramResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {anagramResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isCaesarStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Odszyfruj: <Text className="font-bold">{caesarEncoded}</Text>
                      </Text>
                      <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                        Wskazówka: przesunięcie +3 • Pozostało prób: {caesarAttemptsLeft}
                      </Text>
                      <View className="mt-2 flex-row gap-2">
                        <TextInput
                          className="flex-1 rounded-xl border px-3 py-2 text-sm"
                          style={{
                            borderColor: EXPEDITION_THEME.border,
                            backgroundColor: EXPEDITION_THEME.panelStrong,
                            color: EXPEDITION_THEME.textPrimary,
                          }}
                          placeholder="Wpisz odszyfrowaną frazę"
                          placeholderTextColor={EXPEDITION_THEME.textSubtle}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          value={caesarInput}
                          onChangeText={(value) => {
                            setCaesarInput(value);
                            setCaesarResult(null);
                            setQuizSubmitError(null);
                          }}
                          editable={!isInteractiveLocked && !isSubmittingCaesar && caesarAttemptsLeft > 0}
                          onSubmitEditing={() => {
                            void submitCaesar();
                          }}
                        />
                        <Pressable
                          className="items-center justify-center rounded-xl px-4 active:opacity-90"
                          style={{
                            backgroundColor:
                              isInteractiveLocked || isSubmittingCaesar || caesarAttemptsLeft <= 0
                                ? EXPEDITION_THEME.panelStrong
                                : EXPEDITION_THEME.accent,
                          }}
                          onPress={() => {
                            void submitCaesar();
                          }}
                          disabled={isInteractiveLocked || isSubmittingCaesar || caesarAttemptsLeft <= 0}
                        >
                          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingCaesar ? "..." : "Sprawdź"}</Text>
                        </Pressable>
                      </View>
                      {caesarResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {caesarResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isMemoryStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Pary: {memoryMatchedCount / 2}/{memoryDeck.length / 2} • Błędy: {memoryMistakes}/{MEMORY_MAX_MISTAKES}
                      </Text>
                      <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
                        {memoryDeck.map((card) => (
                          <Pressable
                            key={card.id}
                            className="h-16 w-[31.5%] items-center justify-center rounded-xl border active:opacity-90"
                            style={{
                              borderColor: card.matched ? "rgba(52, 211, 153, 0.8)" : EXPEDITION_THEME.border,
                              backgroundColor: card.matched
                                ? "rgba(34, 197, 94, 0.2)"
                                : card.revealed
                                  ? "rgba(59, 130, 246, 0.2)"
                                  : EXPEDITION_THEME.panelStrong,
                              opacity: isInteractiveLocked || memoryBusy ? 0.85 : 1,
                            }}
                            onPress={() => {
                              void handleMemoryCardPress(card.id);
                            }}
                            disabled={isInteractiveLocked || memoryBusy || card.matched || card.revealed || memoryAttemptsLeft <= 0}
                          >
                            <Text className="text-xl">{card.revealed || card.matched ? card.symbol : "?"}</Text>
                          </Pressable>
                        ))}
                      </View>
                      {memoryResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {memoryResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isSimonStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Zapamiętaj sekwencję:{" "}
                        <Text className="font-bold">{simonHintVisible ? simonSequence.map((id) => SIMON_BUTTONS.find((button) => button.id === id)?.label ?? "").join(" ") : "•••••"}</Text>
                      </Text>
                      <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                        Postęp: {simonProgress}/{simonSequence.length}
                      </Text>
                      <View className="mt-2 flex-row flex-wrap justify-between gap-y-2">
                        {SIMON_BUTTONS.map((button) => (
                          <Pressable
                            key={`${station.stationId}-simon-${button.id}`}
                            className="h-16 w-[48.5%] items-center justify-center rounded-xl border active:opacity-90"
                            style={{
                              borderColor: EXPEDITION_THEME.border,
                              backgroundColor: button.color,
                              opacity: isInteractiveLocked || isSubmittingSimon || simonProgress >= simonSequence.length ? 0.55 : 1,
                            }}
                            onPress={() => {
                              void handleSimonPress(button.id);
                            }}
                            disabled={isInteractiveLocked || isSubmittingSimon || simonProgress >= simonSequence.length}
                          >
                            <Text className="text-2xl">{button.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                      {simonResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {simonResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isRebusStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Rebus: <Text className="font-bold">{station.quizQuestion?.trim() || "🏕️ + QUEST = ?"}</Text>
                      </Text>
                      <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                        Pozostało prób: {rebusAttemptsLeft}
                      </Text>
                      <View className="mt-2 flex-row gap-2">
                        <TextInput
                          className="flex-1 rounded-xl border px-3 py-2 text-sm"
                          style={{
                            borderColor: EXPEDITION_THEME.border,
                            backgroundColor: EXPEDITION_THEME.panelStrong,
                            color: EXPEDITION_THEME.textPrimary,
                          }}
                          placeholder="Wpisz rozwiązanie"
                          placeholderTextColor={EXPEDITION_THEME.textSubtle}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          value={rebusInput}
                          onChangeText={(value) => {
                            setRebusInput(value);
                            setRebusResult(null);
                            setQuizSubmitError(null);
                          }}
                          editable={!isInteractiveLocked && !isSubmittingRebus && rebusAttemptsLeft > 0}
                          onSubmitEditing={() => {
                            void submitRebus();
                          }}
                        />
                        <Pressable
                          className="items-center justify-center rounded-xl px-4 active:opacity-90"
                          style={{
                            backgroundColor:
                              isInteractiveLocked || isSubmittingRebus || rebusAttemptsLeft <= 0
                                ? EXPEDITION_THEME.panelStrong
                                : EXPEDITION_THEME.accent,
                          }}
                          onPress={() => {
                            void submitRebus();
                          }}
                          disabled={isInteractiveLocked || isSubmittingRebus || rebusAttemptsLeft <= 0}
                        >
                          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingRebus ? "..." : "Sprawdź"}</Text>
                        </Pressable>
                      </View>
                      {rebusResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {rebusResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isBoggleStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Wpisz docelowe słowo z planszy • Pozostało prób: {boggleAttemptsLeft}
                      </Text>
                      <View className="mt-2 flex-row flex-wrap justify-between gap-y-1.5">
                        {boggleBoardLetters.map((letter, index) => (
                          <View
                            key={`${station.stationId}-boggle-${index}`}
                            className="h-10 w-[31.5%] items-center justify-center rounded-lg border"
                            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
                          >
                            <Text className="text-sm font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                              {letter}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <View className="mt-2 flex-row gap-2">
                        <TextInput
                          className="flex-1 rounded-xl border px-3 py-2 text-sm"
                          style={{
                            borderColor: EXPEDITION_THEME.border,
                            backgroundColor: EXPEDITION_THEME.panelStrong,
                            color: EXPEDITION_THEME.textPrimary,
                          }}
                          placeholder="Wpisz słowo"
                          placeholderTextColor={EXPEDITION_THEME.textSubtle}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          value={boggleInput}
                          onChangeText={(value) => {
                            setBoggleInput(value);
                            setBoggleResult(null);
                            setQuizSubmitError(null);
                          }}
                          editable={!isInteractiveLocked && !isSubmittingBoggle && boggleAttemptsLeft > 0}
                          onSubmitEditing={() => {
                            void submitBoggle();
                          }}
                        />
                        <Pressable
                          className="items-center justify-center rounded-xl px-4 active:opacity-90"
                          style={{
                            backgroundColor:
                              isInteractiveLocked || isSubmittingBoggle || boggleAttemptsLeft <= 0
                                ? EXPEDITION_THEME.panelStrong
                                : EXPEDITION_THEME.accent,
                          }}
                          onPress={() => {
                            void submitBoggle();
                          }}
                          disabled={isInteractiveLocked || isSubmittingBoggle || boggleAttemptsLeft <= 0}
                        >
                          <Text className="text-xs font-semibold text-zinc-950">{isSubmittingBoggle ? "..." : "Sprawdź"}</Text>
                        </Pressable>
                      </View>
                      {boggleResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {boggleResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isMiniSudokuStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Uzupełnij siatkę 2x2 cyframi 1 i 2 (bez powtórzeń w wierszach i kolumnach).
                      </Text>
                      <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textSubtle }}>
                        Pozostało prób: {miniSudokuAttemptsLeft}
                      </Text>
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        {Array.from({ length: 4 }).map((_, index) => {
                          const givenValue = miniSudokuPuzzle?.given[index] ?? null;
                          const value = givenValue ?? normalizedMiniSudokuValues[index] ?? "";
                          return (
                            <View
                              key={`${station.stationId}-sudoku-${index}`}
                              className="w-[48%] rounded-xl border px-3 py-2"
                              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
                            >
                              {givenValue ? (
                                <Text className="text-center text-lg font-bold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                                  {givenValue}
                                </Text>
                              ) : (
                                <TextInput
                                  className="text-center text-lg font-bold"
                                  style={{ color: EXPEDITION_THEME.textPrimary }}
                                  keyboardType="number-pad"
                                  value={value}
                                  onChangeText={(nextValue) => {
                                    setMiniSudokuValues((current) => {
                                      const next = [...current];
                                      next[index] = nextValue.replace(/[^1-2]/g, "").slice(0, 1);
                                      return next;
                                    });
                                    setMiniSudokuResult(null);
                                    setQuizSubmitError(null);
                                  }}
                                  editable={!isInteractiveLocked && !isSubmittingMiniSudoku && miniSudokuAttemptsLeft > 0}
                                />
                              )}
                            </View>
                          );
                        })}
                      </View>
                      <Pressable
                        className="mt-2 items-center rounded-xl py-2.5 active:opacity-90"
                        style={{
                          backgroundColor:
                            isInteractiveLocked || isSubmittingMiniSudoku || miniSudokuAttemptsLeft <= 0
                              ? EXPEDITION_THEME.panelStrong
                              : EXPEDITION_THEME.accent,
                        }}
                        onPress={() => {
                          void submitMiniSudoku();
                        }}
                        disabled={isInteractiveLocked || isSubmittingMiniSudoku || miniSudokuAttemptsLeft <= 0}
                      >
                        <Text className="text-sm font-semibold text-zinc-950">{isSubmittingMiniSudoku ? "..." : "Sprawdź układ"}</Text>
                      </Pressable>
                      {miniSudokuResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {miniSudokuResult}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {isMatchingStation ? (
                    <View className="mt-3">
                      <Text className="text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                        Połącz elementy. Pozostało prób: {matchingAttemptsLeft}
                      </Text>
                      <View className="mt-2 flex-row gap-2">
                        <View className="flex-1 gap-1.5">
                          {matchingPairs.map((pair) => {
                            const isMatched = matchingMatchedLeft.includes(pair.left);
                            const isSelected = matchingSelectionLeft === pair.left;
                            return (
                              <Pressable
                                key={`${station.stationId}-matching-left-${pair.left}`}
                                className="rounded-xl border px-3 py-2 active:opacity-90"
                                style={{
                                  borderColor: isMatched
                                    ? "rgba(52, 211, 153, 0.8)"
                                    : isSelected
                                      ? EXPEDITION_THEME.accentStrong
                                      : EXPEDITION_THEME.border,
                                  backgroundColor: isMatched ? "rgba(34, 197, 94, 0.2)" : EXPEDITION_THEME.panelStrong,
                                }}
                                onPress={() => {
                                  if (isInteractiveLocked || isMatched || matchingAttemptsLeft <= 0) {
                                    return;
                                  }
                                  setMatchingSelectionLeft(pair.left);
                                  setMatchingResult(null);
                                  setQuizSubmitError(null);
                                }}
                                disabled={isInteractiveLocked || isMatched || matchingAttemptsLeft <= 0}
                              >
                                <Text className="text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                                  {pair.left}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <View className="flex-1 gap-1.5">
                          {matchingRightOptions.map((rightOption) => {
                            const isMatched = matchedRightSet.has(rightOption);
                            return (
                              <Pressable
                                key={`${station.stationId}-matching-right-${rightOption}`}
                                className="rounded-xl border px-3 py-2 active:opacity-90"
                                style={{
                                  borderColor: isMatched ? "rgba(52, 211, 153, 0.8)" : EXPEDITION_THEME.border,
                                  backgroundColor: isMatched ? "rgba(34, 197, 94, 0.2)" : EXPEDITION_THEME.panelStrong,
                                }}
                                onPress={() => {
                                  void handleMatchingRightSelect(rightOption);
                                }}
                                disabled={isInteractiveLocked || isMatched || matchingAttemptsLeft <= 0}
                              >
                                <Text className="text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                                  {rightOption}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                      {matchingResult ? (
                        <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
                          {matchingResult}
                        </Text>
                      ) : null}
                    </View>
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
              <View
                className={`${isNumericCodeStation ? "mt-2" : "mt-3"} rounded-2xl border px-3 ${isNumericCodeStation ? "py-2" : "py-3"}`}
                style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              >
                {station.completionCodeInputMode === "numeric" ? (
                  <View className={isNumericCodeStation ? "mt-1" : "mt-2"}>
                    <View className="items-center">
                      <Animated.View
                        className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} w-full max-w-[320px] rounded-2xl border px-4 ${isNumericCodeStation ? "py-2.5" : "py-3"}`}
                        style={[
                          codeInputShakeStyle,
                            {
                             borderColor: isCodeInputSuccess
                               ? "#34d399"
                               : isCodeInputInvalid
                                 ? EXPEDITION_THEME.danger
                                 : EXPEDITION_THEME.border,
                             backgroundColor: isCodeInputSuccess
                               ? "rgba(52, 211, 153, 0.2)"
                               : isCodeInputInvalid
                                 ? "rgba(239, 111, 108, 0.16)"
                                 : EXPEDITION_THEME.panelStrong,
                           },
                         ]}
                       >
                        <Text
                          className="text-center text-2xl font-semibold tracking-[0.35em]"
                          style={{ color: EXPEDITION_THEME.textPrimary }}
                          numberOfLines={1}
                        >
                          {verificationCode || "• • • •"}
                        </Text>
                      </Animated.View>
                    </View>

                    <View className={`mx-auto ${isNumericCodeStation ? "mt-2" : "mt-3"} w-full max-w-[320px] flex-row flex-wrap justify-between gap-y-2`}>
                      {NUMERIC_PINPAD_LAYOUT.map((key) => {
                        const isBackspaceKey = key === "backspace";
                        const isSubmitKey = key === "submit";
                        const isDisabled =
                          isCodeActionDisabled ||
                          (isBackspaceKey && verificationCode.length === 0);
                        const label = isBackspaceKey ? "⌫" : isSubmitKey ? "OK" : key;
                        const isDigitKey = /^\d$/.test(label);
                        const sublabel = isDigitKey ? NUMERIC_PINPAD_SUBLABELS[label] : "";

                        return (
                          <Pressable
                            key={`${station.stationId}-pin-${key}`}
                            className="items-center justify-center rounded-full active:opacity-85"
                            style={{
                              width: "31%",
                              aspectRatio: 1,
                              borderWidth: 1,
                              borderColor: EXPEDITION_THEME.border,
                              backgroundColor: isSubmitKey
                                ? isDisabled
                                  ? EXPEDITION_THEME.panelStrong
                                  : EXPEDITION_THEME.accent
                                : EXPEDITION_THEME.panelStrong,
                              opacity: isDisabled ? 0.45 : 1,
                            }}
                            disabled={isDisabled}
                        onPress={() => {
                          if (isBackspaceKey) {
                            setVerificationCode((current) => current.slice(0, -1));
                            setIsCodeInputInvalid(false);
                            setIsCodeInputSuccess(false);
                            setCodeResult(null);
                            return;
                          }
                              if (isSubmitKey) {
                                void submitVerificationCode();
                                return;
                              }

                              setVerificationCode((current) => {
                                const nextValue = `${current}${key}`;
                                return nextValue.slice(0, 32);
                              });
                              setIsCodeInputInvalid(false);
                              setIsCodeInputSuccess(false);
                              setCodeResult(null);
                            }}
                          >
                            {isDigitKey ? (
                              <View className="h-full w-full items-center justify-center">
                                <Text
                                  className="text-[30px] font-medium text-center"
                                  style={{
                                    color: EXPEDITION_THEME.textPrimary,
                                    textAlign: "center",
                                    fontVariant: ["tabular-nums"],
                                  }}
                                >
                                  {label}
                                </Text>
                                <Text
                                  className="mt-[-2px] text-[9px] font-semibold tracking-[1.6px] text-center"
                                  style={{ color: EXPEDITION_THEME.textSubtle }}
                                >
                                  {sublabel}
                                </Text>
                              </View>
                            ) : (
                              <Text
                                className={`${isSubmitKey ? "text-xl" : "text-base"} font-semibold text-center`}
                                style={{
                                  color: isSubmitKey ? "#09090b" : EXPEDITION_THEME.textPrimary,
                                  width: "100%",
                                  textAlign: "center",
                                  textAlignVertical: "center",
                                }}
                              >
                                {label}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <Animated.View style={codeInputShakeStyle}>
                    <TextInput
                      className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} rounded-xl border px-3 py-2 text-sm`}
                      style={{
                         borderColor: isCodeInputSuccess
                           ? "#34d399"
                           : isCodeInputInvalid
                             ? EXPEDITION_THEME.danger
                             : EXPEDITION_THEME.border,
                         backgroundColor: isCodeInputSuccess
                           ? "rgba(52, 211, 153, 0.2)"
                           : isCodeInputInvalid
                             ? "rgba(239, 111, 108, 0.16)"
                             : EXPEDITION_THEME.panelStrong,
                         color: EXPEDITION_THEME.textPrimary,
                       }}
                      placeholder={getCodePlaceholder(station.stationType)}
                      placeholderTextColor={EXPEDITION_THEME.textSubtle}
                       autoCapitalize="characters"
                       autoCorrect={false}
                         value={verificationCode}
                         editable={
                           station.status !== "done" &&
                           station.status !== "failed" &&
                           (!hasTimedLimit || (hasTimerStarted && !isTimeExpired))
                         }
                       onChangeText={(value) => {
                        setVerificationCode(value);
                        setIsCodeInputInvalid(false);
                        setIsCodeInputSuccess(false);
                        setCodeResult(null);
                      }}
                    />
                  </Animated.View>
                )}

                {station.completionCodeInputMode !== "numeric" ? (
                  <Pressable
                    className={`${isNumericCodeStation ? "mt-2" : "mt-3"} items-center rounded-xl py-2.5 active:opacity-90`}
                    style={{
                      backgroundColor: isCodeActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
                    }}
                    disabled={isCodeActionDisabled}
                    onPress={() => {
                      void submitVerificationCode();
                    }}
                  >
                    <Text className="text-sm font-semibold text-zinc-950">
                      {isSubmittingCode ? "Zatwierdzanie..." : "Zatwierdź kod"}
                    </Text>
                  </Pressable>
                ) : null}

                {codeResult && !isInvalidCompletionCodeErrorMessage(codeResult) ? (
                  <Text className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} text-xs`} style={{ color: EXPEDITION_THEME.textMuted }}>
                    {codeResult}
                  </Text>
                ) : null}
              </View>
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
