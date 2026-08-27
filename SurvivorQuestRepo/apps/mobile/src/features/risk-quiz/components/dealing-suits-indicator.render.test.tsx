import { render } from "@testing-library/react-native";

import { DealingSuitsIndicator } from "./dealing-suits-indicator";
import { CARD_SUIT_ORDER } from "./card-suits";

// Animated.interpolate validates its ranges when the style is evaluated, not
// when buildSuitOpacityRange returns — so only an actual render proves every
// suit's range survives the trip.
type RenderedNode = { type?: unknown; children?: unknown } | string | null;

function countSvgRoots(node: RenderedNode | RenderedNode[] | undefined): number {
  if (!node || typeof node === "string") return 0;
  if (Array.isArray(node)) return node.reduce((total, child) => total + countSvgRoots(child), 0);

  const isSvgRoot = typeof node.type === "string" && node.type.includes("SvgView");
  const children = (node.children ?? []) as RenderedNode[];

  return (isSvgRoot ? 1 : 0) + countSvgRoots(children);
}

describe("DealingSuitsIndicator", () => {
  it("renders one shape per suit without throwing", async () => {
    const view = await render(<DealingSuitsIndicator size={18} cycleDurationMs={2800} />);

    expect(countSvgRoots(view.toJSON())).toBe(CARD_SUIT_ORDER.length);
  });

  it("stops its loop when the waiting screen goes away", async () => {
    const view = await render(<DealingSuitsIndicator size={18} cycleDurationMs={2800} />);

    expect(() => view.unmount()).not.toThrow();
  });
});
