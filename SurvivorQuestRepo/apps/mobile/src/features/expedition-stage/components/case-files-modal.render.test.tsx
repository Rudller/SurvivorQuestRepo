import { fireEvent, render } from "@testing-library/react-native";

import { setExpeditionThemeMode } from "../../onboarding/model/constants";
import type { ExpeditionCaseFile, ExpeditionTask } from "../model/types";
import { CaseFilesModal } from "./case-files-modal";

/**
 * Modal sterowany propem `visible` — konwencja repo: komponenty modalne testuje
 * się w izolacji, nigdy przez klikanie przycisku na ekranie rozgrywki.
 */

function caseFile(overrides: Partial<ExpeditionCaseFile> = {}): ExpeditionCaseFile {
  return {
    id: "c-1",
    kind: "text",
    locked: false,
    order: 0,
    unlockStationId: null,
    title: "Notatka z recepcji",
    body: "Treść notatki.",
    ...overrides,
  };
}

const TASKS: ExpeditionTask[] = [
  {
    stationId: "s-1",
    stationNumber: 4,
    status: "todo",
    pointsAwarded: 0,
    startedAt: null,
    finishedAt: null,
  },
];

function renderModal(caseFiles: ExpeditionCaseFile[], { isTabletLayout = false } = {}) {
  return render(
    <CaseFilesModal
      visible
      caseFiles={caseFiles}
      tasks={TASKS}
      isTabletLayout={isTabletLayout}
      isLightTheme={false}
      onRequestClose={jest.fn()}
    />,
  );
}

const locked = (overrides: Partial<ExpeditionCaseFile> = {}) =>
  caseFile({ locked: true, title: undefined, body: undefined, ...overrides });

describe("CaseFilesModal", () => {
  afterEach(() => {
    setExpeditionThemeMode("dark", "expedition");
  });

  it("pokazuje stan pusty, gdy poszlak jeszcze nie ma", async () => {
    const { getByText } = await renderModal([]);

    expect(getByText("Nie ma jeszcze żadnych poszlak.")).toBeTruthy();
  });

  it("nazywa okno „Poszlaki”", async () => {
    const { getByText } = await renderModal([caseFile()]);

    expect(getByText("Poszlaki")).toBeTruthy();
  });

  it("pod tytułem ma wskazówkę zamiast licznika „X z Y”", async () => {
    const { getByText, queryByText } = await renderModal([
      caseFile({ id: "a" }),
      locked({ id: "b", order: 1 }),
      locked({ id: "c", order: 2 }),
    ]);

    expect(getByText("Zebrane dowody w sprawie — przesuwajcie karty w bok.")).toBeTruthy();
    expect(queryByText("1 z 3")).toBeNull();
  });

  it("od razu pokazuje treść każdej odblokowanej poszlaki — bez klikania", async () => {
    const { getByText } = await renderModal([
      caseFile({ id: "a", title: "Notatka z recepcji", body: "Treść notatki.", order: 0 }),
      caseFile({
        id: "d",
        kind: "dossier",
        title: "Kartoteka: J. Nowak",
        fields: [
          { label: "Wzrost", value: "181 cm" },
          { label: "Dostęp", value: "POZIOM 3" },
        ],
        order: 1,
      }),
    ]);

    expect(getByText("Notatka z recepcji")).toBeTruthy();
    expect(getByText("Treść notatki.")).toBeTruthy();
    expect(getByText("Kartoteka: J. Nowak")).toBeTruthy();
    expect(getByText("Wzrost")).toBeTruthy();
    expect(getByText("181 cm")).toBeTruthy();
    expect(getByText("POZIOM 3")).toBeTruthy();
  });

  it("zablokowana karta nie zdradza treści i wskazuje stanowisko", async () => {
    const { getByText, queryByText } = await renderModal([
      locked({ id: "b", unlockStationId: "s-1", body: "treść, która nie powinna istnieć po stronie klienta" }),
    ]);

    expect(queryByText("Notatka z recepcji")).toBeNull();
    expect(queryByText("treść, która nie powinna istnieć po stronie klienta")).toBeNull();
    expect(getByText("Zabezpieczony 01")).toBeTruthy();
    expect(getByText("Ukończ stanowisko #4")).toBeTruthy();
  });

  it("daje nagraniu przycisk odtwarzania", async () => {
    // Przycisku nie naciskamy: press uruchomiłby leniwy import expo-audio,
    // którego pod jest-expo nie ma.
    const { getByTestId } = await renderModal([
      caseFile({ id: "c", kind: "audio", title: "Zeznanie", url: "https://t/1.mp3" }),
    ]);

    expect(getByTestId("case-file-audio-toggle")).toBeTruthy();
  });

  it("otwiera się na pierwszej odblokowanej poszlace", async () => {
    const { getByTestId } = await renderModal([
      locked({ id: "a", order: 0 }),
      caseFile({ id: "b", order: 1 }),
      caseFile({ id: "c", order: 2 }),
    ]);

    expect(getByTestId("case-files-position").props.children).toBe("2 / 3");
  });

  it("strzałki przesuwają na następną i poprzednią kartę, nie wychodząc poza zakres", async () => {
    const { getByTestId } = await renderModal([
      caseFile({ id: "a", order: 0 }),
      caseFile({ id: "b", order: 1 }),
    ]);

    await fireEvent.press(getByTestId("case-files-next"));
    expect(getByTestId("case-files-position").props.children).toBe("2 / 2");

    await fireEvent.press(getByTestId("case-files-next"));
    expect(getByTestId("case-files-position").props.children).toBe("2 / 2");

    await fireEvent.press(getByTestId("case-files-prev"));
    expect(getByTestId("case-files-position").props.children).toBe("1 / 2");
  });

  it("na tablecie ma ten sam układ kart", async () => {
    const { getByText, getByTestId } = await renderModal(
      [caseFile({ id: "a", body: "Słyszałam kłótnię." })],
      { isTabletLayout: true },
    );

    expect(getByTestId("case-file-card-a")).toBeTruthy();
    expect(getByText("Słyszałam kłótnię.")).toBeTruthy();
  });
});
