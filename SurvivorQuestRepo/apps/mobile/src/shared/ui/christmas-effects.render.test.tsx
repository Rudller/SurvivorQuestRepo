import { render } from "@testing-library/react-native";

import { setExpeditionThemeMode } from "../../features/onboarding/model/constants";
import { useReduceMotion } from "../a11y/use-reduce-motion";
import { useAdaptiveLayout } from "../layout/use-adaptive-layout";
import { BURST_PARTICLE_COUNT, ChristmasBurst } from "./christmas-burst";
import { buildGarland, ChristmasGarland } from "./christmas-garland";
import { SleighFlyby } from "./sleigh-flyby";
import { buildSnowCapPath, SnowCap } from "./snow-cap";

jest.mock("../a11y/use-reduce-motion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

jest.mock("../layout/use-adaptive-layout", () => ({
  useAdaptiveLayout: jest.fn(() => ({ isTablet: false })),
}));

const mockUseReduceMotion = useReduceMotion as jest.MockedFunction<typeof useReduceMotion>;
const mockUseAdaptiveLayout = useAdaptiveLayout as jest.MockedFunction<typeof useAdaptiveLayout>;
const QUERY_HIDDEN = { includeHiddenElements: true } as const;

beforeEach(() => {
  mockUseReduceMotion.mockReturnValue(false);
  mockUseAdaptiveLayout.mockReturnValue({ isTablet: false } as ReturnType<typeof useAdaptiveLayout>);
});

afterEach(() => {
  setExpeditionThemeMode("dark", "expedition");
});

describe("buildGarland", () => {
  it("rozkłada łuki na całą szerokość i wiesza żarówki pod drutem", () => {
    const { wirePath, bulbs } = buildGarland(800, 150, 3, 8);

    expect(wirePath.startsWith("M0,3")).toBe(true);
    expect(wirePath.endsWith(",3")).toBe(true);
    expect(bulbs.length).toBeGreaterThan(0);
    for (const bulb of bulbs) {
      expect(bulb.x).toBeGreaterThan(0);
      expect(bulb.x).toBeLessThan(800);
      // Łuk zwisa w dół, więc żadna żarówka nie wisi wyżej niż drut.
      expect(bulb.y).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("buildSnowCapPath", () => {
  it("zamyka kształt i nie wychodzi poza pudełko", () => {
    const width = 600;
    const height = 16;
    const path = buildSnowCapPath(width, height, 3);
    const numbers = (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

    expect(path.endsWith("Z")).toBe(true);
    // Punkty kontrolne pagórków mogą wystawać ponad 0, ale nie poza szerokość.
    expect(Math.max(...numbers)).toBeLessThanOrEqual(width);
  });
});

describe("efekty świąteczne poza oprawą świąteczną", () => {
  it("SnowCap i ChristmasBurst nic nie rysują", async () => {
    setExpeditionThemeMode("dark", "expedition");

    const cap = await render(<SnowCap cornerRadius={20} />);
    expect(cap.toJSON()).toBeNull();
    await cap.unmount();

    const burst = await render(<ChristmasBurst />);
    expect(burst.toJSON()).toBeNull();
  });
});

describe("efekty świąteczne w oprawie świątecznej", () => {
  beforeEach(() => {
    setExpeditionThemeMode("dark", "christmas");
  });

  it("fajerwerk rozsypuje wszystkie iskry", async () => {
    const { getByTestId } = await render(<ChristmasBurst />);
    const root = getByTestId("christmas-burst", QUERY_HIDDEN);

    expect(root.props.pointerEvents).toBe("none");
    expect(root.children).toHaveLength(BURST_PARTICLE_COUNT);
  });

  it("girlanda i sanie nie łapią dotyku", async () => {
    const garland = await render(<ChristmasGarland isLightTheme={false} />);
    expect(garland.getByTestId("christmas-garland", QUERY_HIDDEN).props.pointerEvents).toBe("none");
    await garland.unmount();

    const sleigh = await render(<SleighFlyby isLightTheme={false} />);
    expect(sleigh.getByTestId("sleigh-flyby", QUERY_HIDDEN).props.pointerEvents).toBe("none");
  });

  it("przy „Ogranicz ruch” nie ma sań ani fajerwerku", async () => {
    mockUseReduceMotion.mockReturnValue(true);

    const sleigh = await render(<SleighFlyby isLightTheme={false} />);
    expect(sleigh.toJSON()).toBeNull();
    await sleigh.unmount();

    const burst = await render(<ChristmasBurst />);
    expect(burst.toJSON()).toBeNull();
  });
});
