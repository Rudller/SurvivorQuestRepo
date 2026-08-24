import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Keyboard, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Rect, SvgUri } from "react-native-svg";
import { useAudioQuizPlayback } from "../../expedition-stage/components/station-overlays/station-panels/use-audio-quiz-playback";
import type { OnboardingSession, RealizationLanguage, RealizationLanguageOption } from "../../onboarding/model/types";
import { getRealizationLanguageFlag, getRealizationLanguageLabel } from "../../onboarding/model/types";
import { EXPEDITION_THEME, getTeamColors, type ExpeditionThemeMode } from "../../onboarding/model/constants";
import { resolveUiLanguage } from "../../i18n";
import { QrScannerOverlay } from "../../expedition-stage/components/qr-scanner-overlay";
import { TopRealizationPanel } from "../../expedition-stage/components/top-realization-panel";
import {
  StationPreviewOverlay,
  type StationTestType,
  type StationTestViewModel,
} from "../../expedition-stage/components/station-overlays";
import {
  fetchMobileSessionState,
  getMobileApiErrorStatusCode,
} from "../../expedition-stage/api/mobile-session.api";
import {
  fetchRiskQuizDeckStatus,
  fetchRiskQuizPendingDraw,
  fetchRiskQuizTestMenu,
  postRiskQuizAnswer,
  postRiskQuizScan,
  type RiskAnswerResult,
  type RiskDeckStatus,
  type RiskScanResult,
  type RiskTestMenuEntry,
} from "../api/risk-quiz.api";
import { AutoScrollingIntroBox } from "../../../shared/ui/intro-text-preview";
import { RiskQuizBottomPanel } from "../components/risk-quiz-bottom-panel";
import { RiskQuizDeckStack } from "../components/risk-quiz-deck-stack";
import { RiskQuizBackground } from "../components/risk-quiz-background";
import { useRealizationCountdown } from "../../expedition-stage/hooks/use-realization-countdown";

type RiskQuizScreenProps = {
  session: OnboardingSession;
  onSessionInvalid: (reason?: string) => void;
  onExitRealization: () => void;
  onSelectedLanguageChange?: (language: RealizationLanguage) => void;
  themeMode: ExpeditionThemeMode;
  onToggleTheme: () => void;
};

type ActiveDraw = Extract<RiskScanResult, { exhausted: false }>;

type LiveRealizationInfo = {
  companyName: string;
  logoUrl?: string;
  availableLanguages: RealizationLanguageOption[];
  language?: RealizationLanguage;
  selectedLanguage?: RealizationLanguage;
  scheduledAt: string;
  durationMinutes: number;
};

type LiveTeamInfo = {
  name: string | null;
  slotNumber: number;
  color: string | null;
  badgeImageUrl: string | null;
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];
const ANSWER_INDEX_TYPES = new Set(["quiz", "audio-quiz"]);
const AUDIO_PLAY_ICON_SVG_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/player-play.svg";
const AUDIO_PAUSE_ICON_SVG_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/player-pause.svg";
// Decorative static waveform — purely visual, not driven by real audio data.
const AUDIO_TRACK_BAR_HEIGHTS = [10, 18, 26, 16, 30, 20, 34, 22, 14, 28, 18, 32, 20, 12, 26, 16, 30, 20, 24, 14, 18, 28, 22, 16, 30, 20, 12, 24, 18, 10];

const AUDIO_TRACK_HEIGHT = 220;

function AudioTrackCard({ isPlaying, isLoading, onPress }: { isPlaying: boolean; isLoading: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className="w-full items-center justify-center"
      style={{ height: AUDIO_TRACK_HEIGHT, opacity: isLoading ? 0.6 : 1 }}
    >
      <Svg
        width="100%"
        height={AUDIO_TRACK_HEIGHT}
        viewBox={`0 0 300 ${AUDIO_TRACK_HEIGHT}`}
        preserveAspectRatio="none"
        style={{ position: "absolute" }}
      >
        {AUDIO_TRACK_BAR_HEIGHTS.map((height, index) => {
          const scaledHeight = height * 4.2;
          return (
            <Rect
              key={index}
              x={index * 10 + 1}
              y={(AUDIO_TRACK_HEIGHT - scaledHeight) / 2}
              width={8}
              rx={4}
              height={scaledHeight}
              fill={EXPEDITION_THEME.accent}
              opacity={isPlaying ? 0.85 : 0.35}
            />
          );
        })}
      </Svg>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 84, height: 84, backgroundColor: EXPEDITION_THEME.accent }}
      >
        {isLoading ? (
          <ActivityIndicator color={EXPEDITION_THEME.background} />
        ) : (
          <SvgUri
            uri={isPlaying ? AUDIO_PAUSE_ICON_SVG_URI : AUDIO_PLAY_ICON_SVG_URI}
            width={38}
            height={38}
            color={EXPEDITION_THEME.background}
            fill={EXPEDITION_THEME.background}
          />
        )}
      </View>
    </Pressable>
  );
}
// Polish display labels for every station type — mirrors
// stationTypeOptions in apps/admin/src/features/games/types/station.ts.
const STATION_TYPE_LABELS: Record<StationTestType, string> = {
  quiz: "Quiz",
  "audio-quiz": "Quiz audio",
  time: "Na czas",
  points: "Na punkty",
  wordle: "Wordle",
  hangman: "Wisielec",
  mastermind: "Mastermind",
  anagram: "Anagram",
  "caesar-cipher": "Szyfr Cezara",
  memory: "Memory",
  simon: "Simon mówi",
  rebus: "Rebus",
  boggle: "Boggle",
  "mini-sudoku": "Mini Sudoku",
  matching: "Dopasowywanie",
  "strong-password": "Mocne hasło",
  "photo-task": "Zadanie fotograficzne",
  "qr-hunt": "Skanowanie kodów QR",
  "open-quiz": "Quiz – pytanie otwarte",
};
// Keep in sync with RISK_QUIZ_INTRO_TEXT_PLACEHOLDER in
// apps/admin/src/features/realizations/realization.utils.ts — shown to
// players whenever the admin leaves the "Tekst wstępu" field empty.
const INTRO_FALLBACK_TEXT =
  "Witajcie w grze! Za chwilę zaczynamy — skanujcie karty, podejmujcie wyzwania i zdobywajcie punkty dla swojej drużyny. Powodzenia!";
const START_POLL_INTERVAL_MS = 3000;
// How often to check for a remote-launched draw ("Uruchom na tablecie" in
// the admin panel) while idle on the scan screen — see the polling effect
// below.
const IDLE_POLL_INTERVAL_MS = 4000;
// Matches TEST_MENU_TRIGGER_HOLD_MS in use-expedition-stage-overlay-flow.ts —
// same hold-the-team-banner gesture as normal gameplay's station test menu.
const TEST_MENU_TRIGGER_HOLD_MS = 5000;
// Must match the screen container's own `px-3 py-3` / rowGap below — the
// always-visible timer is positioned absolutely against that box, so it has
// to re-derive where the in-flow content actually starts.
const SCREEN_EDGE_PADDING = 12;
const SCREEN_ROW_GAP = 10;

export function RiskQuizScreen({
  session,
  onSessionInvalid,
  onExitRealization,
  onSelectedLanguageChange,
  themeMode,
  onToggleTheme,
}: RiskQuizScreenProps) {
  const apiBaseUrl = session.apiBaseUrl ?? "";
  const sessionToken = session.sessionToken;
  const isLightTheme = themeMode === "light";

  const [showIntro, setShowIntro] = useState(true);
  const [teamPoints, setTeamPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [deckStatus, setDeckStatus] = useState<RiskDeckStatus | null>(null);
  const [liveRealization, setLiveRealization] = useState<LiveRealizationInfo | null>(null);
  const [liveTeam, setLiveTeam] = useState<LiveTeamInfo | null>(null);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [exhaustedNotice, setExhaustedNotice] = useState<{ categoryName: string } | null>(null);
  const [activeDraw, setActiveDraw] = useState<ActiveDraw | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [topPanelHeight, setTopPanelHeight] = useState(0);
  const [timerHeight, setTimerHeight] = useState(0);
  const [remainingTaskSeconds, setRemainingTaskSeconds] = useState<number | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [answerResult, setAnswerResult] = useState<RiskAnswerResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestMenuOpen, setIsTestMenuOpen] = useState(false);
  const [isLoadingTestMenu, setIsLoadingTestMenu] = useState(false);
  const [testMenuEntries, setTestMenuEntries] = useState<RiskTestMenuEntry[]>([]);
  const [testMenuError, setTestMenuError] = useState<string | null>(null);
  const testMenuHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionRevealAnimation = useRef(new Animated.Value(0)).current;
  const timerShakeAnimation = useRef(new Animated.Value(0)).current;
  const autoDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentScrollViewRef = useRef<ScrollView>(null);

  // Mirrors the normal realization's "waiting for admin start" poll: while the
  // intro screen is showing, keep checking realization status and reveal the
  // scan UI as soon as the game is actually in progress, instead of a manual
  // dismiss button. Also hydrates the top bar's live realization/team info
  // (logo, badge, points) for the main screen that follows.
  useEffect(() => {
    if (!showIntro) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const pollUntilStarted = async () => {
      try {
        const state = await fetchMobileSessionState(apiBaseUrl, sessionToken, session.selectedLanguage);
        if (cancelled) {
          return;
        }

        setTeamPoints(state.team.points);
        setLiveRealization({
          companyName: state.realization.companyName,
          logoUrl: state.realization.logoUrl,
          availableLanguages: state.realization.availableLanguages,
          language: state.realization.language,
          selectedLanguage: state.realization.selectedLanguage,
          scheduledAt: state.realization.scheduledAt,
          durationMinutes: state.realization.durationMinutes,
        });
        setLiveTeam({
          name: state.team.name,
          slotNumber: state.team.slotNumber,
          color: state.team.color,
          badgeImageUrl: state.team.badgeImageUrl,
        });

        if (state.realization.status === "in-progress") {
          setShowIntro(false);
          return;
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (getMobileApiErrorStatusCode(error) === 401) {
          onSessionInvalid();
          return;
        }
      }

      timeoutId = setTimeout(() => {
        void pollUntilStarted();
      }, START_POLL_INTERVAL_MS);
    };

    void pollUntilStarted();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showIntro, apiBaseUrl, sessionToken, session.selectedLanguage, onSessionInvalid]);

  async function refreshDeckStatus() {
    try {
      const status = await fetchRiskQuizDeckStatus(apiBaseUrl, { sessionToken });
      setDeckStatus(status);
    } catch (error) {
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
      }
    }
  }

  useEffect(() => {
    if (showIntro) {
      return;
    }
    void refreshDeckStatus();
    // Only when the intro screen hands off to the scan screen — later
    // updates come from refreshDeckStatus() calls after each answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro]);

  // Remote "Uruchom na tablecie" support. Keep consuming commands while a
  // card is open as well: repeated admin clicks are then harmless instead of
  // becoming a queued card that unexpectedly opens after the current one.
  useEffect(() => {
    if (showIntro || isTestMenuOpen || isScannerVisible) {
      return;
    }

    let cancelled = false;
    let pollInFlight = false;

    const pollPendingDraw = async () => {
      if (pollInFlight) {
        return;
      }
      pollInFlight = true;
      try {
        const result = await fetchRiskQuizPendingDraw(apiBaseUrl, { sessionToken });
        if (cancelled || !result.draw || activeDraw) {
          return;
        }
        setActiveDraw({
          exhausted: false,
          cardId: result.draw.cardId,
          categoryName: result.draw.categoryName,
          difficulty: result.draw.difficulty,
          station: result.draw.station,
        });
        setExhaustedNotice(null);
        setAnswerResult(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (getMobileApiErrorStatusCode(error) === 401) {
          onSessionInvalid();
        }
        // Any other error is silent — the next tick just retries.
      } finally {
        pollInFlight = false;
      }
    };

    const interval = setInterval(() => void pollPendingDraw(), IDLE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [showIntro, activeDraw, isTestMenuOpen, isScannerVisible, apiBaseUrl, sessionToken, onSessionInvalid]);

  useEffect(() => {
    return () => {
      if (testMenuHoldTimeoutRef.current) {
        clearTimeout(testMenuHoldTimeoutRef.current);
      }
    };
  }, []);

  // Same mechanism the normal (full-screen) station overlay uses to keep a
  // focused input above the keyboard: track the keyboard's height and shrink
  // the whole content container by it, so everything inside reflows into the
  // space that's left (see preview.tsx's identical listener + its card's
  // paddingBottom). Unlike that overlay, this screen doesn't own the entire
  // viewport — the top panel, big timer and bottom panel would eat all the
  // remaining room — so while the keyboard is up the timer and bottom panel
  // are hidden too (see below), freeing that space for the station itself.
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      contentScrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Fade-and-slide-up reveal every time a new card is drawn (keyed off
  // cardId, not just activeDraw !== null, so re-rendering the same question
  // — e.g. after an answer submission — doesn't replay the animation).
  useEffect(() => {
    if (!activeDraw) {
      return;
    }
    questionRevealAnimation.setValue(0);
    Animated.timing(questionRevealAnimation, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDraw?.cardId]);

  // Countdown for the current card's time-to-answer, shown under the top
  // panel — stops updating once the card has been answered.
  useEffect(() => {
    const timeLimitSeconds = activeDraw?.station.timeLimitSeconds ?? 0;
    if (!activeDraw || timeLimitSeconds <= 0 || answerResult) {
      setRemainingTaskSeconds(null);
      return;
    }

    const endsAtMs = Date.now() + timeLimitSeconds * 1000;
    setRemainingTaskSeconds(timeLimitSeconds);

    const interval = setInterval(() => {
      setRemainingTaskSeconds(Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000)));
    }, 250);

    return () => clearInterval(interval);
  }, [activeDraw?.cardId, activeDraw?.station.timeLimitSeconds, answerResult]);

  const isTimerUrgent =
    remainingTaskSeconds !== null && remainingTaskSeconds <= 10 && remainingTaskSeconds > 0;

  // Shake burst on every tick of the final 10 seconds — raises the tension as
  // time runs out instead of just changing color.
  useEffect(() => {
    if (!isTimerUrgent) {
      timerShakeAnimation.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(timerShakeAnimation, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(timerShakeAnimation, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(timerShakeAnimation, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(timerShakeAnimation, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(timerShakeAnimation, { toValue: 0, duration: 70, useNativeDriver: true }),
        Animated.delay(450),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
    };
  }, [isTimerUrgent, timerShakeAnimation]);

  // Shared by the auto-dismiss timer below and the bottom panel's flipped
  // "close card" button — slides the card back out downward (mirroring the
  // entrance) and clears it once the animation finishes. Closing never
  // submits an answer; the card is just abandoned client-side.
  function dismissActiveCard() {
    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
      autoDismissTimeoutRef.current = null;
    }
    Animated.timing(questionRevealAnimation, {
      toValue: 0,
      duration: 320,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setActiveDraw(null);
        setAnswerResult(null);
        setExhaustedNotice(null);
      }
    });
  }

  // Give the player a moment to read the "Dobrze!/Źle!" result, then
  // auto-dismiss — cancelled if a fresh card gets drawn (answerResult resets
  // to null) before the timer fires, so it never dismisses the wrong question.
  useEffect(() => {
    if (!answerResult) {
      return;
    }

    autoDismissTimeoutRef.current = setTimeout(() => {
      autoDismissTimeoutRef.current = null;
      dismissActiveCard();
    }, 2200);

    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
        autoDismissTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerResult]);

  const selectedLanguage: RealizationLanguage =
    session.selectedLanguage ??
    liveRealization?.selectedLanguage ??
    session.realization?.selectedLanguage ??
    liveRealization?.language ??
    session.realization?.language ??
    "polish";

  const availableLanguageOptions = useMemo<RealizationLanguageOption[]>(() => {
    if (liveRealization?.availableLanguages && liveRealization.availableLanguages.length > 0) {
      return liveRealization.availableLanguages;
    }

    if (session.realization?.availableLanguages && session.realization.availableLanguages.length > 0) {
      return session.realization.availableLanguages;
    }

    return [
      {
        value: selectedLanguage,
        label:
          selectedLanguage === "other"
            ? session.realization?.customLanguage?.trim() || getRealizationLanguageLabel(selectedLanguage)
            : getRealizationLanguageLabel(selectedLanguage),
      },
    ];
  }, [
    selectedLanguage,
    session.realization?.availableLanguages,
    session.realization?.customLanguage,
    liveRealization?.availableLanguages,
  ]);
  const hasMultipleLanguageOptions = availableLanguageOptions.length > 1;
  const currentLanguageOption =
    availableLanguageOptions.find((option) => option.value === selectedLanguage) ??
    availableLanguageOptions[0] ??
    null;
  const currentLanguageFlag = getRealizationLanguageFlag(currentLanguageOption?.value ?? "polish");
  const handleLanguageButtonPress = () => {
    if (availableLanguageOptions.length === 2) {
      const nextOption =
        availableLanguageOptions.find((option) => option.value !== selectedLanguage) ??
        availableLanguageOptions[0];
      if (nextOption && nextOption.value !== selectedLanguage) {
        onSelectedLanguageChange?.(nextOption.value);
      }
      return;
    }
    setIsLanguagePickerOpen(true);
  };

  const teamColorFromPalette =
    getTeamColors(resolveUiLanguage(selectedLanguage)).find((color) => color.key === liveTeam?.color) ?? null;
  const teamColorHex = teamColorFromPalette?.hex ?? session.team.colorHex;
  const teamColorLabel = teamColorFromPalette?.label ?? session.team.colorLabel;
  const teamName = liveTeam?.name?.trim() || session.team.name || "Drużyna";
  const teamIcon = session.team.icon.trim().length > 0 ? session.team.icon : "🏁";
  const teamBadgeImageUrl = liveTeam?.badgeImageUrl ?? undefined;
  const teamSlot = liveTeam?.slotNumber ?? session.team.slotNumber;
  const companyName =
    liveRealization?.companyName || session.realization?.companyName || `Realizacja ${session.realizationCode}`;
  const countdown = useRealizationCountdown(
    liveRealization?.scheduledAt ?? session.realization?.scheduledAt ?? new Date().toISOString(),
    liveRealization?.durationMinutes ?? session.realization?.durationMinutes ?? 120,
  );

  async function handleDetected(rawValue: string) {
    setIsResolvingScan(true);
    setErrorMessage(null);
    try {
      const result = await postRiskQuizScan(apiBaseUrl, { sessionToken, code: rawValue });
      setIsScannerVisible(false);
      if (result.exhausted) {
        setExhaustedNotice({ categoryName: result.categoryName });
        setActiveDraw(null);
      } else {
        setActiveDraw(result);
        setExhaustedNotice(null);
        setAnswerResult(null);
      }
    } catch (error) {
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
        return;
      }
      setIsScannerVisible(false);
      setErrorMessage(error instanceof Error ? error.message : "Nie udało się zeskanować karty.");
    } finally {
      setIsResolvingScan(false);
    }
  }

  async function submitOutcome(input: { selectedIndex?: number; completed?: boolean }) {
    if (!activeDraw || isSubmittingAnswer) return;
    setIsSubmittingAnswer(true);
    setErrorMessage(null);
    try {
      const result = await postRiskQuizAnswer(apiBaseUrl, {
        sessionToken,
        cardId: activeDraw.cardId,
        stationId: activeDraw.station.id,
        ...input,
      });
      setAnswerResult(result);
      setTeamPoints(result.teamPoints);
      setStreak(result.streak);
      setMultiplier(result.multiplier);
      void refreshDeckStatus();
    } catch (error) {
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "Nie udało się wysłać wyniku.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  // Adapts the real station panels' pass/fail callbacks (StationPreviewOverlay)
  // to Ryzykanci's own scoring endpoint — every non-quiz/audio-quiz type is
  // scored server-side as a plain "completed = correct" self-report (see
  // resolveOutcome() in risk-quiz.service.ts), same as the "Ukończone" /
  // "Poddaję się" buttons this replaces for those types.
  async function completeCurrentCard(completed: boolean): Promise<string | null> {
    await submitOutcome({ completed });
    return null;
  }

  function buildStationPreviewViewModel(draw: ActiveDraw): StationTestViewModel {
    const station = draw.station;
    const quiz = station.quiz;
    return {
      stationId: station.id,
      stationType: station.type as StationTestType,
      completionCodeInputMode: station.completionCodeInputMode,
      completionCodeLength: station.completionCodeLength,
      name: station.name,
      typeLabel: STATION_TYPE_LABELS[station.type as StationTestType] ?? station.type,
      description: station.description,
      imageUrl: station.imageUrl ?? "",
      points: station.points,
      timeLimitSeconds: station.timeLimitSeconds,
      timeLimitLabel: formatTimeLimitLabel(station.timeLimitSeconds),
      quizQuestion: quiz?.question,
      quizAnswers: quiz?.answers && quiz.answers.length === 4 ? (quiz.answers as [string, string, string, string]) : undefined,
      quizCorrectAnswerIndex: quiz?.correctAnswerIndex,
      quizAudioUrl: quiz?.audioUrl,
      quizAcceptedAnswers: quiz?.acceptedAnswers,
      status: "todo",
      startedAt: new Date().toISOString(),
    };
  }

  async function openTestMenu() {
    setIsTestMenuOpen(true);
    setIsLoadingTestMenu(true);
    setTestMenuError(null);
    try {
      const entries = await fetchRiskQuizTestMenu(apiBaseUrl, { sessionToken });
      setTestMenuEntries(entries);
    } catch (error) {
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
        return;
      }
      setTestMenuError(error instanceof Error ? error.message : "Nie udało się wczytać menu testowego.");
    } finally {
      setIsLoadingTestMenu(false);
    }
  }

  function handleTestMenuHoldStart() {
    testMenuHoldTimeoutRef.current = setTimeout(() => {
      testMenuHoldTimeoutRef.current = null;
      void openTestMenu();
    }, TEST_MENU_TRIGGER_HOLD_MS);
  }

  function handleTestMenuHoldEnd() {
    if (testMenuHoldTimeoutRef.current) {
      clearTimeout(testMenuHoldTimeoutRef.current);
      testMenuHoldTimeoutRef.current = null;
    }
  }

  function handleEnterTestMenuEntry(entry: RiskTestMenuEntry) {
    setIsTestMenuOpen(false);
    void handleDetected(entry.code);
  }

  const isAnswerIndexType = activeDraw ? ANSWER_INDEX_TYPES.has(activeDraw.station.type) : false;
  const isAudioQuizType = activeDraw?.station.type === "audio-quiz";
  const answers = activeDraw?.station.quiz?.answers ?? [];
  const { isAudioPlaying, isAudioLoading, handlePlayAudio, handleStopAudio } = useAudioQuizPlayback({
    stationType: activeDraw ? (activeDraw.station.type as StationTestType) : null,
    quizAudioUrl: activeDraw?.station.quiz?.audioUrl,
    text: {
      audioSourceMissing: "Brak nagrania audio dla tego zadania.",
      audioLoadFailed: "Nie udało się załadować nagrania.",
      audioPlayFailed: "Nie udało się odtworzyć nagrania.",
    },
  });

  if (showIntro) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: EXPEDITION_THEME.background }}>
        <RiskQuizBackground isLightTheme={isLightTheme} />
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="w-full rounded-3xl border p-5"
            style={{ maxWidth: 560, borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
          >
            <Text className="uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong, fontSize: 12 }}>
              Tekst wstępu
            </Text>
            <AutoScrollingIntroBox
              text={session.realization?.introText?.trim() || ""}
              fallbackText={INTRO_FALLBACK_TEXT}
            />
            <View className="mt-5 flex-row items-center gap-2">
              <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
              <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: 14 }}>Czekamy na rozpoczęcie gry...</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: EXPEDITION_THEME.background }}>
      <RiskQuizBackground isLightTheme={isLightTheme} />
      <View className="flex-1 px-3 py-3" style={{ rowGap: 10, paddingBottom: keyboardHeight || undefined }}>
        <Pressable
          onPressIn={handleTestMenuHoldStart}
          onPressOut={handleTestMenuHoldEnd}
          onLayout={(event) => setTopPanelHeight(event.nativeEvent.layout.height)}
        >
          <TopRealizationPanel
            companyName={companyName}
            logoUrl={liveRealization?.logoUrl}
            teamName={teamName}
            teamSlot={teamSlot}
            teamColorHex={teamColorHex}
            teamColorLabel={teamColorLabel}
            teamIcon={teamIcon}
            teamBadgeImageUrl={teamBadgeImageUrl}
            points={teamPoints}
            languageFlag={currentLanguageFlag}
            showLanguageButton={hasMultipleLanguageOptions}
            onOpenLanguagePicker={handleLanguageButtonPress}
            themeMode={themeMode}
            onToggleTheme={onToggleTheme}
          />
        </Pressable>

        {remainingTaskSeconds !== null ? (
          <Animated.View
            className="items-center"
            pointerEvents="none"
            onLayout={(event) => setTimerHeight(event.nativeEvent.layout.height)}
            style={{
              // Floated above the content instead of sitting in the column:
              // the timer must stay visible at all times (including while the
              // keyboard is up), but it must not eat any of the vertical room
              // the station content needs — especially once the keyboard has
              // already taken half the screen.
              position: "absolute",
              left: 0,
              right: 0,
              top: SCREEN_EDGE_PADDING + topPanelHeight + SCREEN_ROW_GAP,
              zIndex: 40,
              alignItems: "center",
              opacity: questionRevealAnimation,
              transform: [
                {
                  translateY: questionRevealAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
                {
                  translateX: timerShakeAnimation.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-8, 8],
                  }),
                },
                {
                  rotate: timerShakeAnimation.interpolate({
                    inputRange: [-1, 1],
                    outputRange: ["-4deg", "4deg"],
                  }),
                },
              ],
            }}
          >
            <Text
              style={{
                color: remainingTaskSeconds <= 10 ? "#ef4444" : EXPEDITION_THEME.accentStrong,
                fontSize: 72,
                fontWeight: "900",
              }}
            >
              {`${Math.floor(remainingTaskSeconds / 60)}:${String(remainingTaskSeconds % 60).padStart(2, "0")}`}
            </Text>
          </Animated.View>
        ) : null}

        <ScrollView
          ref={contentScrollViewRef}
          style={{
            width: "100%",
            flex: 1,
            // The timer floats over this area, so keep the content clear of it
            // in the roomy (no keyboard) state. While typing, space is scarce
            // and the content is bottom-aligned anyway, so it can slide under
            // the timer instead of being pushed off-screen.
            marginTop: remainingTaskSeconds !== null && keyboardHeight === 0 ? timerHeight : 0,
          }}
          contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
          onTouchEnd={() => Keyboard.dismiss()}
        >
          {activeDraw && isAnswerIndexType ? (
            <Animated.View
              className="w-full"
              style={{
                rowGap: 14,
                opacity: questionRevealAnimation,
                transform: [
                  {
                    translateY: questionRevealAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                ],
              }}
            >
              <Text style={{ color: EXPEDITION_THEME.textSubtle, fontSize: 13 }}>
                {activeDraw.categoryName} • {difficultyLabel(activeDraw.difficulty)} • {activeDraw.station.name}
              </Text>
              <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: 22, fontWeight: "700" }}>
                {activeDraw.station.quiz?.question ?? activeDraw.station.name}
              </Text>

              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 8, rowGap: 10 }}>
                {answers.map((option, index) => {
                  const isSelected = answerResult !== null && index === answerResult.correctIndex;
                  const showAsWrong =
                    answerResult !== null && !answerResult.isCorrect && index !== answerResult.correctIndex;
                  return (
                    <Pressable
                      key={index}
                      disabled={isSubmittingAnswer || answerResult !== null}
                      onPress={() => void submitOutcome({ selectedIndex: index })}
                      className="rounded-2xl border px-4 py-5 justify-center"
                      style={{
                        width: "47%",
                        borderColor: isSelected
                          ? EXPEDITION_THEME.accent
                          : showAsWrong
                            ? "#ef4444"
                            : EXPEDITION_THEME.border,
                        backgroundColor: EXPEDITION_THEME.panel,
                        opacity: showAsWrong ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: 16 }}>
                        {OPTION_LETTERS[index]}. {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {isSubmittingAnswer ? <ActivityIndicator color={EXPEDITION_THEME.accent} /> : null}

              {answerResult ? (
                <View style={{ alignItems: "center", marginTop: 8 }}>
                  <Text
                    style={{
                      color: answerResult.isCorrect ? "#22c55e" : "#ef4444",
                      fontSize: 20,
                      fontWeight: "800",
                    }}
                  >
                    {answerResult.isCorrect ? "Dobrze!" : "Źle!"} {answerResult.pointsDelta >= 0 ? "+" : ""}
                    {answerResult.pointsDelta} pkt
                    {answerResult.isCorrect && answerResult.multiplier > 1 ? ` (x${answerResult.multiplier})` : ""}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          ) : activeDraw ? (
            <Animated.View
              className="w-full flex-1"
              style={{
                opacity: questionRevealAnimation,
                transform: [
                  {
                    translateY: questionRevealAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                ],
              }}
            >
              <StationPreviewOverlay
                presentation="inline"
                compactMedia={keyboardHeight > 0}
                station={buildStationPreviewViewModel(activeDraw)}
                onClose={dismissActiveCard}
                onRequestClose={dismissActiveCard}
                onCompleteTask={async () => completeCurrentCard(true)}
                onSubmitPhotoTask={async () => completeCurrentCard(true)}
                onQuizFailed={() => void completeCurrentCard(false)}
                onQuizPassed={() => void completeCurrentCard(true)}
                onTimeExpired={() => void completeCurrentCard(false)}
                timedStationPointsDecayEnabled={false}
              />
            </Animated.View>
          ) : (
            <View style={{ alignItems: "center", rowGap: 16 }}>
              <RiskQuizDeckStack
                deckCount={deckStatus?.categoryCount ?? 1}
                remainingCards={deckStatus?.remainingCards ?? null}
              />
              {exhaustedNotice ? (
                <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: 15, textAlign: "center" }}>
                  Brak nowych zadań w puli „{exhaustedNotice.categoryName}” na tym poziomie trudności. Zeskanuj inną
                  kartę.
                </Text>
              ) : (
                <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: 15, textAlign: "center" }}>
                  Zeskanuj kartę, aby wylosować zadanie.
                </Text>
              )}
            </View>
          )}

          {activeDraw && isAudioQuizType ? (
            <Animated.View
              className="w-full max-w-[560px]"
              style={{
                marginTop: 32,
                opacity: questionRevealAnimation,
                transform: [
                  {
                    translateY: questionRevealAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [28, 0],
                    }),
                  },
                ],
              }}
            >
              <AudioTrackCard
                isPlaying={isAudioPlaying}
                isLoading={isAudioLoading}
                onPress={() => void (isAudioPlaying ? handleStopAudio() : handlePlayAudio())}
              />
            </Animated.View>
          ) : null}

          {errorMessage ? (
            <Text style={{ color: "#ef4444", fontSize: 13, marginTop: 16, textAlign: "center" }}>{errorMessage}</Text>
          ) : null}
        </ScrollView>

        {keyboardHeight === 0 ? (
          <View className="w-full items-center">
            <View className="w-full max-w-[560px]">
              <RiskQuizBottomPanel
                remainingLabel={countdown.remainingLabel}
                isCompleted={countdown.isCompleted}
                streak={streak}
                multiplier={multiplier}
                onOpenQrScanner={() => setIsScannerVisible(true)}
                isScannerOpening={isResolvingScan}
                isCardOpen={Boolean(activeDraw)}
                onCloseCard={dismissActiveCard}
              />
            </View>
          </View>
        ) : null}
      </View>


      <QrScannerOverlay
        visible={isScannerVisible}
        isResolving={isResolvingScan}
        onClose={() => setIsScannerVisible(false)}
        onDetected={(value) => void handleDetected(value)}
      />

      <Modal
        visible={isLanguagePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguagePickerOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center px-6"
          style={{ backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(0, 0, 0, 0.45)" }}
          onPress={() => setIsLanguagePickerOpen(false)}
        >
          <Pressable
            className="w-full self-center rounded-3xl border px-6 py-6"
            style={{
              maxWidth: 440,
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="text-lg font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              Wybierz język treści
            </Text>
            <View className="mt-4 gap-3">
              {availableLanguageOptions.map((option) => {
                const isActive = option.value === selectedLanguage;
                return (
                  <Pressable
                    key={`risk-quiz-language-popup-${option.value}`}
                    className="flex-row items-center justify-between rounded-2xl border px-4 py-4 active:opacity-90"
                    style={{
                      borderColor: isActive ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                      backgroundColor: isActive ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                    }}
                    onPress={() => {
                      if (option.value !== selectedLanguage) {
                        onSelectedLanguageChange?.(option.value);
                      }
                      setIsLanguagePickerOpen(false);
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      <Text className="text-2xl">{getRealizationLanguageFlag(option.value)}</Text>
                      <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                        {option.label}
                      </Text>
                    </View>
                    {isActive ? (
                      <Text className="text-base font-bold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                        ✓
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              className="mt-4 rounded-2xl border px-4 py-3 active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={() => setIsLanguagePickerOpen(false)}
            >
              <Text className="text-center text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                Zamknij
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isTestMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTestMenuOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center px-6"
          style={{ backgroundColor: isLightTheme ? "rgba(17, 30, 23, 0.34)" : "rgba(0, 0, 0, 0.45)" }}
          onPress={() => setIsTestMenuOpen(false)}
        >
          <Pressable
            className="w-full self-center rounded-3xl border px-6 py-6"
            style={{
              maxWidth: 440,
              maxHeight: "80%",
              borderColor: EXPEDITION_THEME.border,
              backgroundColor: EXPEDITION_THEME.panel,
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <Text className="text-lg font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              Menu testowe
            </Text>
            <Text className="mt-1" style={{ color: EXPEDITION_THEME.textMuted, fontSize: 13 }}>
              Losuje kartę z wybranej puli tak samo jak prawdziwy skan — zużywa realną kartę z talii.
            </Text>

            {isLoadingTestMenu ? (
              <View className="mt-5 items-center">
                <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
              </View>
            ) : testMenuError ? (
              <Text className="mt-4" style={{ color: "#ef4444", fontSize: 14 }}>
                {testMenuError}
              </Text>
            ) : testMenuEntries.length === 0 ? (
              <Text className="mt-4" style={{ color: EXPEDITION_THEME.textMuted, fontSize: 14 }}>
                Brak dostępnych puli kart dla tej realizacji.
              </Text>
            ) : (
              <ScrollView className="mt-4" style={{ maxHeight: 420 }}>
                <View style={{ rowGap: 10 }}>
                  {testMenuEntries.map((entry) => (
                    <Pressable
                      key={`${entry.categoryId}-${entry.difficulty}`}
                      className="flex-row items-center justify-between rounded-2xl border px-4 py-4 active:opacity-90"
                      style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
                      onPress={() => handleEnterTestMenuEntry(entry)}
                    >
                      <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                        {entry.categoryName} • {difficultyLabel(entry.difficulty)}
                      </Text>
                      <View
                        className="rounded-full px-3 py-1.5"
                        style={{ backgroundColor: EXPEDITION_THEME.accent }}
                      >
                        <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.background }}>
                          Wejdź
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}

            <Pressable
              className="mt-4 rounded-2xl border px-4 py-3 active:opacity-90"
              style={{ borderColor: "rgba(248, 113, 113, 0.55)", backgroundColor: "rgba(127, 29, 29, 0.3)" }}
              onPress={onExitRealization}
            >
              <Text className="text-center text-base font-semibold" style={{ color: "#fca5a5" }}>
                Wyjdź z realizacji
              </Text>
            </Pressable>

            <Pressable
              className="mt-2 rounded-2xl border px-4 py-3 active:opacity-90"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={() => setIsTestMenuOpen(false)}
            >
              <Text className="text-center text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                Zamknij
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function formatTimeLimitLabel(timeLimitSeconds: number) {
  if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds <= 0) {
    return "";
  }
  const minutes = Math.floor(timeLimitSeconds / 60);
  const seconds = timeLimitSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function difficultyLabel(difficulty: "EASY" | "MEDIUM" | "HARD") {
  if (difficulty === "EASY") return "Łatwe";
  if (difficulty === "MEDIUM") return "Średnie";
  return "Trudne";
}
