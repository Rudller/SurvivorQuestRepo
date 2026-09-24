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

function renderModal(caseFiles: ExpeditionCaseFile[]) {
  return render(
    <CaseFilesModal
      visible
      caseFiles={caseFiles}
      tasks={TASKS}
      isTabletLayout={false}
      isLightTheme={false}
      onRequestClose={jest.fn()}
    />,
  );
}

describe("CaseFilesModal", () => {
  afterEach(() => {
    setExpeditionThemeMode("dark", "expedition");
  });

  it("pokazuje stan pusty, gdy akt jeszcze nie ma", async () => {
    const { getByText } = await renderModal([]);

    expect(getByText("Akta są jeszcze puste.")).toBeTruthy();
  });

  it("liczy odblokowane dowody w nagłówku", async () => {
    const { getByText } = await renderModal([
      caseFile({ id: "a", locked: false }),
      caseFile({ id: "b", locked: true, title: undefined, body: undefined }),
      caseFile({ id: "c", locked: true, title: undefined, body: undefined }),
    ]);

    expect(getByText("1 z 3")).toBeTruthy();
  });

  it("wypisuje tytuły odblokowanych dowodów", async () => {
    const { getByText } = await renderModal([
      caseFile({ id: "a", kind: "text", title: "Notatka z recepcji" }),
      caseFile({ id: "b", kind: "image", title: "Skan planu piętra", url: "https://t/1.png" }),
      caseFile({ id: "c", kind: "audio", title: "Zeznanie nocnej zmiany", url: "https://t/1.mp3" }),
      caseFile({ id: "d", kind: "dossier", title: "Kartoteka: J. Nowak", fields: [] }),
    ]);

    expect(getByText("Notatka z recepcji")).toBeTruthy();
    expect(getByText("Skan planu piętra")).toBeTruthy();
    expect(getByText("Zeznanie nocnej zmiany")).toBeTruthy();
    expect(getByText("Kartoteka: J. Nowak")).toBeTruthy();
  });

  it("nie zdradza tytułu zablokowanego dowodu i wskazuje stanowisko", async () => {
    const { getByText, queryByText } = await renderModal([
      caseFile({ id: "b", locked: true, title: undefined, body: undefined, unlockStationId: "s-1" }),
    ]);

    expect(queryByText("Notatka z recepcji")).toBeNull();
    expect(getByText("Zabezpieczony 01")).toBeTruthy();
    expect(getByText("Ukończ stanowisko #4")).toBeTruthy();
  });

  it("nie otwiera szczegółu zablokowanego dowodu", async () => {
    const locked = caseFile({
      id: "b",
      locked: true,
      title: undefined,
      body: "treść, która nie powinna istnieć po stronie klienta",
    });
    const { getByTestId, queryByText } = await renderModal([locked]);

    await fireEvent.press(getByTestId("case-file-row-b"));

    expect(queryByText("treść, która nie powinna istnieć po stronie klienta")).toBeNull();
  });

  it("otwiera treść notatki", async () => {
    const { getByTestId, getByText } = await renderModal([caseFile()]);

    await fireEvent.press(getByTestId("case-file-row-c-1"));

    expect(getByText("Treść notatki.")).toBeTruthy();
  });

  it("wypisuje wszystkie pary kartoteki", async () => {
    const { getByTestId, getByText } = await renderModal([
      caseFile({
        id: "d",
        kind: "dossier",
        title: "Kartoteka",
        fields: [
          { label: "Wzrost", value: "181 cm" },
          { label: "Dostęp", value: "POZIOM 3" },
        ],
      }),
    ]);

    await fireEvent.press(getByTestId("case-file-row-d"));

    expect(getByText("Wzrost")).toBeTruthy();
    expect(getByText("181 cm")).toBeTruthy();
    expect(getByText("Dostęp")).toBeTruthy();
    expect(getByText("POZIOM 3")).toBeTruthy();
  });

  it("daje nagraniu przycisk odtwarzania", async () => {
    // Przycisku nie naciskamy: press uruchomiłby leniwy import expo-audio,
    // którego pod jest-expo nie ma.
    const { getByTestId } = await renderModal([
      caseFile({ id: "c", kind: "audio", title: "Zeznanie", url: "https://t/1.mp3" }),
    ]);

    await fireEvent.press(getByTestId("case-file-row-c"));

    expect(getByTestId("case-file-audio-toggle")).toBeTruthy();
  });

  it("wraca z powrotem do listy", async () => {
    const { getByTestId, getByText } = await renderModal([caseFile()]);

    await fireEvent.press(getByTestId("case-file-row-c-1"));
    await fireEvent.press(getByText("Wróć"));

    expect(getByText("1 z 1")).toBeTruthy();
  });
});
