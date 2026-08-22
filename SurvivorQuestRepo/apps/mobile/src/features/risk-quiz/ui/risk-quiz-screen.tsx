import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { OnboardingSession, RealizationLanguage, RealizationLanguageOption } from "../../onboarding/model/types";
import { getRealizationLanguageFlag, getRealizationLanguageLabel } from "../../onboarding/model/types";
import { EXPEDITION_THEME, getTeamColors, type ExpeditionThemeMode } from "../../onboarding/model/constants";
import { resolveUiLanguage } from "../../i18n";
import { QrScannerOverlay } from "../../expedition-stage/components/qr-scanner-overlay";
import { TopRealizationPanel } from "../../expedition-stage/components/top-realization-panel";
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
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [answerResult, setAnswerResult] = useState<RiskAnswerResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestMenuOpen, setIsTestMenuOpen] = useState(false);
  const [isLoadingTestMenu, setIsLoadingTestMenu] = useState(false);
  const [testMenuEntries, setTestMenuEntries] = useState<RiskTestMenuEntry[]>([]);
  const [testMenuError, setTestMenuError] = useState<string | null>(null);
  const testMenuHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionRevealAnimation = useRef(new Animated.Value(0)).current;
  const autoDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const answers = activeDraw?.station.quiz?.answers ?? [];

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
      <View className="flex-1 px-3 py-3" style={{ rowGap: 10 }}>
        <Pressable onPressIn={handleTestMenuHoldStart} onPressOut={handleTestMenuHoldEnd}>
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

        <View className="flex-1 items-center justify-center">
          {activeDraw ? (
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
                {isAnswerIndexType ? activeDraw.station.quiz?.question ?? activeDraw.station.name : activeDraw.station.description}
              </Text>

              {isAnswerIndexType ? (
                answers.map((option, index) => {
                  const isSelected = answerResult !== null && index === answerResult.correctIndex;
                  const showAsWrong =
                    answerResult !== null && !answerResult.isCorrect && index !== answerResult.correctIndex;
                  return (
                    <Pressable
                      key={index}
                      disabled={isSubmittingAnswer || answerResult !== null}
                      onPress={() => void submitOutcome({ selectedIndex: index })}
                      className="rounded-2xl border px-4 py-3"
                      style={{
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
                })
              ) : answerResult === null ? (
                <View style={{ flexDirection: "row", columnGap: 10 }}>
                  <Pressable
                    disabled={isSubmittingAnswer}
                    onPress={() => void submitOutcome({ completed: true })}
                    className="flex-1 rounded-2xl px-4 py-3"
                    style={{ backgroundColor: EXPEDITION_THEME.accent }}
                  >
                    <Text
                      className="text-center"
                      style={{ color: EXPEDITION_THEME.background, fontSize: 16, fontWeight: "700" }}
                    >
                      Ukończone
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={isSubmittingAnswer}
                    onPress={() => void submitOutcome({ completed: false })}
                    className="flex-1 rounded-2xl border px-4 py-3"
                    style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
                  >
                    <Text
                      className="text-center"
                      style={{ color: EXPEDITION_THEME.textPrimary, fontSize: 16, fontWeight: "700" }}
                    >
                      Poddaję się
                    </Text>
                  </Pressable>
                </View>
              ) : null}

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

          {errorMessage ? (
            <Text style={{ color: "#ef4444", fontSize: 13, marginTop: 16, textAlign: "center" }}>{errorMessage}</Text>
          ) : null}
        </View>

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

function difficultyLabel(difficulty: "EASY" | "MEDIUM" | "HARD") {
  if (difficulty === "EASY") return "Łatwe";
  if (difficulty === "MEDIUM") return "Średnie";
  return "Trudne";
}
