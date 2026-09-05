import {
  MOBILE_API_TIMEOUT_ERROR_PREFIX,
  MobileApiHttpError,
} from "../../expedition-stage/api/mobile-session.api";
import { describeRiskQuizError, type RiskQuizErrorText } from "./risk-quiz-error-text";

const TEXT: RiskQuizErrorText = { timeout: "Serwer nie odpowiada", offline: "Brak połączenia" };
const FALLBACK = "Nie udało się zeskanować karty.";

describe("describeRiskQuizError", () => {
  it("names a timeout instead of leaking the internal marker", () => {
    const error = new Error(`${MOBILE_API_TIMEOUT_ERROR_PREFIX}http://10.0.0.5:3001`);

    expect(describeRiskQuizError(error, FALLBACK, TEXT)).toBe("Serwer nie odpowiada");
  });

  // The whole point of this module: a dead network throws a real Error, so the
  // old `error instanceof Error ? error.message : fallback` showed the player
  // React Native's own English string.
  it("never shows the engine's network wording", () => {
    for (const error of [
      new TypeError("Network request failed"),
      new Error("Failed to fetch"),
    ]) {
      expect(describeRiskQuizError(error, FALLBACK, TEXT)).toBe("Brak połączenia");
    }
  });

  it("passes through a message the backend wrote for a human", () => {
    const error = new MobileApiHttpError({
      statusCode: 409,
      code: "STATION_IN_USE",
      message: "Ta stacja jest właśnie zajęta.",
      responseBody: null,
    });

    expect(describeRiskQuizError(error, FALLBACK, TEXT)).toBe("Ta stacja jest właśnie zajęta.");
  });

  it("falls back for anything unexpected rather than leaking it", () => {
    expect(describeRiskQuizError(new Error("Cannot read property 'x' of undefined"), FALLBACK, TEXT)).toBe(
      FALLBACK,
    );
    expect(describeRiskQuizError("not an error at all", FALLBACK, TEXT)).toBe(FALLBACK);
  });
});
