import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { isArModelKind, type ArModelKind } from "../../ar-models/ar-model-answer";
import { getArModelState, resetArModelState, setArModelState } from "../../ar-models/ar-model-store";
import { AR_MODEL_COLORS, AR_MODEL_TITLES, ArModelViewer } from "../../ar-models/ar-model-viewer";
import { loadViro } from "../../forensic-evidence/forensic-ar-layer";
import { resolveCorrectAnswerText, TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import type { StationTestViewModel } from "../types";
import { OpenQuizStationPanel } from "./open-quiz-station-panel";
import { useStationPanelLayout } from "./shared-ui";

type ArModelStationPanelProps = ComponentProps<typeof OpenQuizStationPanel> & {
  station: StationTestViewModel;
};

const INTRO: Record<ArModelKind, string> = {
  "ar-safe": "Postawcie sejf na stole i ustawcie szyfr na pokrętle.",
  "ar-bomb": "Postawcie bombę na stole i przetnijcie kable we właściwej kolejności. Zła kolejność = wybuch.",
  "ar-artifact": "Postawcie skrzyneczkę na stole, obejrzyjcie ją z każdej strony i wpiszcie znaleziony kod.",
  "ar-puzzle-box": "Postawcie szkatułkę na stole i ułóżcie symbole na wieku we właściwej kolejności.",
};

// Po sukcesie model gra animację (drzwi, wieko), a potem widok sam się zamyka,
// żeby drużyna zobaczyła zwykły popup wyniku.
const CLOSE_AFTER_SUCCESS_MS = 2600;
const RESET_AFTER_WRONG_MS = 1800;

// Stanowisko z modelem 3D. Zapis i sprawdzanie są te z pytania otwartego
// (behavesAs: "open-quiz"): model składa odpowiedź, a panel wpisuje ją w pole
// pytania otwartego i wysyła.
export function ArModelStationPanel({ station, ...openQuiz }: ArModelStationPanelProps) {
  const layout = useStationPanelLayout();
  const kind: ArModelKind = isArModelKind(station.stationType) ? station.stationType : "ar-safe";
  const isArAvailable = loadViro() !== null;
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const submittedAttemptsLeft = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isLocked = openQuiz.isActionDisabled && !openQuiz.isSubmittingOpenQuiz;

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  // 1) Odpowiedź z modelu trafia do pola pytania otwartego...
  // 2) ...a gdy pole ją pokazuje, wysyłamy ją zwykłym "Sprawdź".
  useEffect(() => {
    if (pendingAnswer !== null && openQuiz.openQuizInput === pendingAnswer) {
      setPendingAnswer(null);
      submittedAttemptsLeft.current = openQuiz.openQuizAttemptsLeft;
      openQuiz.onSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAnswer, openQuiz.openQuizInput]);

  // 3) Wynik: mniej prób = zła odpowiedź, wynik bez utraty próby = sukces.
  useEffect(() => {
    const before = submittedAttemptsLeft.current;
    if (before === null || openQuiz.isSubmittingOpenQuiz || openQuiz.openQuizResult === null) {
      return;
    }
    submittedAttemptsLeft.current = null;
    if (openQuiz.openQuizAttemptsLeft < before) {
      setArModelState({ status: "wrong" });
      const isOutOfAttempts = openQuiz.openQuizAttemptsLeft <= 0;
      timers.current.push(
        setTimeout(() => {
          if (isOutOfAttempts) {
            setIsViewerOpen(false);
          } else if (getArModelState().status === "wrong") {
            setArModelState({ status: "idle", safeEntered: [], bombCut: [] });
          }
        }, RESET_AFTER_WRONG_MS),
      );
      return;
    }
    setArModelState({ status: "success" });
    timers.current.push(setTimeout(() => setIsViewerOpen(false), CLOSE_AFTER_SUCCESS_MS));
  }, [openQuiz.openQuizResult, openQuiz.openQuizAttemptsLeft, openQuiz.isSubmittingOpenQuiz]);

  const openViewer = () => {
    resetArModelState(kind, resolveCorrectAnswerText(station));
    setIsViewerOpen(true);
  };

  const submitFromModel = (answer: string) => {
    if (openQuiz.isActionDisabled || getArModelState().status !== "idle") {
      return;
    }
    setArModelState({ status: "checking" });
    setPendingAnswer(answer);
    openQuiz.onChangeInput(answer);
  };

  const showTypedAnswer = kind === "ar-artifact" || !isArAvailable;

  return (
    <View style={{ rowGap: layout.isTablet ? 16 : 12 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: AR_MODEL_COLORS.border,
          borderRadius: 16,
          padding: layout.isTablet ? 16 : 12,
          backgroundColor: "rgba(59, 7, 100, 0.28)",
          rowGap: 10,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 18 : 15, fontWeight: "700" }}>
            {AR_MODEL_TITLES[kind]}
          </Text>
          {kind !== "ar-artifact" ? (
            <Text style={{ color: AR_MODEL_COLORS.accent, fontSize: layout.isTablet ? 16 : 14, fontWeight: "700" }}>
              Próby: {openQuiz.openQuizAttemptsLeft}/{TEXT_PUZZLE_MAX_ATTEMPTS}
            </Text>
          ) : null}
        </View>
        <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.isTablet ? 15 : 13 }}>
          {isArAvailable ? INTRO[kind] : "Model 3D działa tylko w aplikacji z AR. Wpiszcie odpowiedź poniżej."}
        </Text>
        {isArAvailable ? (
          <Pressable
            onPress={openViewer}
            disabled={isLocked}
            style={{
              backgroundColor: isLocked ? EXPEDITION_THEME.panelStrong : AR_MODEL_COLORS.accent,
              borderRadius: 12,
              paddingVertical: layout.isTablet ? 14 : 11,
              alignItems: "center",
            }}
          >
            <Text style={{ color: isLocked ? EXPEDITION_THEME.textMuted : "#1a0b2e", fontSize: layout.isTablet ? 18 : 15, fontWeight: "800" }}>
              Pokaż model 3D
            </Text>
          </Pressable>
        ) : null}
        {!showTypedAnswer && openQuiz.openQuizResult ? (
          <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.isTablet ? 15 : 13 }}>{openQuiz.openQuizResult}</Text>
        ) : null}
      </View>

      {showTypedAnswer ? <OpenQuizStationPanel {...openQuiz} /> : null}

      <Modal visible={isViewerOpen} animationType="fade" statusBarTranslucent onRequestClose={() => setIsViewerOpen(false)}>
        {isViewerOpen ? (
          <ArModelViewer
            kind={kind}
            attemptsLeft={openQuiz.openQuizAttemptsLeft}
            maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
            onSubmitAnswer={submitFromModel}
            onClose={() => setIsViewerOpen(false)}
          />
        ) : null}
      </Modal>
    </View>
  );
}
