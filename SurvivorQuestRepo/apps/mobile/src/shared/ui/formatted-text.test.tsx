import { StyleSheet, type TextStyle } from "react-native";
import { render } from "@testing-library/react-native";

import { FormattedText, parseInlineRules } from "./intro-text-preview";

// Station descriptions carry **bold**, *italic* and __underline__ markers typed
// in the admin. The markers must never reach the screen as raw characters.

describe("parseInlineRules", () => {
  it("splits bold, italic and underline runs", () => {
    expect(parseInlineRules("a **b** *c* __d__ e")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " " },
      { text: "c", italic: true },
      { text: " " },
      { text: "d", underline: true },
      { text: " e" },
    ]);
  });

  it("leaves unclosed markers as plain text", () => {
    expect(parseInlineRules("cena **50 zł")).toEqual([{ text: "cena **50 zł" }]);
    expect(parseInlineRules("snake_case_name")).toEqual([{ text: "snake_case_name" }]);
  });
});

describe("FormattedText", () => {
  it("renders styled runs without the markers", async () => {
    const view = await render(<FormattedText text={"Znajdź **kod** i __wpisz__ go"} />);

    expect(view.queryByText(/\*\*|__/)).toBeNull();
    const bold = view.getByText("kod");
    const underline = view.getByText("wpisz");
    expect((StyleSheet.flatten(bold.props.style) as TextStyle).fontWeight).toBe("700");
    expect((StyleSheet.flatten(underline.props.style) as TextStyle).textDecorationLine).toBe("underline");
  });
});
