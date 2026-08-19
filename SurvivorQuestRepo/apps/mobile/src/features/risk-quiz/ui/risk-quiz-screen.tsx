import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { OnboardingSession, RealizationLanguage, RealizationLanguageOption } from "../../onboarding/model/types";
import { getRealizationLanguageFlag, getRealizationLanguageLabel } from "../../onboarding/model/types";
import { EXPEDITION_THEME, TEAM_COLORS, type ExpeditionThemeMode } from "../../onboarding/model/constants";
import { QrScannerOverlay } from "../../expedition-stage/components/qr-scanner-overlay";
import { TopRealizationPanel } from "../../expedition-stage/components/top-realization-panel";
import {
  fetchMobileSessionState,
  getMobileApiErrorStatusCode,
} from "../../expedition-stage/api/mobile-session.api";
import {
  fetchRiskQuizDeckStatus,
  postRiskQuizAnswer,
  postRiskQuizScan,
  type RiskAnswerResult,
  type RiskDeckStatus,
  type RiskScanResult,
} from "../api/risk-quiz.api";
import { AutoScrollingIntroBox } from "../../../shared/ui/intro-text-preview";
import { RiskQuizBottomPanel } from "../components/risk-quiz-bottom-panel";
import { RiskQuizDeckStack } from "../components/risk-quiz-deck-stack";
import { RiskQuizBackground } from "../components/risk-quiz-background";
import { useRealizationCountdown } from "../../expedition-stage/hooks/use-realization-countdown";

type RiskQuizScreenProps = {
  session: OnboardingSession;
  onSessionInvalid: (reason?: string) => void;
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

export function RiskQuizScreen({
  session,
  onSessionInvalid,
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

  const teamColorFromPalette = TEAM_COLORS.find((color) => color.key === liveTeam?.color) ?? null;
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

  function handleScanNext() {
    setActiveDraw(null);
    setAnswerResult(null);
    setExhaustedNotice(null);
    setIsScannerVisible(true);
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

        <View className="flex-1 items-center justify-center">
          {activeDraw ? (
            <View className="w-full" style={{ rowGap: 14 }}>
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
                <View style={{ rowGap: 10, alignItems: "center", marginTop: 8 }}>
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
                  <Pressable
                    onPress={handleScanNext}
                    className="rounded-2xl px-6 py-3"
                    style={{ backgroundColor: EXPEDITION_THEME.accent }}
                  >
                    <Text style={{ color: EXPEDITION_THEME.background, fontSize: 16, fontWeight: "700" }}>
                      Skanuj kolejną kartę
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
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
    </SafeAreaView>
  );
}

function difficultyLabel(difficulty: "EASY" | "MEDIUM" | "HARD") {
  if (difficulty === "EASY") return "Łatwe";
  if (difficulty === "MEDIUM") return "Średnie";
  return "Trudne";
}
