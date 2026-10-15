import { render } from "@testing-library/react-native";
import { Animated } from "react-native";

import { useReduceMotion } from "../a11y/use-reduce-motion";
import { useAdaptiveLayout } from "../layout/use-adaptive-layout";
import { ChristmasBackground } from "./christmas-background";
import { SNOWFLAKE_COUNT_PHONE, SNOWFLAKE_COUNT_TABLET, Snowfall } from "./snowfall";

jest.mock("../a11y/use-reduce-motion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

jest.mock("../layout/use-adaptive-layout", () => ({
  useAdaptiveLayout: jest.fn(),
}));

const mockUseReduceMotion = useReduceMotion as jest.MockedFunction<typeof useReduceMotion>;
const mockUseAdaptiveLayout = useAdaptiveLayout as jest.MockedFunction<typeof useAdaptiveLayout>;

/** Warstwa jest schowana przed czytnikiem ekranu — zapytania muszą to obejść. */
const QUERY_HIDDEN = { includeHiddenElements: true } as const;

function mockLayout(isTablet: boolean) {
  mockUseAdaptiveLayout.mockReturnValue({ isTablet } as ReturnType<typeof useAdaptiveLayout>);
}

describe("Snowfall", () => {
  beforeEach(() => {
    mockUseReduceMotion.mockReturnValue(false);
    mockLayout(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("na telefonie sypie mniej płatków niż na tablecie", async () => {
    const phone = await render(<Snowfall isLightTheme={false} />);
    expect(phone.getAllByTestId("snowflake", QUERY_HIDDEN)).toHaveLength(SNOWFLAKE_COUNT_PHONE);
    await phone.unmount();

    mockLayout(true);
    const tablet = await render(<Snowfall isLightTheme={false} />);
    expect(tablet.getAllByTestId("snowflake", QUERY_HIDDEN)).toHaveLength(SNOWFLAKE_COUNT_TABLET);
  });

  it("nie łapie dotyku i nie wystawia się czytnikowi ekranu", async () => {
    const { getByTestId } = await render(<Snowfall isLightTheme />);
    const root = getByTestId("snowfall", QUERY_HIDDEN);

    expect(root.props.pointerEvents).toBe("none");
    expect(root.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(root.props.accessibilityElementsHidden).toBe(true);
  });

  it("uruchamia pętlę opadania", async () => {
    const loopSpy = jest.spyOn(Animated, "loop");

    await render(<Snowfall isLightTheme={false} />);

    expect(loopSpy).toHaveBeenCalledTimes(1);
  });

  it("przy „Ogranicz ruch” płatki stoją, ale zostają na ekranie", async () => {
    mockUseReduceMotion.mockReturnValue(true);
    const loopSpy = jest.spyOn(Animated, "loop");

    const { getAllByTestId } = await render(<Snowfall isLightTheme={false} />);

    expect(loopSpy).not.toHaveBeenCalled();
    expect(getAllByTestId("snowflake", QUERY_HIDDEN)).toHaveLength(SNOWFLAKE_COUNT_PHONE);
  });
});

describe("ChristmasBackground", () => {
  it.each([false, true])("renderuje się (jasny: %s) jako ukryta dekoracja", async (isLightTheme) => {
    const { getByTestId } = await render(<ChristmasBackground isLightTheme={isLightTheme} />);
    const root = getByTestId("christmas-background", QUERY_HIDDEN);

    expect(root.props.pointerEvents).toBe("none");
    expect(root.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
