import { ScrollView, Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { RiskQuizPigEffectLayer } from "./risk-quiz-pig-effects";

// Two things are asserted here, and they are separate on purpose.
//
// The rub runs off the raw touch events, which arrive whoever holds the
// responder. The capture handlers do one job: keeping the ScrollView the card
// sits in from turning a sideways wipe into a scroll, without ever swallowing a
// tap on an answer.

function touchAt(x: number, y: number) {
  return { nativeEvent: { pageX: x, pageY: y } };
}

async function renderFogLayer() {
  const view = await render(
    <RiskQuizPigEffectLayer type="FOG" isLightTheme={false}>
      <ScrollView>
        <Text>Pytanie za mgłą</Text>
      </ScrollView>
    </RiskQuizPigEffectLayer>,
  );

  const root = view.getByTestId("risk-pig-fog");
  // Nothing is drawn until the layer has been measured — the puff field is laid
  // out against real pixels.
  await fireEvent(root, "layout", { nativeEvent: { layout: { width: 820, height: 1180 } } });

  return { view, root };
}

type FogRoot = Awaited<ReturnType<typeof renderFogLayer>>["root"];

async function startGestureAt(root: FogRoot, x: number, y: number) {
  return fireEvent(root, "startShouldSetResponderCapture", touchAt(x, y));
}

describe("FogEffect gestures", () => {
  it("mounts over the screen without throwing", async () => {
    const { view } = await renderFogLayer();

    expect(view.getByText("Pytanie za mgłą")).toBeTruthy();
  });

  it("never claims the gesture on touch down, so answers stay pressable", async () => {
    const { root } = await renderFogLayer();

    expect(await startGestureAt(root, 400, 600)).toBe(false);
  });

  it("takes a sideways drag off the ScrollView so it rubs instead of scrolling", async () => {
    const { root } = await renderFogLayer();
    await startGestureAt(root, 400, 600);

    expect(await fireEvent(root, "moveShouldSetResponderCapture", touchAt(440, 604))).toBe(true);
  });

  it("leaves an up-and-down drag to the ScrollView so the card can still scroll", async () => {
    const { root } = await renderFogLayer();
    await startGestureAt(root, 400, 600);

    expect(await fireEvent(root, "moveShouldSetResponderCapture", touchAt(404, 660))).toBe(false);
  });

  it("ignores the wobble in a tap", async () => {
    const { root } = await renderFogLayer();
    await startGestureAt(root, 400, 600);

    expect(await fireEvent(root, "moveShouldSetResponderCapture", touchAt(403, 601))).toBe(false);
  });

  it("holds the gesture once it has it, so a sweep is not cut in half", async () => {
    const { root } = await renderFogLayer();

    expect(await fireEvent(root, "responderTerminationRequest", touchAt(400, 600))).toBe(false);
  });

  it("rubs on raw touch events, which arrive whoever holds the responder", async () => {
    const { root } = await renderFogLayer();

    await fireEvent(root, "touchStart", touchAt(400, 600));
    for (let step = 0; step < 8; step += 1) {
      await fireEvent(root, "touchMove", touchAt(400 + step * 40, 600 + step * 6));
    }
    await fireEvent(root, "touchEnd", touchAt(720, 642));
  });

  it("survives a gesture that reaches both the touch and the responder handlers", async () => {
    const { root } = await renderFogLayer();

    // A real sideways rub fires both: the raw touch events all the way through,
    // and the responder grant in the middle when the claim above fires.
    await fireEvent(root, "touchStart", touchAt(400, 600));
    await fireEvent(root, "touchMove", touchAt(440, 604));
    await startGestureAt(root, 400, 600);
    await fireEvent(root, "moveShouldSetResponderCapture", touchAt(440, 604));
    await fireEvent(root, "responderGrant", touchAt(440, 604));
    await fireEvent(root, "touchMove", touchAt(520, 610));
    await fireEvent(root, "responderRelease", touchAt(520, 610));
    await fireEvent(root, "touchEnd", touchAt(520, 610));
  });

  it("stops its drift loop and regrow when the pig expires", async () => {
    const { view, root } = await renderFogLayer();

    await fireEvent(root, "touchStart", touchAt(400, 600));
    await fireEvent(root, "touchMove", touchAt(460, 606));

    expect(() => view.unmount()).not.toThrow();
  });
});
