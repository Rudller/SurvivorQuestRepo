import type {
  OnboardingRealizationSummary,
  RealizationLanguage,
  RealizationLanguageOption,
} from "./types";

/**
 * Przepisanie realizacji z bootstrapu do kształtu, który trafia do sesji.
 *
 * Wyciągnięte z `completeOnboarding` w realization-onboarding-screen.tsx, bo
 * dokładnie tutaj mieszkał błąd nie do wykrycia testami: mapowanie wypisuje
 * pola jedno po drugim, więc pominięcie któregoś nie jest błędem kompilacji
 * ani nie wywraca żadnego testu — pole po prostu cicho znika. Tak zginął
 * `themePack` i przez to oprawa kryminalna nie działała nigdzie w aplikacji,
 * mimo że backend ją serwował, a admin zapisywał.
 *
 * Jako czysta funkcja daje się przypiąć testem, czego nie dało się zrobić,
 * póki siedziało w ciele trzytysięcznego komponentu.
 */

export type SessionRealizationSource = {
  id: string;
  companyName: string;
  type?: string;
  themePack?: string;
  language?: RealizationLanguage;
  customLanguage?: string;
  availableLanguages?: RealizationLanguageOption[];
  introText?: string;
  gameRules?: string;
  status: "planned" | "in-progress" | "done";
  scheduledAt: string;
  durationMinutes: number;
  locationRequired: boolean;
  showLeaderboard?: boolean;
  showLeaderboardDuringGame?: boolean;
  showLeaderboardOnFinish?: boolean;
  hideLeaderboardMinutesBeforeEnd?: number;
  timedStationPointsDecayEnabled?: boolean;
  hideTaskList?: boolean;
  teamCount: number;
  stationIds: string[];
};

export type BuildSessionRealizationInput = {
  realization: SessionRealizationSource;
  status: "planned" | "in-progress" | "done";
  selectedLanguage?: RealizationLanguage;
  joinCode?: string;
  durationMinutes: number;
  hideLeaderboardMinutesBeforeEnd: number;
};

export function buildSessionRealization({
  realization,
  status,
  selectedLanguage,
  joinCode,
  durationMinutes,
  hideLeaderboardMinutesBeforeEnd,
}: BuildSessionRealizationInput): OnboardingRealizationSummary {
  return {
    id: realization.id,
    companyName: realization.companyName,
    type: realization.type,
    themePack: realization.themePack,
    language: realization.language,
    customLanguage: realization.customLanguage?.trim() || undefined,
    selectedLanguage,
    availableLanguages: realization.availableLanguages ?? [],
    status,
    scheduledAt: realization.scheduledAt,
    durationMinutes,
    joinCode,
    teamCount: realization.teamCount,
    stationIds: realization.stationIds,
    locationRequired: realization.locationRequired,
    showLeaderboard: realization.showLeaderboard !== false,
    showLeaderboardDuringGame:
      realization.showLeaderboardDuringGame ?? realization.showLeaderboard !== false,
    showLeaderboardOnFinish:
      realization.showLeaderboardOnFinish ?? realization.showLeaderboard !== false,
    hideLeaderboardMinutesBeforeEnd,
    timedStationPointsDecayEnabled: realization.timedStationPointsDecayEnabled ?? false,
    hideTaskList: realization.hideTaskList ?? false,
    introText: realization.introText?.trim() || undefined,
    gameRules: realization.gameRules?.trim() || undefined,
  };
}
