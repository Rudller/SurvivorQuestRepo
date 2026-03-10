import type { StationEntity, StationType } from '../../station/station.service';

export type RealizationStatus = 'planned' | 'in-progress' | 'done';
export type RealizationType =
  | 'outdoor-games'
  | 'hotel-games'
  | 'workshops'
  | 'evening-attractions'
  | 'dj'
  | 'recreation';

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
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  type: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  stationIds: string[];
  scenarioStations: StationEntity[];
  joinCode: string;
  teamCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  logs: RealizationLog[];
};

export type ScenarioStationDraftPayload = {
  id?: string;
  name?: string;
  type?: StationType;
  description?: string;
  imageUrl?: string;
  points?: number;
  timeLimitSeconds?: number;
  latitude?: number;
  longitude?: number;
  sourceTemplateId?: string;
};

export type ValidatedRealizationPayload = {
  companyName: string;
  location?: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  type: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId: string;
  teamCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  changedBy: string;
  stationDrafts?: ScenarioStationDraftPayload[];
};
