import type { RealizationLanguage } from "../onboarding/model/types";

export type UiLanguage = "polish" | "english" | "ukrainian" | "russian";

export function resolveUiLanguage(language: RealizationLanguage | null | undefined): UiLanguage {
  if (language === "english" || language === "ukrainian" || language === "russian") {
    return language;
  }

  if (language === "other") {
    return "english";
  }

  return "polish";
}
