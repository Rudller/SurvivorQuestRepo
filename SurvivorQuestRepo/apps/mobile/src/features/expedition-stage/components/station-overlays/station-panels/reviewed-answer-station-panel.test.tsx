import { fireEvent, render } from "@testing-library/react-native";

import { ReviewedAnswerStationPanel } from "./reviewed-answer-station-panel";

// A reviewed-answer card has no verdict of its own: it is sent once and then
// waits for the Game Master. These guard the two rules that follow from that —
// an empty answer can't be sent, and once it is sent the input is gone for good
// (no retry, same as a photo card).

function renderPanel(overrides: Partial<Parameters<typeof ReviewedAnswerStationPanel>[0]> = {}) {
  return render(
    <ReviewedAnswerStationPanel
      input=""
      isActionDisabled={false}
      isSubmitting={false}
      hasSubmitted={false}
      submitError={null}
      onChangeInput={jest.fn()}
      onSubmit={jest.fn()}
      {...overrides}
    />,
  );
}

describe("ReviewedAnswerStationPanel", () => {
  it("does not send an empty answer", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await renderPanel({ onSubmit });

    await fireEvent.press(getByText("Wyślij odpowiedź"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not send an answer that is only whitespace", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await renderPanel({ input: "   ", onSubmit });

    await fireEvent.press(getByText("Wyślij odpowiedź"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends a written answer", async () => {
    const onSubmit = jest.fn();
    const { getByText } = await renderPanel({ input: "Rozbicie dzielnicowe", onSubmit });

    await fireEvent.press(getByText("Wyślij odpowiedź"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("reports typing back to the host", async () => {
    const onChangeInput = jest.fn();
    const { getByPlaceholderText } = await renderPanel({ onChangeInput });

    await fireEvent.changeText(getByPlaceholderText("Wpiszcie odpowiedź"), "Trzy przyczyny");

    expect(onChangeInput).toHaveBeenCalledWith("Trzy przyczyny");
  });

  it("replaces the input with a waiting notice once the answer is sent", async () => {
    const { getByText, queryByText, queryByPlaceholderText } = await renderPanel({
      input: "Rozbicie dzielnicowe",
      hasSubmitted: true,
    });

    expect(getByText("Odpowiedź wysłana — czeka na decyzję Mistrza Gry.")).toBeTruthy();
    expect(queryByText("Wyślij odpowiedź")).toBeNull();
    expect(queryByPlaceholderText("Wpiszcie odpowiedź")).toBeNull();
  });

  it("blocks sending while the previous send is still in flight", async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = await renderPanel({
      input: "Rozbicie dzielnicowe",
      isSubmitting: true,
      onSubmit,
    });

    // The label is swapped for a spinner while submitting, so target the button
    // by testID rather than by text that is deliberately not rendered.
    await fireEvent.press(getByTestId("reviewed-answer-send"));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("surfaces a send error", async () => {
    const { getByText } = await renderPanel({
      input: "Rozbicie dzielnicowe",
      submitError: "Brak połączenia z serwerem.",
    });

    expect(getByText("Brak połączenia z serwerem.")).toBeTruthy();
  });
});
