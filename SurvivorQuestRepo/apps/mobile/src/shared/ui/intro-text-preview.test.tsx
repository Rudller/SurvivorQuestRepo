import { StyleSheet, type ViewStyle } from "react-native";
import { render } from "@testing-library/react-native";

import { AutoScrollingIntroBox } from "./intro-text-preview";

// The Ryzykanci waiting screen puts the intro text straight on the screen
// background — no card, no border. That's a prop on this shared box, so a
// regression here would silently put the panel back on that screen, and the
// other caller must keep its card.

// The box renders its card surface as the outer element, so the root of the
// tree carries whatever chrome the variant asked for.
function surfaceStyle(view: Awaited<ReturnType<typeof render>>): ViewStyle {
  const root = view.toJSON();
  const style = Array.isArray(root) ? root[0]?.props?.style : root?.props?.style;
  return (StyleSheet.flatten(style) ?? {}) as ViewStyle;
}

describe("AutoScrollingIntroBox", () => {
  it("keeps its card surface by default", async () => {
    const view = await render(<AutoScrollingIntroBox text="Fabuła" fallbackText="fallback" />);

    const style = surfaceStyle(view);
    expect(style.backgroundColor).toBeDefined();
    expect(style.borderColor).toBeDefined();
  });

  it("drops fill and border when chromeless", async () => {
    const view = await render(<AutoScrollingIntroBox chromeless text="Fabuła" fallbackText="fallback" />);

    const style = surfaceStyle(view);
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderColor).toBeUndefined();
  });

  it("lets the caller stretch it to the space left on the screen", async () => {
    const view = await render(
      <AutoScrollingIntroBox
        chromeless
        style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 }}
        text="Fabuła"
        fallbackText="fallback"
      />,
    );

    // The box's own base style sets flexGrow: 0 — the caller's value has to win.
    expect(surfaceStyle(view).flexGrow).toBe(1);
  });
});
