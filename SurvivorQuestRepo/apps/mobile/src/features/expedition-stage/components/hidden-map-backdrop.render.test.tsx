import { render } from "@testing-library/react-native";

import {
  setExpeditionThemeMode,
  type ExpeditionThemeFamily,
  type ExpeditionThemeMode,
} from "../../onboarding/model/constants";
import { useReduceMotion } from "../../../shared/a11y/use-reduce-motion";
import { HiddenMapBackdrop } from "./hidden-map-backdrop";

jest.mock("../../../shared/a11y/use-reduce-motion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockUseReduceMotion = useReduceMotion as jest.MockedFunction<typeof useReduceMotion>;

const FAMILIES: ExpeditionThemeFamily[] = ["expedition", "risk", "crime", "christmas"];
const MODES: ExpeditionThemeMode[] = ["dark", "light"];

/**
 * Warstwa jest schowana przed czytnikiem ekranu, a biblioteka domyślnie pomija
 * w zapytaniach wszystko, co schowane. Konieczność tej flagi jest więc sama w
 * sobie dowodem, że ukrycie działa — bez niej `getByTestId` nie widzi roota.
 */
const QUERY_HIDDEN = { includeHiddenElements: true } as const;

describe("HiddenMapBackdrop", () => {
  // Oprawa siedzi w module, nie w propsach, więc bez sprzątania wyciekłaby do
  // sąsiednich zestawów i o wyniku decydowałaby kolejność plików.
  beforeEach(() => {
    mockUseReduceMotion.mockReturnValue(false);
  });

  afterEach(() => {
    setExpeditionThemeMode("dark", "expedition");
  });

  describe.each(FAMILIES)("oprawa %s", (family) => {
    it.each(MODES)("renderuje się w wariancie %s", async (mode) => {
      setExpeditionThemeMode(mode, family);

      const view = await render(<HiddenMapBackdrop />);

      expect(view.toJSON()).toBeTruthy();
      expect(view.getByTestId("hidden-map-backdrop", QUERY_HIDDEN)).toBeTruthy();
    });
  });

  it("nie wystawia się dotykowi ani czytnikowi ekranu", async () => {
    // Gałąź, którą ta warstwa zastępuje, niosła etykietę „Mapa wydarzenia".
    // Dekoracja nie może jej odziedziczyć — to byłoby okłamanie czytnika.
    setExpeditionThemeMode("dark", "crime");

    const { getByTestId, queryByLabelText } = await render(<HiddenMapBackdrop />);
    const root = getByTestId("hidden-map-backdrop", QUERY_HIDDEN);

    expect(root.props.pointerEvents).toBe("none");
    expect(root.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(queryByLabelText("Mapa wydarzenia", QUERY_HIDDEN)).toBeNull();
  });

  it("odmontowuje się czysto", async () => {
    setExpeditionThemeMode("dark", "crime");

    const view = await render(<HiddenMapBackdrop />);

    expect(() => view.unmount()).not.toThrow();
  });

  describe("przesuw skanujący", () => {
    it("chodzi w ciemnej oprawie kryminalnej", async () => {
      setExpeditionThemeMode("dark", "crime");

      const { queryByTestId } = await render(<HiddenMapBackdrop />);

      expect(queryByTestId("hidden-map-backdrop-sweep", QUERY_HIDDEN)).not.toBeNull();
    });

    it("nie pokazuje się w jasnej — wydruku się nie skanuje", async () => {
      setExpeditionThemeMode("light", "crime");

      const { queryByTestId } = await render(<HiddenMapBackdrop />);

      expect(queryByTestId("hidden-map-backdrop-sweep", QUERY_HIDDEN)).toBeNull();
    });

    it("nie pokazuje się w oprawach bez motywu", async () => {
      setExpeditionThemeMode("dark", "expedition");

      const { queryByTestId } = await render(<HiddenMapBackdrop />);

      expect(queryByTestId("hidden-map-backdrop-sweep", QUERY_HIDDEN)).toBeNull();
    });

    it("znika całkowicie przy ograniczonym ruchu", async () => {
      // Nie zaparkowany w połowie, tylko nierenderowany: zatrzymany jasny pas w
      // poprzek ekranu byłby artefaktem, nie statyczną poświatą.
      mockUseReduceMotion.mockReturnValue(true);
      setExpeditionThemeMode("dark", "crime");

      const { queryByTestId, getByTestId } = await render(<HiddenMapBackdrop />);

      expect(getByTestId("hidden-map-backdrop", QUERY_HIDDEN)).toBeTruthy();
      expect(queryByTestId("hidden-map-backdrop-sweep", QUERY_HIDDEN)).toBeNull();
    });
  });
});
