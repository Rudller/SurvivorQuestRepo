import { textRole } from "./typography";

describe("role typograficzne", () => {
  it("krój interfejsu jest ten sam we wszystkich oprawach", () => {
    // Montserrat jest krojem produktu — podmiana kroju interfejsu per oprawa
    // zmieniałaby metrykę tekstu, czyli przeliczała layout przy wejściu w
    // realizację. To celowo NIE jest oś oprawy.
    for (const family of ["expedition", "risk", "crime", "christmas"] as const) {
      expect(textRole("body", family).fontFamily).toBe("Montserrat");
      expect(textRole("navigation", family).fontFamily).toBe("Montserrat");
    }
  });

  it("krój ozdobny jest osią oprawy", () => {
    expect(textRole("caseTitle", "crime").fontFamily).toBe("PlayfairDisplay");
    expect(textRole("quote", "crime").fontFamily).toBe("PlayfairDisplay");

    expect(textRole("caseTitle", "expedition").fontFamily).toBe("Montserrat");
    expect(textRole("caseTitle", "risk").fontFamily).toBe("Montserrat");
    expect(textRole("caseTitle", "christmas").fontFamily).toBe("Montserrat");
  });

  it("nie pogrubia Playfaira, bo jest wgrany tylko w jednej wadze", () => {
    // Bez pliku Bold system podstawiłby pogrubienie syntetyczne, które na
    // szeryfach wygląda źle. To jest dokładnie ta pułapka, przez którą warstwa
    // ról w ogóle powstała.
    expect(textRole("caseTitle", "crime").fontWeight).toBe("400");
    expect(textRole("quote", "crime").fontWeight).toBe("400");
  });

  it("żadna rola nie narzuca rozmiaru", () => {
    // Rozmiary należą do adaptiveLayout.fs per miejsce użycia. Gdyby rola
    // zaczęła zwracać fontSize, zderzyłaby się ze skalowaniem adaptacyjnym i
    // po cichu je nadpisała.
    for (const role of ["navigation", "body", "bodyStrong", "caseTitle", "quote", "mono"] as const) {
      expect(textRole(role)).not.toHaveProperty("fontSize");
    }
  });

  it("nawigacja niesie rozstrzelenie", () => {
    expect(textRole("navigation").letterSpacing).toBeGreaterThan(1);
  });
});
