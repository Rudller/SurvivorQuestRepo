import { Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../onboarding/model/constants";
import type { RiskAnswerResult } from "../api/risk-quiz.api";
import type { RiskCorrectAnswer } from "../model/risk-quiz-correct-answer";

type RiskQuizAnswerResultProps = {
  result: RiskAnswerResult;
  // Odsłaniane tylko przy błędzie; null = typ zadania, w którym nie ma czego pokazać.
  correctAnswer: RiskCorrectAnswer | null;
  labels: { correctAnswer: string; secret: string };
};

// "Dobrze!/Źle! ±N pkt", a po błędzie (także po końcu czasu) jeszcze dobra
// odpowiedź albo hasło — wspólne dla kart quizowych i kart z panelami stacji.
export function RiskQuizAnswerResult({ result, correctAnswer, labels }: RiskQuizAnswerResultProps) {
  const revealed = !result.isCorrect ? correctAnswer : null;

  return (
    <View style={{ alignItems: "center", rowGap: 6 }}>
      <Text
        style={{
          color: result.isCorrect ? "#22c55e" : "#ef4444",
          fontSize: 20,
          fontWeight: "800",
        }}
      >
        {result.isCorrect ? "Dobrze!" : "Źle!"} {result.pointsDelta >= 0 ? "+" : ""}
        {result.pointsDelta} pkt
        {result.isCorrect && result.multiplier > 1 ? ` (x${result.multiplier})` : ""}
      </Text>
      {revealed ? (
        <Text style={{ color: EXPEDITION_THEME.textPrimary, fontSize: 18, textAlign: "center" }}>
          {revealed.kind === "secret" ? labels.secret : labels.correctAnswer}:{" "}
          <Text style={{ fontWeight: "800" }}>{revealed.text}</Text>
        </Text>
      ) : null}
    </View>
  );
}
