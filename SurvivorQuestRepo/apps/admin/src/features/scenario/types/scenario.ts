import type { RealizationTranslations } from "@/features/realizations/types/realization";

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
  sourceTemplateId?: string;
  createdAt: string;
  updatedAt: string;
};
