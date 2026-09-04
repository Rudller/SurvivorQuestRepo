import { Pressable, Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { RiskQuizPigEffectLayer } from "./risk-quiz-pig-effects";

// Both of these are pure transforms on a wrapper, which is exactly why they are
// safe: the transform carries the hit area with it, so nothing on the card can
// become unreachable the way it could under an overlay. These tests pin that
// down, because "the screen must stay usable" is the loudest rule in this file.

function flattenTransform(style: unknown) {
  const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
  return (flat as { transform?: Record<string, number>[] })?.transform ?? [];
}

describe("MIRROR pig", () => {
  it("flips the screen horizontally", async () => {
    const view = await render(
      <RiskQuizPigEffectLayer type="MIRROR" isLightTheme={false}>
        <Text>Pytanie w lustrze</Text>
      </RiskQuizPigEffectLayer>,
    );

    const layer = view.getByTestId("risk-pig-mirror-layer");
    expect(flattenTransform(layer.props.style)).toContainEqual({ scaleX: -1 });
    expect(view.getByText("Pytanie w lustrze")).toBeTruthy();
  });

  it("leaves answers pressable", async () => {
    const onPress = jest.fn();
    const view = await render(
      <RiskQuizPigEffectLayer type="MIRROR" isLightTheme={false}>
        <Pressable onPress={onPress}>
          <Text>Odpowiedź</Text>
        </Pressable>
      </RiskQuizPigEffectLayer>,
    );

    fireEvent.press(view.getByText("Odpowiedź"));

    expect(onPress).toHaveBeenCalled();
  });
});

describe("SLIDE pig", () => {
  it("wraps the screen in a drifting layer without hiding it", async () => {
    const view = await render(
      <RiskQuizPigEffectLayer type="SLIDE" isLightTheme={false}>
        <Text>Uciekające pytanie</Text>
      </RiskQuizPigEffectLayer>,
    );

    expect(view.getByTestId("risk-pig-slide-layer")).toBeTruthy();
    expect(view.getByText("Uciekające pytanie")).toBeTruthy();
  });

  it("leaves answers pressable", async () => {
    const onPress = jest.fn();
    const view = await render(
      <RiskQuizPigEffectLayer type="SLIDE" isLightTheme={false}>
        <Pressable onPress={onPress}>
          <Text>Odpowiedź</Text>
        </Pressable>
      </RiskQuizPigEffectLayer>,
    );

    fireEvent.press(view.getByText("Odpowiedź"));

    expect(onPress).toHaveBeenCalled();
  });

  // Expiry is the type prop going null. The loop has to stop and the screen has
  // to come back untouched — no leftover wrapper, no leftover transform.
  it("lets go of the screen when the pig expires", async () => {
    const view = await render(
      <RiskQuizPigEffectLayer type="SLIDE" isLightTheme={false}>
        <Text>Uciekające pytanie</Text>
      </RiskQuizPigEffectLayer>,
    );

    await view.rerender(
      <RiskQuizPigEffectLayer type={null} isLightTheme={false}>
        <Text>Uciekające pytanie</Text>
      </RiskQuizPigEffectLayer>,
    );

    expect(view.queryByTestId("risk-pig-slide-layer")).toBeNull();
    expect(view.getByText("Uciekające pytanie")).toBeTruthy();
  });
});
