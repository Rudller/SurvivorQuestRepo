import type { RealizationThemePack, RealizationTranslations } from "@/features/realizations/types/realization";

export type Scenario = {
  id: string;
  name: string;
  description: string;
  introText: string;
  gameRules: string;
  /** Tłumaczenia wstępu i zasad; tekst bazowy jest zawsze po polsku. */
  translations?: RealizationTranslations;
  stationIds: string[];
  categories: string[];
  /** Oprawa przepisywana do realizacji; brak = serwer sprzed tej zmiany (standardowa). */
  themePack?: RealizationThemePack;
  sourceTemplateId?: string;
  createdAt: string;
  updatedAt: string;
};
