import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";
import type { UiLanguage } from "./ui-language";

const UiLanguageContext = createContext<UiLanguage>("polish");

type UiLanguageProviderProps = PropsWithChildren<{
  language: UiLanguage;
}>;

export function UiLanguageProvider({ language, children }: UiLanguageProviderProps) {
  return <UiLanguageContext.Provider value={language}>{children}</UiLanguageContext.Provider>;
}

export function useUiLanguage() {
  return useContext(UiLanguageContext);
}
