import type { RiskPigType } from '@prisma/client';
import type {
  StationEntity,
  StationQuiz,
  StationTranslations,
  StationType,
} from '../../station/station.service';

export type RealizationStatus = 'planned' | 'in-progress' | 'done';
export type RealizationType =
  | 'outdoor-games'
  | 'hotel-games'
  | 'workshops'
  | 'evening-attractions'
  | 'dj'
  | 'recreation'
  | 'risk-quiz';
export type RealizationLanguage =
  | 'polish'
  | 'english'
  | 'ukrainian'
  | 'russian'
  | 'other';

export type RealizationTranslation = {
  introText?: string;
  gameRules?: string;
};

export type RealizationTranslations = Partial<
  Record<RealizationLanguage, RealizationTranslation>
>;

export type RealizationLog = {
  id: string;
  changedBy: string;
  changedAt: string;
  action: 'created' | 'updated';
  description: string;
};

export type RealizationEntity = {
  id: string;
  companyName: string;
  location?: string;
  language: RealizationLanguage;
  customLanguage?: string;
  introText?: string;
  gameRules?: string;
  translations?: RealizationTranslations;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  notes?: string;
  type: RealizationType;
  logoUrl?: string;
  hideMap: boolean;
  mapImageUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string | null;
  scenarioTemplateId?: string;
  scenarioTemplateName?: string;
  riskSchemeId?: string;
  riskSchemeTemplateId?: string;
  stationIds: string[];
  scenarioStations: StationEntity[];
  joinCode: string;
  teamCount: number;
  requiredDevicesCount: number;
  peopleCount: number;
  positionsCount: number;
  durationMinutes: number;
  locationRequired: boolean;
  showLeaderboard: boolean;
  showLeaderboardDuringGame: boolean;
  showLeaderboardOnFinish: boolean;
  hideLeaderboardMinutesBeforeEnd: number;
  teamStationNumberingEnabled: boolean;
  timedStationPointsDecayEnabled: boolean;
  hideTaskList: boolean;
  riskChatEnabled: boolean;
  riskChatTeamsCanPost: boolean;
  pigsEnabled: boolean;
  pigGrantIntervalMinutes: number;
  pigEffectSeconds: number;
  pigShowThrowerName: boolean;
  pigTypesEnabled: RiskPigType[];
  status: RealizationStatus;
  scheduledAt: string;
  // When the organiser actually pressed start, as opposed to the planned slot
  // in `scheduledAt`. Null until they do.
  startedAt: string | null;
  createdAt: string;
  updatedAt: string;
  logs: RealizationLog[];
};

export type ScenarioStationDraftPayload = {
  id?: string;
  name?: string;
  type?: StationType;
  categories?: string[];
  description?: string;
  imageUrl?: string;
  points?: number;
  timeLimitSeconds?: number;
  completionCode?: string;
  qrEntryCode?: string;
  qrScanCodes?: string[];
  quiz?: StationQuiz;
  translations?: StationTranslations;
  challengeDifficultyMode?: 'admin' | 'player';
  challengeDifficulty?: 'easy' | 'medium' | 'hard';
  completionStopwatchEnabled?: boolean;
  allowConcurrentTeams?: boolean;
  fastestCompletionBonusPoints?: number;
  color?: string;
  latitude?: number;
  longitude?: number;
  sourceTemplateId?: string;
};

export type PointsQrCodeDraftPayload = {
  points?: number;
  label?: string;
  code?: string;
  claimMode?: 'PER_TEAM' | 'FIRST_TEAM';
};

export type ValidatedRealizationPayload = {
  companyName: string;
  location?: string;
  language: RealizationLanguage;
  customLanguage?: string;
  introText?: string;
  gameRules?: string;
  translations?: RealizationTranslations;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  notes?: string;
  type: RealizationType;
  logoUrl?: string;
  hideMap: boolean;
  mapImageUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  riskSchemeId?: string;
  teamCount: number;
  peopleCount: number;
  positionsCount: number;
  durationMinutes: number;
  showLeaderboard: boolean;
  showLeaderboardDuringGame: boolean;
  showLeaderboardOnFinish: boolean;
  hideLeaderboardMinutesBeforeEnd: number;
  teamStationNumberingEnabled: boolean;
  timedStationPointsDecayEnabled: boolean;
  hideTaskList: boolean;
  riskChatEnabled: boolean;
  riskChatTeamsCanPost: boolean;
  pigsEnabled: boolean;
  pigGrantIntervalMinutes: number;
  pigEffectSeconds: number;
  pigShowThrowerName: boolean;
  pigTypesEnabled?: RiskPigType[];
  status: RealizationStatus;
  scheduledAt: string;
  changedBy: string;
  stationDrafts?: ScenarioStationDraftPayload[];
  pointsQrCodeDrafts?: PointsQrCodeDraftPayload[];
};
