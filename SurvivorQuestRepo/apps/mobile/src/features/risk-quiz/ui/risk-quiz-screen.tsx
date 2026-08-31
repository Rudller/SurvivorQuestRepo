import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Keyboard, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Rect, SvgUri } from "react-native-svg";
import { useAudioQuizPlayback } from "../../expedition-stage/components/station-overlays/station-panels/use-audio-quiz-playback";
import type { OnboardingSession, RealizationLanguage, RealizationLanguageOption } from "../../onboarding/model/types";
import { getRealizationLanguageFlag, getRealizationLanguageLabel } from "../../onboarding/model/types";
import { EXPEDITION_THEME, getTeamColors, type ExpeditionThemeMode } from "../../onboarding/model/constants";
import { resolveUiLanguage } from "../../i18n";
import { isInvalidCompletionCodeErrorMessage } from "../../expedition-stage/components/station-overlays/puzzle-helpers";
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
  postRiskQuizPhotoTask,
} from "../../expedition-stage/api/mobile-session.api";
import {
  fetchRiskQuizChat,
  fetchRiskQuizDeckStatus,
  fetchRiskQuizPigs,
  fetchRiskQuizPendingDraw,
  fetchRiskQuizTestMenu,
  postRiskQuizAnswer,
  postRiskQuizChatMessage,
  postRiskQuizPigThrow,
  postRiskQuizReviewedAnswer,
  postRiskQuizScan,
  type RiskChatMessage,
  type RiskPigState,
  type RiskAnswerResult,
  type RiskDeckStatus,
  type RiskScanResult,
  type RiskTestMenuEntry,
} from "../api/risk-quiz.api";
import { ChamferedPanel } from "../../../shared/ui/chamfered-panel";
import { AutoScrollingIntroBox } from "../../../shared/ui/intro-text-preview";
import { HiddenResetOnHold } from "../../../shared/ui/hidden-reset-on-hold";
import { RiskQuizBottomPanel } from "../components/risk-quiz-bottom-panel";
import { RiskQuizRemainingCards } from "../components/risk-quiz-remaining-cards";
import { RiskQuizHowToPlay } from "../components/risk-quiz-how-to-play";
import { RiskQuizChatDock } from "../components/risk-quiz-chat-dock";
import {
  RiskQuizPigBanner,
  RiskQuizPigButton,
  RiskQuizPigEffectLayer,
} from "../components/risk-quiz-pig-effects";
import { RiskQuizPigTargetPicker } from "../components/risk-quiz-pig-target-picker";
import { RiskQuizBackground } from "../components/risk-quiz-background";
import { shouldShowRiskQuizIntro } from "../model/intro-visibility";
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

// Both directions of the deck-view <-> card swap run the same two halves: the
// outgoing side fades and slides away, then the incoming side fades and slides
// in. Keeping one constant for both is what makes them feel symmetrical — the
// card used to fade in over 380ms while the deck view vanished instantly, and
// closing did the reverse, so the way back always read as the slower half.
const SCREEN_TRANSITION_HALF_MS = 190;
const SCREEN_TRANSITION_SLIDE_PX = 28;

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];
// Types the backend scores against quizData.correctAnswerIndex — the card sends
// the picked index rather than a self-reported pass/fail. Mirrors
// ANSWER_INDEX_STATION_TYPES in risk-quiz.service.ts.
const ANSWER_INDEX_TYPES = new Set(["quiz", "audio-quiz"]);
// Card types solved by typing the organizer's completion code.
const COMPLETION_CODE_TYPES = new Set(["time", "points"]);

function isCompletionCodeCardType(stationType: string) {
  return COMPLETION_CODE_TYPES.has(stationType);
}
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
  "reviewed-answer": "Odpowiedź opisowa",
  "true-false": "Prawda czy fałsz",
  "fill-blank": "Uzupełnij lukę",
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
// The chat has its own interval on purpose: the idle poll above is gated off
// during the intro and while the scanner is open, and a room that goes quiet
// exactly when somebody is scanning is worse than a slightly slower one.
const CHAT_POLL_INTERVAL_MS = 5000;
// Pigs ride their own interval for the same reason the chat does: an effect has
// to land whether or not the team is mid-card, and the idle poll is gated off
// during the intro and while the scanner is open.
const PIG_POLL_INTERVAL_MS = 5000;
// Matches TEST_MENU_TRIGGER_HOLD_MS in use-expedition-stage-overlay-flow.ts —
// same hold-the-team-banner gesture as normal gameplay's station test menu.
const TEST_MENU_TRIGGER_HOLD_MS = 5000;
// Must match the screen container's own `px-3 py-3` / rowGap below — the
// always-visible timer is positioned absolutely against that box, so it has
// to re-derive where the in-flow content actually starts.
const SCREEN_EDGE_PADDING = 12;
const SCREEN_ROW_GAP = 10;
// Clearance between the floating pig button and the bottom bar it rides above.
const PIG_BUTTON_GAP = 10;
// The card countdown's box is a fixed size rather than a measured one. It used
// to be measured with onLayout and fed back into the content area's marginTop,
// which meant a freshly opened card laid itself out two or three more times
// after it was already on screen (mount -> timer mounts -> timer measured ->
// margin applied -> content area re-measured), and the card visibly jumped
// mid-reveal. `lineHeight` pins the digits to exactly this height, so the
// reserved space and the real space always agree on the first frame.
const TASK_TIMER_FONT_SIZE = 72;
const TASK_TIMER_BLOCK_HEIGHT = 86;

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

  // Seeded from the session MobileApp handed over rather than a blanket true.
  // This screen only mounts once MobileApp has stopped waiting, so a session
  // that already knows the game is open must not flash its intro card while
  // this screen's own first poll is in flight. Straight after the pre-game
  // countdown that flash read as the briefing coming back, under a
  // "Czekamy na rozpoczęcie gry..." line, one second after START.
  const [showIntro, setShowIntro] = useState(() =>
    shouldShowRiskQuizIntro(session.realization?.status),
  );
  const [teamPoints, setTeamPoints] = useState(0);
  // Verdict on a photo card the team sent earlier, waiting to be shown. It is
  // only ever raised between cards (see refreshDeckStatus): a decision landing
  // mid-task must not cover the task the team is playing right now.
  const [photoVerdictNotice, setPhotoVerdictNotice] = useState<{
    stationName: string;
    isCorrect: boolean;
    pointsDelta: number;
  } | null>(null);
  // Station ids whose verdict has already been shown (or was already decided
  // when this screen opened, so an old decision never pops up on a fresh app).
  const announcedPhotoVerdictsRef = useRef<Set<string> | null>(null);
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [deckStatus, setDeckStatus] = useState<RiskDeckStatus | null>(null);
  const [liveRealization, setLiveRealization] = useState<LiveRealizationInfo | null>(null);
  const [liveTeam, setLiveTeam] = useState<LiveTeamInfo | null>(null);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [pigState, setPigState] = useState<RiskPigState | null>(null);
  const [isPigPickerOpen, setIsPigPickerOpen] = useState(false);
  const [isThrowingPig, setIsThrowingPig] = useState(false);
  const [pigError, setPigError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<RiskChatMessage[]>([]);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [chatCanPost, setChatCanPost] = useState(false);
  const [chatTeamId, setChatTeamId] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  // Id of the newest message the team has actually seen. Everything after it in
  // chatMessages is what the unread badge counts.
  const [lastReadChatId, setLastReadChatId] = useState<string | null>(null);
  // The poll reads the newest id without re-subscribing every time a message
  // lands, which an effect dependency on chatMessages would force.
  const chatMessagesRef = useRef<RiskChatMessage[]>([]);
  chatMessagesRef.current = chatMessages;
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [exhaustedNotice, setExhaustedNotice] = useState<{ categoryName: string } | null>(null);
  const [activeDraw, setActiveDraw] = useState<ActiveDraw | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Measured rather than assumed: the bar's height comes out of the adaptive
  // scale ladder, and the pig button is anchored above whatever it turns out
  // to be.
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const [topPanelHeight, setTopPanelHeight] = useState(0);
  // Height of the scrollable content area, measured so an inline station card
  // can be capped to it (see the card wrapper below).
  const [contentViewportHeight, setContentViewportHeight] = useState(0);
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
  // The deck view's own half of that transition: 1 while the scan screen is
  // the visible screen, 0 while a card has taken it over.
  const deckIdleRevealAnimation = useRef(new Animated.Value(1)).current;
  const timerShakeAnimation = useRef(new Animated.Value(0)).current;
  const autoDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Card whose outcome already went to the backend. A ref, not state: station
  // panels report a solved task through two callbacks in a row (onCompleteTask,
  // then onQuizPassed) and both are bound to submitOutcome here, so the second
  // call arrives after the first has finished and still sees the pre-submit
  // render's `isSubmittingAnswer`. One attempt per card is also what the
  // backend enforces — the second POST came back "Station already attempted".
  const submittedCardIdRef = useRef<string | null>(null);
  const contentScrollViewRef = useRef<ScrollView>(null);

  // Mirrors the normal realization's "waiting for admin start" poll: while the
  // intro screen is showing, keep checking realization status and reveal the
  // scan UI as soon as the game is actually in progress, instead of a manual
  // dismiss button. Also hydrates the top bar's live realization/team info
  // (logo, badge, points) for the main screen that follows.
  useEffect(() => {
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

        // Also the only place the top bar's live info is filled in, so it runs
        // whether or not the intro card is up — a started session still needs
        // one pass through here before the scan screen has a logo to show.
        setShowIntro(shouldShowRiskQuizIntro(state.realization.status));
        if (state.realization.status === "in-progress") {
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

  // useCallback so the idle poll below can depend on it without restarting the
  // interval on every render.
  const refreshDeckStatus = useCallback(async () => {
    try {
      const status = await fetchRiskQuizDeckStatus(apiBaseUrl, { sessionToken });
      setDeckStatus(status);
      // Picks up a score the team did not earn on this device — a photo card
      // the Game Master has just approved or rejected.
      if (typeof status.teamPoints === "number") {
        setTeamPoints(status.teamPoints);
      }

      const decided = (status.photoReviews ?? []).filter(
        (review) => review.isCorrect !== null,
      );
      if (announcedPhotoVerdictsRef.current === null) {
        // First read of the session: everything already decided is history.
        announcedPhotoVerdictsRef.current = new Set(
          decided.map((review) => review.stationId),
        );
        return;
      }

      const fresh = decided.find(
        (review) => !announcedPhotoVerdictsRef.current?.has(review.stationId),
      );
      if (fresh) {
        announcedPhotoVerdictsRef.current.add(fresh.stationId);
        setPhotoVerdictNotice({
          stationName: fresh.stationName,
          isCorrect: fresh.isCorrect === true,
          pointsDelta: fresh.pointsDelta,
        });
      }
    } catch (error) {
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
      }
    }
  }, [apiBaseUrl, sessionToken, onSessionInvalid]);

  useEffect(() => {
    if (showIntro) {
      return;
    }
    void refreshDeckStatus();
    // Only when the intro screen hands off to the scan screen — later
    // updates come from refreshDeckStatus() calls after each answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro]);

  // Entry half of the deck-view -> card transition: fade the scan screen out
  // first, then mount the card, which plays its own fade-in from the effect
  // below. Both card sources (a scanned QR, an admin-pushed draw) go through
  // here so the swap looks the same however the card arrived.
  const openDrawnCard = useCallback(
    (draw: ActiveDraw) => {
      Animated.timing(deckIdleRevealAnimation, {
        toValue: 0,
        duration: SCREEN_TRANSITION_HALF_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }
        // Seeded here, in the same commit as the card, rather than left to
        // the countdown effect below: that effect only runs after the card has
        // already been painted, so the content area's timer margin appeared a
        // frame late and shoved the freshly revealed card downward.
        const timeLimitSeconds = draw.station.timeLimitSeconds ?? 0;
        setRemainingTaskSeconds(timeLimitSeconds > 0 ? timeLimitSeconds : null);
        // Hidden before the card is mounted, not in the reveal effect below:
        // effects run after the first paint, so a card drawn while the reveal
        // value still sat at 1 (drawing a card straight from the test menu
        // while another one is open) flashed at full opacity for a frame
        // before snapping back to 0 to start its fade.
        questionRevealAnimation.setValue(0);
        // Cleared per draw rather than relying on the card id alone: after an
        // admin reset the same card can legitimately be scanned again.
        submittedCardIdRef.current = null;
        setActiveDraw(draw);
        setExhaustedNotice(null);
        setAnswerResult(null);
      });
    },
    [deckIdleRevealAnimation, questionRevealAnimation],
  );

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
        if (cancelled || activeDraw) {
          return;
        }
        if (!result.draw) {
          // Idle tick: no card waiting, so use the round trip to refresh the
          // deck and the score instead of letting the screen go stale.
          void refreshDeckStatus();
          return;
        }
        openDrawnCard({
          exhausted: false,
          cardId: result.draw.cardId,
          categoryName: result.draw.categoryName,
          difficulty: result.draw.difficulty,
          station: result.draw.station,
        });
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
  }, [
    showIntro,
    activeDraw,
    isTestMenuOpen,
    isScannerVisible,
    apiBaseUrl,
    sessionToken,
    onSessionInvalid,
    openDrawnCard,
    refreshDeckStatus,
  ]);

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
      duration: SCREEN_TRANSITION_HALF_MS,
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
      duration: SCREEN_TRANSITION_HALF_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }
      setActiveDraw(null);
      setAnswerResult(null);
      setExhaustedNotice(null);
      deckIdleRevealAnimation.setValue(0);
      Animated.timing(deckIdleRevealAnimation, {
        toValue: 1,
        duration: SCREEN_TRANSITION_HALF_MS,
        useNativeDriver: true,
      }).start();
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
        openDrawnCard(result);
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

  async function submitOutcome(input: {
    selectedIndex?: number;
    completed?: boolean;
    completionCode?: string;
  }): Promise<string | null> {
    if (!activeDraw || isSubmittingAnswer || submittedCardIdRef.current === activeDraw.cardId) {
      return null;
    }
    const cardId = activeDraw.cardId;
    submittedCardIdRef.current = cardId;
    setIsSubmittingAnswer(true);
    setErrorMessage(null);
    try {
      const result = await postRiskQuizAnswer(apiBaseUrl, {
        sessionToken,
        cardId,
        stationId: activeDraw.station.id,
        ...input,
      });
      setAnswerResult(result);
      setTeamPoints(result.teamPoints);
      setStreak(result.streak);
      setMultiplier(result.multiplier);
      void refreshDeckStatus();
      return null;
    } catch (error) {
      // Freed again so a failed send (a dropped connection mid-answer) can be
      // retried; the backend still rejects a genuine second attempt.
      submittedCardIdRef.current = null;
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
        return null;
      }
      const message = error instanceof Error ? error.message : "Nie udało się wysłać wyniku.";
      // A mistyped completion code is the code panel's business — it shakes the
      // input and lets the player retype. Putting it in the screen-level error
      // line as well would leave a raw "Invalid completion code" sitting under
      // the card after a simple typo.
      if (!isInvalidCompletionCodeErrorMessage(message)) {
        setErrorMessage(message);
      }
      return message;
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  // Adapts the real station panels' pass/fail callbacks (StationPreviewOverlay)
  // to Ryzykanci's own scoring endpoint — every non-quiz/audio-quiz type is
  // scored server-side as a plain "completed = correct" self-report (see
  // resolveOutcome() in risk-quiz.service.ts), same as the "Ukończone" /
  // "Poddaję się" buttons this replaces for those types.
  // Photo cards do not score themselves: the picture goes to the Game Master
  // and the card stays open showing "waiting for approval". The attempt is
  // created server-side without a verdict, which is what keeps the station from
  // being drawn again in the meantime.
  async function submitPhotoTask(stationId: string, fileUri: string): Promise<string | null> {
    if (!activeDraw || submittedCardIdRef.current === activeDraw.cardId) {
      return null;
    }
    const cardId = activeDraw.cardId;
    submittedCardIdRef.current = cardId;
    setErrorMessage(null);
    try {
      await postRiskQuizPhotoTask(apiBaseUrl, {
        sessionToken,
        cardId,
        stationId,
        fileUri,
      });
      void refreshDeckStatus();
      return null;
    } catch (error) {
      submittedCardIdRef.current = null;
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
        return null;
      }
      const message = error instanceof Error ? error.message : "Nie udało się wysłać zdjęcia.";
      setErrorMessage(message);
      return message;
    }
  }

  // The room polls on its own interval, unaffected by whether a card is open or
  // the scanner is up. Only new messages come back — `afterId` is the newest id
  // already held — so a long game does not re-download its own history.
  useEffect(() => {
    if (showIntro) {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const pollChat = async () => {
      if (inFlight) {
        return;
      }
      inFlight = true;
      try {
        const newestId = chatMessagesRef.current.at(-1)?.id;
        const result = await fetchRiskQuizChat(apiBaseUrl, {
          sessionToken,
          afterId: newestId,
        });
        if (cancelled) {
          return;
        }
        setChatEnabled(result.enabled);
        setChatCanPost(result.canPost);
        setChatTeamId(result.currentTeamId);
        if (result.messages.length > 0) {
          setChatMessages((previous) =>
            newestId ? [...previous, ...result.messages] : result.messages,
          );
        }
      } catch (error) {
        if (getMobileApiErrorStatusCode(error) === 401) {
          onSessionInvalid();
        }
        // Anything else is silent — the next tick retries.
      } finally {
        inFlight = false;
      }
    };

    void pollChat();
    const interval = setInterval(() => void pollChat(), CHAT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiBaseUrl, sessionToken, showIntro, onSessionInvalid]);

  // Pigs poll on their own interval, ungated — an effect must land whether the
  // team is mid-card, scanning, or idle.
  useEffect(() => {
    if (showIntro) {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const pollPigs = async () => {
      if (inFlight) {
        return;
      }
      inFlight = true;
      try {
        const next = await fetchRiskQuizPigs(apiBaseUrl, { sessionToken });
        if (!cancelled) {
          setPigState(next);
        }
      } catch (error) {
        if (getMobileApiErrorStatusCode(error) === 401) {
          onSessionInvalid();
        }
        // Anything else is silent — the next tick retries.
      } finally {
        inFlight = false;
      }
    };

    void pollPigs();
    const interval = setInterval(() => void pollPigs(), PIG_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [apiBaseUrl, sessionToken, showIntro, onSessionInvalid]);

  // Drives the banner's countdown between five-second polls. It only nudges a
  // clock value — the remaining seconds are derived from the effect's absolute
  // expiry below, so this effect never depends on anything it changes.
  const hasIncomingPig = Boolean(pigState?.incoming);
  const [pigClockMs, setPigClockMs] = useState(() => Date.now());
  useEffect(() => {
    if (!hasIncomingPig) {
      return;
    }

    const interval = setInterval(() => setPigClockMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasIncomingPig]);

  // Expanding the dock marks everything currently in it as read. The collapsed
  // strip only previews the newest line, so it does not count as having read
  // the backlog behind it.
  useEffect(() => {
    if (!isChatExpanded) {
      return;
    }
    setLastReadChatId(chatMessages.at(-1)?.id ?? null);
  }, [isChatExpanded, chatMessages]);

  // Drawing a card collapses the room: the dock is hidden for the duration of
  // the task, and leaving it expanded would spring it back open on close.
  useEffect(() => {
    if (activeDraw) {
      setIsChatExpanded(false);
    }
  }, [activeDraw]);

  // Everything after the last message the team saw. Recomputed from the list
  // rather than tracked as a counter, so it cannot drift out of step with it.
  const unreadChatCount = (() => {
    if (!lastReadChatId) {
      return chatMessages.length;
    }
    const lastReadIndex = chatMessages.findIndex((item) => item.id === lastReadChatId);
    return lastReadIndex < 0 ? chatMessages.length : chatMessages.length - lastReadIndex - 1;
  })();

  async function throwPig(targetTeamId?: string) {
    if (isThrowingPig) {
      return;
    }

    setPigError(null);
    setIsThrowingPig(true);
    try {
      const next = await postRiskQuizPigThrow(apiBaseUrl, {
        sessionToken,
        targetTeamId,
      });
      setPigState(next);
      setIsPigPickerOpen(false);
    } catch (error) {
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
        return;
      }
      setPigError(
        error instanceof Error ? error.message : "Nie udało się rzucić świni.",
      );
    } finally {
      setIsThrowingPig(false);
    }
  }

  async function sendChatMessage() {
    const content = chatDraft.trim();
    if (!content || isSendingChat || !chatCanPost) {
      return;
    }

    setChatError(null);
    setIsSendingChat(true);
    try {
      const message = await postRiskQuizChatMessage(apiBaseUrl, {
        sessionToken,
        content,
      });
      setChatDraft("");
      // Show it straight away rather than waiting up to 5s for the next poll.
      // The poll asks for messages after the newest id, so it will not arrive
      // a second time — which is exactly why the response has to be stored as
      // sent, colour included. Blanking those fields here left every message a
      // team wrote about itself permanently uncoloured.
      setChatMessages((previous) =>
        previous.some((item) => item.id === message.id)
          ? previous
          : [...previous, message],
      );
    } catch (error) {
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
        return;
      }
      setChatError(
        error instanceof Error ? error.message : "Nie udało się wysłać wiadomości.",
      );
    } finally {
      setIsSendingChat(false);
    }
  }

  // Text twin of submitPhotoTask above: the answer goes to the Game Master and
  // the card stays open showing "waiting for approval", with the attempt created
  // server-side without a verdict so the station can't be drawn again.
  async function submitReviewedAnswer(stationId: string, answerText: string): Promise<string | null> {
    if (!activeDraw || submittedCardIdRef.current === activeDraw.cardId) {
      return null;
    }
    const cardId = activeDraw.cardId;
    submittedCardIdRef.current = cardId;
    setErrorMessage(null);
    try {
      await postRiskQuizReviewedAnswer(apiBaseUrl, {
        sessionToken,
        cardId,
        stationId,
        answerText,
      });
      void refreshDeckStatus();
      return null;
    } catch (error) {
      submittedCardIdRef.current = null;
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
        return null;
      }
      const message = error instanceof Error ? error.message : "Nie udało się wysłać odpowiedzi.";
      setErrorMessage(message);
      return message;
    }
  }

  // The station panels treat a non-null return as "the send failed" and skip
  // their success state, so hand them the real error instead of always null.
  async function completeCurrentCard(completed: boolean, completionCode?: string): Promise<string | null> {
    return submitOutcome({ completed, completionCode });
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
      quizCaesarShift: quiz?.caesarShift,
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
            {/* The only way off this screen: it polls until the admin starts
                the game, and a poll that can't reach the server at all is
                swallowed and retried forever (a 401 self-resets, an
                unreachable host doesn't). Without this hold the tablet is
                stuck here — the test-menu gesture on the top panel only
                exists on the main screen below. "exit" rather than "rejoin":
                the usual cause is a moved server, and rejoining would just
                retry the same dead address. */}
            <HiddenResetOnHold
              language={resolveUiLanguage(selectedLanguage)}
              variant="exit"
              onReset={onExitRealization}
            >
              <View className="mt-5 flex-row items-center gap-2">
                <ActivityIndicator color={EXPEDITION_THEME.accentStrong} />
                <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: 14 }}>Czekamy na rozpoczęcie gry...</Text>
              </View>
            </HiddenResetOnHold>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const incomingPig = pigState?.enabled ? pigState.incoming : null;
  const incomingPigSecondsLeft = incomingPig
    ? Math.max(0, Math.ceil((Date.parse(incomingPig.expiresAt) - pigClockMs) / 1000))
    : 0;
  // Stops applying the effect the moment it runs out, without waiting for the
  // next poll to confirm it.
  const activePig = incomingPigSecondsLeft > 0 ? incomingPig : null;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: EXPEDITION_THEME.background }}>
      <RiskQuizBackground isLightTheme={isLightTheme} />
      {/* Wraps the whole screen rather than just the card: a pig lands on a
          timer and can arrive while the team is idle between cards, so the
          effect has to have something to act on either way. */}
      <RiskQuizPigEffectLayer type={activePig?.type ?? null}>
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
            pigCount={pigState?.enabled ? (pigState.held ? 1 : 0) : null}
            languageFlag={currentLanguageFlag}
            showLanguageButton={hasMultipleLanguageOptions}
            onOpenLanguagePicker={handleLanguageButtonPress}
            themeMode={themeMode}
            onToggleTheme={onToggleTheme}
            cornerStyle="chamfered"
          />
        </Pressable>

        {remainingTaskSeconds !== null ? (
          <Animated.View
            className="items-center"
            pointerEvents="none"
            style={{
              height: TASK_TIMER_BLOCK_HEIGHT,
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
                    outputRange: [SCREEN_TRANSITION_SLIDE_PX, 0],
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
                fontSize: TASK_TIMER_FONT_SIZE,
                lineHeight: TASK_TIMER_BLOCK_HEIGHT,
                includeFontPadding: false,
                fontWeight: "900",
              }}
            >
              {`${Math.floor(remainingTaskSeconds / 60)}:${String(remainingTaskSeconds % 60).padStart(2, "0")}`}
            </Text>
          </Animated.View>
        ) : null}

        <ScrollView
          ref={contentScrollViewRef}
          onLayout={(event) => setContentViewportHeight(event.nativeEvent.layout.height)}
          style={{
            width: "100%",
            flex: 1,
            // The timer floats over this area, so keep the content clear of it
            // in the roomy (no keyboard) state. While typing, space is scarce
            // and the content is bottom-aligned anyway, so it can slide under
            // the timer instead of being pushed off-screen.
            marginTop: remainingTaskSeconds !== null && keyboardHeight === 0 ? TASK_TIMER_BLOCK_HEIGHT : 0,
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
                      outputRange: [SCREEN_TRANSITION_SLIDE_PX, 0],
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
              style={{
                // Real style props, not `className`: nativewind's className
                // never reaches Animated.View here, so a w-full/flex-1 class
                // silently did nothing. Without them this wrapper sizes to its
                // content under the scroll container's `alignItems: center` —
                // the code keyboard's natural width spilled off both edges and
                // its natural height ran under the bottom panel.
                width: "100%",
                flex: 1,
                // Inside a ScrollView content grows freely, so flex alone never
                // presses on the card — a tall card (photo + code keyboard)
                // just overflowed under the bottom panel. Capping it at the
                // measured viewport gives the card's own shrinkable parts real
                // pressure, so they fit and the keyboard's last row ends level
                // with the bottom panel instead of being cut off by it.
                maxHeight: contentViewportHeight || undefined,
                opacity: questionRevealAnimation,
                transform: [
                  {
                    translateY: questionRevealAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SCREEN_TRANSITION_SLIDE_PX, 0],
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
                // The second argument is the typed completion code for
                // "na czas"/"na punkty" stations and a plain type marker
                // ("QUIZ", "WORDLE", ...) for every other panel — only the
                // former may travel to the backend as a code to verify.
                onCompleteTask={async (_stationId, completionCode) =>
                  completeCurrentCard(
                    true,
                    isCompletionCodeCardType(activeDraw.station.type) ? completionCode : undefined,
                  )
                }
                onSubmitPhotoTask={(stationId, fileUri) => submitPhotoTask(stationId, fileUri)}
                onSubmitReviewedAnswer={(stationId, answerText) =>
                  submitReviewedAnswer(stationId, answerText)
                }
                onQuizFailed={() => void completeCurrentCard(false)}
                onQuizPassed={() => void completeCurrentCard(true)}
                onTimeExpired={() => void completeCurrentCard(false)}
                timedStationPointsDecayEnabled={false}
              />
            </Animated.View>
          ) : exhaustedNotice ? (
            <View style={{ width: "100%", alignItems: "center" }}>
              <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: 15, textAlign: "center" }}>
                Brak nowych zadań w puli „{exhaustedNotice.categoryName}” na tym poziomie trudności. Zeskanuj inną
                kartę.
              </Text>
            </View>
          ) : null}

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
                      outputRange: [SCREEN_TRANSITION_SLIDE_PX, 0],
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

        {/* The keyboard gate used to wrap this whole column, which meant raising
            the keyboard unmounted the chat dock mid-message. It now sits on the
            two children that genuinely have to yield room, so the dock survives
            typing and simply expands into the space they free up. */}
        <View className="w-full items-center" style={{ rowGap: 14 }}>
          {keyboardHeight === 0 && !activeDraw ? (
              // Mirror image of the card's own reveal: same fade, same slide,
              // same half-duration, just running on the deck view instead.
              // Real style props, not `className` — nativewind classes never
              // reach an Animated.View here.
              <Animated.View
                style={{
                  width: "100%",
                  alignItems: "center",
                  rowGap: 14,
                  opacity: deckIdleRevealAnimation,
                  transform: [
                    {
                      translateY: deckIdleRevealAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [SCREEN_TRANSITION_SLIDE_PX, 0],
                      }),
                    },
                  ],
                }}
              >
                <RiskQuizRemainingCards remainingCards={deckStatus?.remainingCards ?? null} />
                <RiskQuizHowToPlay />
              </Animated.View>
            ) : null}
          {/* Hidden while a card is open: the task gets the screen to itself.
              The poll keeps running underneath, so whatever arrived meanwhile
              is waiting on the strip — with an unread count — once the card is
              closed. */}
          {chatEnabled && !activeDraw ? (
            <RiskQuizChatDock
              messages={chatMessages}
              draft={chatDraft}
              canPost={chatCanPost}
              isSending={isSendingChat}
              errorMessage={chatError}
              currentTeamId={chatTeamId}
              isExpanded={isChatExpanded}
              unreadCount={unreadChatCount}
              keyboardHeight={keyboardHeight}
              onToggleExpanded={() => setIsChatExpanded((previous) => !previous)}
              onChangeDraft={(value) => {
                setChatDraft(value);
                setChatError(null);
              }}
              onSend={() => void sendChatMessage()}
            />
          ) : null}

          {keyboardHeight === 0 ? (
            <View className="w-full items-center" style={{ position: "relative" }}>
              <View
                className="w-full max-w-[560px]"
                onLayout={(event) => setBottomPanelHeight(event.nativeEvent.layout.height)}
              >
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

              {/* Floated over the column rather than sitting in it: as a real
                  row it pushed the rules and the chat up the screen every time
                  a pig arrived, and they would drop back down the moment it was
                  thrown. Anchored to the bar's measured height so it rides just
                  above it, hard against the right edge of the screen. */}
              {pigState?.enabled && pigState.held && !activeDraw ? (
                <View
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: bottomPanelHeight + PIG_BUTTON_GAP,
                  }}
                >
                  <RiskQuizPigButton
                    type={pigState.held.type}
                    onPress={() => {
                      setPigError(null);
                      setIsPigPickerOpen(true);
                    }}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
      </RiskQuizPigEffectLayer>

      {/* Above the effect layer on purpose — a darkened or upside-down screen
          reads as a broken tablet unless something says what is going on. */}
      {activePig ? (
        <RiskQuizPigBanner
          type={activePig.type}
          fromName={activePig.fromName}
          secondsLeft={incomingPigSecondsLeft}
        />
      ) : null}

      {pigState?.enabled && pigState.held ? (
        <RiskQuizPigTargetPicker
          visible={isPigPickerOpen}
          type={pigState.held.type}
          targets={pigState.targets}
          isThrowing={isThrowingPig}
          errorMessage={pigError}
          onThrow={(targetTeamId) => void throwPig(targetTeamId)}
          onClose={() => setIsPigPickerOpen(false)}
        />
      ) : null}

      <QrScannerOverlay
        visible={isScannerVisible}
        isResolving={isResolvingScan}
        onClose={() => setIsScannerVisible(false)}
        onDetected={(value) => void handleDetected(value)}
        scanTarget="card"
        cornerStyle="chamfered"
      />

      <Modal
        visible={isLanguagePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguagePickerOpen(false)}
      >
        <Pressable
          className="flex-1 justify-center px-6"
          style={{ backgroundColor: isLightTheme ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)` : "rgba(0, 0, 0, 0.45)" }}
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

      {/*
        Verdict on a photo card the Game Master has just decided. Gated on
        `!activeDraw` as well as on its own state: the deck poll that raises it
        is idle-only, but a card can still be drawn in the same breath, and a
        countdown running under a modal is the one thing this must never do.
      */}
      <Modal
        visible={photoVerdictNotice !== null && !activeDraw}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoVerdictNotice(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: isLightTheme ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)` : "rgba(0, 0, 0, 0.45)" }}
          onPress={() => setPhotoVerdictNotice(null)}
        >
          <View className="w-full max-w-[520px]">
            <ChamferedPanel
              cut={26}
              backgroundColor={EXPEDITION_THEME.panel}
              borderColor={photoVerdictNotice?.isCorrect ? "#22c55e" : EXPEDITION_THEME.danger}
              borderWidth={3}
              glowColor={photoVerdictNotice?.isCorrect ? "#22c55e" : EXPEDITION_THEME.danger}
              glowRadius={16}
              glowOpacity={0.5}
              texture="cross-hatch"
              textureColor={EXPEDITION_THEME.accent}
              textureOpacity={0.08}
              textureScale={1.3}
              style={{ paddingHorizontal: 24, paddingVertical: 26, alignItems: "center", rowGap: 10 }}
            >
              <Text
                className="text-center font-black"
                style={{
                  color: photoVerdictNotice?.isCorrect ? "#22c55e" : EXPEDITION_THEME.danger,
                  fontSize: 30,
                }}
              >
                {photoVerdictNotice?.isCorrect ? "Zdjęcie zatwierdzone!" : "Zdjęcie odrzucone"}
              </Text>
              <Text
                className="text-center"
                style={{ color: EXPEDITION_THEME.textMuted, fontSize: 15 }}
              >
                {photoVerdictNotice?.stationName}
              </Text>
              <Text
                className="text-center font-extrabold"
                style={{ color: EXPEDITION_THEME.accentStrong, fontSize: 24 }}
              >
                {`${(photoVerdictNotice?.pointsDelta ?? 0) >= 0 ? "+" : ""}${photoVerdictNotice?.pointsDelta ?? 0} pkt`}
              </Text>
              <Text
                className="mt-1 text-center"
                style={{ color: EXPEDITION_THEME.textSubtle, fontSize: 13 }}
              >
                Dotknij, aby zamknąć
              </Text>
            </ChamferedPanel>
          </View>
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
          style={{ backgroundColor: isLightTheme ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)` : "rgba(0, 0, 0, 0.45)" }}
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
