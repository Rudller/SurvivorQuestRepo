import { fireEvent, render } from "@testing-library/react-native";

import { resolveTrueFalseStatements } from "../puzzle-helpers";
import { TrueFalseStationPanel } from "./true-false-station-panel";

// A true/false card carries its verdicts inside the answer slots, one statement
// per slot, so the two things worth guarding are: the flag never leaks into what
// the team reads, and the card cannot be submitted half-marked.

function renderPanel(overrides: Partial<Parameters<typeof TrueFalseStationPanel>[0]> = {}) {
  return render(
    <TrueFalseStationPanel
      statements={[
        { statement: "Mieszko I przyjął chrzest w 966 roku.", isTrue: true },
        { statement: "Bitwa pod Grunwaldem odbyła się w 1385 roku.", isTrue: false },
      ]}
      selections={[]}
      result={null}
      isActionDisabled={false}
      isInteractiveLocked={false}
      isSubmitting={false}
      onSelect={jest.fn()}
      onSubmit={jest.fn()}
      {...overrides}
    />,
  );
}

describe("resolveTrueFalseStatements", () => {
  it("splits the verdict off each statement", () => {
    const statements = resolveTrueFalseStatements({
      stationId: "s1",
      name: "Historia",
      quizAnswers: [
        "Mieszko I przyjął chrzest w 966 roku. :: T",
        "Bitwa pod Grunwaldem odbyła się w 1385 roku. :: F",
      ],
    });

    expect(statements).toEqual([
      { statement: "Mieszko I przyjął chrzest w 966 roku.", isTrue: true },
      { statement: "Bitwa pod Grunwaldem odbyła się w 1385 roku.", isTrue: false },
    ]);
  });

  it("keeps a statement that itself contains the delimiter", () => {
    const statements = resolveTrueFalseStatements({
      stationId: "s1",
      name: "Historia",
      quizAnswers: ["Zapis 12 :: 30 to godzina. :: T"],
    });

    expect(statements).toEqual([{ statement: "Zapis 12 :: 30 to godzina.", isTrue: true }]);
  });

  it("drops slots with no usable verdict rather than guessing one", () => {
    const statements = resolveTrueFalseStatements({
      stationId: "s1",
      name: "Historia",
      quizAnswers: ["Bez flagi", "Zła flaga :: X", " :: T", "Dobre :: F"],
    });

    expect(statements).toEqual([{ statement: "Dobre", isTrue: false }]);
  });
});

describe("TrueFalseStationPanel", () => {
  it("shows the statements without leaking their verdicts", async () => {
    const { getByText, queryByText } = await renderPanel();

    expect(getByText("Mieszko I przyjął chrzest w 966 roku.")).toBeTruthy();
    expect(queryByText("Mieszko I przyjął chrzest w 966 roku. :: T")).toBeNull();
  });

  it("reports which statement was marked and how", async () => {
    const onSelect = jest.fn();
    const { getAllByText } = await renderPanel({ onSelect });

    await fireEvent.press(getAllByText("Fałsz")[1]);

    expect(onSelect).toHaveBeenCalledWith(1, false);
  });

  it("does not submit while the card is still half-marked", async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = await renderPanel({
      selections: [true, null],
      // Mirrors trueFalseIsActionDisabled in the preview model, which stays true
      // until every statement is marked.
      isActionDisabled: true,
      onSubmit,
    });

    await fireEvent.press(getByTestId("true-false-submit"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits once every statement is marked", async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = await renderPanel({ selections: [true, false], onSubmit });

    await fireEvent.press(getByTestId("true-false-submit"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("surfaces the verdict text", async () => {
    const { getByText } = await renderPanel({
      result: "Co najmniej jedno zdanie jest oznaczone błędnie.",
    });

    expect(getByText("Co najmniej jedno zdanie jest oznaczone błędnie.")).toBeTruthy();
  });
});
