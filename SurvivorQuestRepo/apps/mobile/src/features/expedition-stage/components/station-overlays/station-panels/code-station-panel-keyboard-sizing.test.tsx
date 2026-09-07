import { Animated, StyleSheet } from "react-native";
import { fireEvent, render, type RenderResult } from "@testing-library/react-native";

import { CodeStationPanel } from "./code-station-panel";
import { createStation } from "./station-smoke.fixtures";

/**
 * Klawiatura alfanumeryczna stanowisk kodowych ("na czas" / "na punkty") sama
 * siebie skalowała: kontener nie ma własnej wysokości — jego wysokość TO są
 * klawisze — a jednocześnie mierzył się przez onLayout i tym pomiarem ustalał
 * rozmiar klawiszy. Wejście funkcji skalującej było jej własnym wyjściem.
 *
 * Dawało to dwa objawy:
 *  - skok przy otwarciu: pierwszy render szedł w rozmiarze preferowanym, bo
 *    pudełko było jeszcze niezmierzone, a po pierwszym onLayout klawisze
 *    zjeżdżały do rozmiaru wyliczonego z pomiaru (46 -> 28 px na telefonie),
 *  - zapadka: `keyHeight_n <= keyHeight_{n-1}` zawsze, więc każdy mniejszy
 *    pomiar zostawał na stałe — klawiatura nie potrafiła odrosnąć, bo jej
 *    własna skurczona treść stawała się "dostępnym miejscem".
 *
 * Rozmiar klawisza musi więc wynikać z rzeczy niezależnych od klawiszy i być
 * ustalony od pierwszego renderu.
 */

const KEYBOARD_TEST_ID = "code-station-keyboard";
const CONTENT_WIDTH = 360;

function renderCodePanel() {
  const station = createStation({ stationType: "time", completionCodeInputMode: "alphanumeric" });

  return render(
    <CodeStationPanel
      station={station}
      availableContentWidth={CONTENT_WIDTH}
      isNumericCodeStation={false}
      isCodeActionDisabled={false}
      verificationCode=""
      isCodeInputInvalid={false}
      isCodeInputSuccess={false}
      codeResult={null}
      isSubmittingCode={false}
      codeInputShakeAnimation={new Animated.Value(0)}
      onBackspaceVerificationCode={jest.fn()}
      onAppendVerificationCode={jest.fn()}
      onSubmitVerificationCode={jest.fn()}
      onResetCodeFeedback={jest.fn()}
    />,
  );
}

type StyledNode = { props: { style?: unknown }; parent: StyledNode | null };

/** Rozmiar klawisza czytany z faktycznie wyrenderowanego Pressable. */
function readKeySize({ getByText }: RenderResult) {
  let node: StyledNode | null = getByText("Q") as unknown as StyledNode;

  while (node) {
    const style = StyleSheet.flatten(node.props.style as never) as { width?: unknown; height?: unknown } | undefined;
    if (style && typeof style.width === "number" && typeof style.height === "number") {
      return { width: style.width, height: style.height };
    }
    node = node.parent;
  }

  throw new Error("Nie znaleziono klawisza z ustalonym rozmiarem");
}

/**
 * Odtwarza to, co robi RN: kontener bez zadanej wysokości mierzy się na
 * wysokość swojej treści, czyli na aktualne klawisze.
 */
async function layoutFromCurrentKeys(result: RenderResult, height?: number) {
  const key = readKeySize(result);
  const rows = 4;
  const rowGap = 8;

  await fireEvent(result.getByTestId(KEYBOARD_TEST_ID), "layout", {
    nativeEvent: { layout: { width: CONTENT_WIDTH, height: height ?? rows * key.height + rowGap * (rows - 1) } },
  });
}

describe("skalowanie klawiatury stanowiska kodowego", () => {
  it("nie zmienia rozmiaru klawiszy po pierwszym pomiarze", async () => {
    const result = await renderCodePanel();
    const beforeLayout = readKeySize(result);

    await layoutFromCurrentKeys(result);

    expect(readKeySize(result)).toEqual(beforeLayout);
  });

  it("nie kurczy się przy kolejnych pomiarach", async () => {
    const result = await renderCodePanel();
    const initial = readKeySize(result);

    for (let pass = 0; pass < 4; pass++) {
      await layoutFromCurrentKeys(result);
    }

    expect(readKeySize(result)).toEqual(initial);
  });

  it("wraca do pełnego rozmiaru, gdy miejsce wraca po chwilowym ściśnięciu", async () => {
    const result = await renderCodePanel();
    const initial = readKeySize(result);

    await layoutFromCurrentKeys(result, 140);
    await layoutFromCurrentKeys(result);

    expect(readKeySize(result)).toEqual(initial);
  });
});
