import { renderHook, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { useReduceMotion } from "./use-reduce-motion";

type ReduceMotionListener = (enabled: boolean) => void;

// AccessibilityInfo.addEventListener is overloaded across every accessibility
// event, so TypeScript resolves a spy on it to the first overload's handler
// type. These wrappers keep that noise in one place instead of scattering
// casts through the tests.
function mockAddEventListener(subscription: { remove: () => void }) {
  return jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockReturnValue(subscription as never);
}

function captureReduceMotionListener(onListener: (listener: ReduceMotionListener) => void) {
  return jest
    .spyOn(AccessibilityInfo, "addEventListener")
    .mockImplementation(((_event: string, handler: ReduceMotionListener) => {
      onListener(handler);
      return { remove: jest.fn() };
    }) as never);
}

describe("useReduceMotion", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reports the setting the platform starts with", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);

    const { result } = await renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays false while the platform says motion is fine", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);

    const { result } = await renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(false));
  });

  // Someone can flip the setting while a tablet is sitting on the waiting
  // screen; the animations have to react without a reload.
  it("follows the setting being switched on mid-session", async () => {
    let listener: ReduceMotionListener | undefined;
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    captureReduceMotionListener((handler) => {
      listener = handler;
    });

    const { result } = await renderHook(() => useReduceMotion());
    await waitFor(() => expect(listener).toBeDefined());

    listener?.(true);

    await waitFor(() => expect(result.current).toBe(true));
  });

  // A screen that can't ask the platform still has to render.
  it("falls back to allowing motion when the query rejects", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockRejectedValue(new Error("unsupported"));

    const { result } = await renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it("drops its listener on unmount", async () => {
    const remove = jest.fn();
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    mockAddEventListener({ remove });

    const view = await renderHook(() => useReduceMotion());
    await view.unmount();

    await waitFor(() => expect(remove).toHaveBeenCalled());
  });
});
