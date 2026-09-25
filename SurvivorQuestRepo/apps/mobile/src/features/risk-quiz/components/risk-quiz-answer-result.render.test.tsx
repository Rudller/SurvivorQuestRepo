import { render } from "@testing-library/react-native";

import { RiskQuizAnswerResult } from "./risk-quiz-answer-result";

const LABELS = { correctAnswer: "Poprawna odpowiedź", secret: "Hasło" };
const WRONG = { isCorrect: false, pointsDelta: -2, teamPoints: 8, streak: 0, multiplier: 1 };
const RIGHT = { isCorrect: true, pointsDelta: 10, teamPoints: 20, streak: 1, multiplier: 1 };

describe("RiskQuizAnswerResult", () => {
  it("reveals the answer after a wrong one", async () => {
    const view = await render(
      <RiskQuizAnswerResult result={WRONG} correctAnswer={{ kind: "answer", text: "Gniezno" }} labels={LABELS} />,
    );

    expect(view.getByText(/Źle!/)).toBeTruthy();
    expect(view.getByText("Gniezno")).toBeTruthy();
    expect(view.getByText(/Poprawna odpowiedź/)).toBeTruthy();
  });

  it("labels a word puzzle's secret as the password", async () => {
    const view = await render(
      <RiskQuizAnswerResult result={WRONG} correctAnswer={{ kind: "secret", text: "PRZYGODA" }} labels={LABELS} />,
    );

    expect(view.getByText(/Hasło/)).toBeTruthy();
    expect(view.getByText("PRZYGODA")).toBeTruthy();
  });

  it("does not reveal anything after a correct answer", async () => {
    const view = await render(
      <RiskQuizAnswerResult result={RIGHT} correctAnswer={{ kind: "answer", text: "Gniezno" }} labels={LABELS} />,
    );

    expect(view.getByText(/Dobrze!/)).toBeTruthy();
    expect(view.queryByText("Gniezno")).toBeNull();
  });

  it("shows only the score for a card with nothing to reveal", async () => {
    const view = await render(<RiskQuizAnswerResult result={WRONG} correctAnswer={null} labels={LABELS} />);

    expect(view.getByText(/Źle!/)).toBeTruthy();
    expect(view.queryByText(/Poprawna odpowiedź/)).toBeNull();
  });
});
