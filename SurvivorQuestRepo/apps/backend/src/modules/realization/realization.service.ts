import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ScenarioService,
  type ScenarioEntity,
} from '../scenario/scenario.service';
import {
  StationService,
  type StationDraftInput,
  type StationEntity,
  type StationType,
} from '../station/station.service';

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
  teamCount: number;
  requiredDevicesCount: number;
  peopleCount: number;
  positionsCount: number;
  status: RealizationStatus;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  logs: RealizationLog[];
};

export type CreateRealizationPayload = {
  companyName?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors?: unknown;
  type?: RealizationType;
  logoUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  scenarioId?: string;
  teamCount?: number;
  peopleCount?: number;
  positionsCount?: number;
  status?: RealizationStatus;
  scheduledAt?: string;
  changedBy?: string;
  scenarioStations?: unknown;
};

export type UpdateRealizationPayload = CreateRealizationPayload & {
  id?: string;
};

type ScenarioStationDraftPayload = {
  id?: string;
  name?: string;
  type?: StationType;
  description?: string;
  imageUrl?: string;
  points?: number;
  timeLimitSeconds?: number;
  sourceTemplateId?: string;
};

type ValidScenarioStationDraft = {
  id?: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds: number;
  sourceTemplateId?: string;
};

type ScenarioStationDraftsResult =
  | { provided: false; drafts: [] }
  | { provided: true; drafts: ScenarioStationDraftPayload[] }
  | { provided: true; drafts: null };

type SyncScenarioStationsResult =
  | { ok: true; scenario: ScenarioEntity; stations: StationEntity[] }
  | { ok: false; message: string };

const REALIZATION_TYPES: RealizationType[] = [
  'outdoor-games',
  'hotel-games',
  'workshops',
  'evening-attractions',
  'dj',
  'recreation',
];

const REALIZATION_STATUSES: RealizationStatus[] = [
  'planned',
  'in-progress',
  'done',
];

@Injectable()
export class RealizationService {
  private realizations: RealizationEntity[] = this.createInitialRealizations();

  constructor(
    private readonly scenarioService: ScenarioService,
    private readonly stationService: StationService,
  ) {}

  listRealizations() {
    const normalizedRealizations = this.realizations.map((realization) => {
      const resolvedStations = this.resolveRealizationStations(realization);

      return {
        ...realization,
        ...resolvedStations,
        requiredDevicesCount: this.calculateRequiredDevices(realization.teamCount),
        status: this.resolveRealizationStatus(
          realization.status,
          realization.scheduledAt,
        ),
      };
    });

    this.realizations = normalizedRealizations;
    return normalizedRealizations;
  }

  createRealization(payload: CreateRealizationPayload) {
    const companyName =
      typeof payload.companyName === 'string' ? payload.companyName.trim() : '';
    const scenarioId =
      typeof payload.scenarioId === 'string' ? payload.scenarioId.trim() : '';
    const scheduledTimestamp = payload.scheduledAt
      ? new Date(payload.scheduledAt).getTime()
      : NaN;
    const stationDraftsResult = this.readScenarioStationDrafts(
      payload.scenarioStations,
    );
    const validatedStationDrafts =
      stationDraftsResult.provided && stationDraftsResult.drafts
        ? this.validateScenarioStationDrafts(stationDraftsResult.drafts)
        : [];

    const sanitizedContactPerson =
      typeof payload.contactPerson === 'string'
        ? payload.contactPerson.trim()
        : '';
    const sanitizedContactPhone =
      typeof payload.contactPhone === 'string'
        ? payload.contactPhone.trim()
        : '';
    const sanitizedContactEmail =
      typeof payload.contactEmail === 'string'
        ? payload.contactEmail.trim()
        : '';
    const sanitizedInstructors = this.sanitizeInstructors(payload.instructors);
    const teamCount = Number.isFinite(payload.teamCount)
      ? Math.round(payload.teamCount as number)
      : NaN;
    const peopleCount = Number.isFinite(payload.peopleCount)
      ? Math.round(payload.peopleCount as number)
      : NaN;
    const positionsCount = Number.isFinite(payload.positionsCount)
      ? Math.round(payload.positionsCount as number)
      : NaN;

    if (
      !companyName ||
      !sanitizedContactPerson ||
      (!sanitizedContactPhone && !sanitizedContactEmail) ||
      !this.isValidRealizationType(payload.type) ||
      !scenarioId ||
      !Number.isFinite(teamCount) ||
      teamCount < 1 ||
      !Number.isFinite(peopleCount) ||
      peopleCount < 1 ||
      !Number.isFinite(positionsCount) ||
      positionsCount < 1 ||
      !this.isValidRealizationStatus(payload.status) ||
      !payload.scheduledAt ||
      !Number.isFinite(scheduledTimestamp) ||
      (stationDraftsResult.provided && stationDraftsResult.drafts === null) ||
      (stationDraftsResult.provided && validatedStationDrafts === null)
    ) {
      throw new BadRequestException('Invalid payload');
    }

    const realizationId = crypto.randomUUID();
    const clonedScenario = this.scenarioService.cloneScenario(scenarioId, {
      realizationId,
    });

    if (!clonedScenario) {
      throw new BadRequestException('Scenario not found');
    }

    const syncResult = this.syncScenarioStations(
      clonedScenario,
      realizationId,
      stationDraftsResult.provided
        ? this.alignDraftIdsToScenario(
            clonedScenario,
            validatedStationDrafts as ValidScenarioStationDraft[],
          )
        : undefined,
    );

    if (!syncResult.ok) {
      throw new BadRequestException(syncResult.message);
    }

    const nowIso = new Date().toISOString();
    const changedBy = this.getChangedBy(payload.changedBy);
    const nextScheduledAt = new Date(scheduledTimestamp).toISOString();
    const newRealization: RealizationEntity = {
      id: realizationId,
      companyName,
      contactPerson: sanitizedContactPerson,
      contactPhone: sanitizedContactPhone || undefined,
      contactEmail: sanitizedContactEmail || undefined,
      instructors: sanitizedInstructors,
      type: payload.type,
      logoUrl: payload.logoUrl?.trim() || undefined,
      offerPdfUrl: payload.offerPdfUrl?.trim() || undefined,
      offerPdfName: payload.offerPdfName?.trim() || undefined,
      scenarioId: syncResult.scenario.id,
      stationIds: syncResult.stations.map((station) => station.id),
      scenarioStations: syncResult.stations,
      teamCount,
      requiredDevicesCount: this.calculateRequiredDevices(teamCount),
      peopleCount,
      positionsCount,
      status: this.resolveRealizationStatus(payload.status, nextScheduledAt),
      scheduledAt: nextScheduledAt,
      createdAt: nowIso,
      updatedAt: nowIso,
      logs: [this.createLog(changedBy, 'created', 'Utworzono realizację.')],
    };

    this.realizations = [newRealization, ...this.realizations];
    return newRealization;
  }

  updateRealization(payload: UpdateRealizationPayload) {
    const realizationId =
      typeof payload.id === 'string' ? payload.id.trim() : '';
    const companyName =
      typeof payload.companyName === 'string' ? payload.companyName.trim() : '';
    const scenarioId =
      typeof payload.scenarioId === 'string' ? payload.scenarioId.trim() : '';
    const scheduledTimestamp = payload.scheduledAt
      ? new Date(payload.scheduledAt).getTime()
      : NaN;
    const stationDraftsResult = this.readScenarioStationDrafts(
      payload.scenarioStations,
    );
    const validatedStationDrafts =
      stationDraftsResult.provided && stationDraftsResult.drafts
        ? this.validateScenarioStationDrafts(stationDraftsResult.drafts)
        : [];

    const sanitizedContactPerson =
      typeof payload.contactPerson === 'string'
        ? payload.contactPerson.trim()
        : '';
    const sanitizedContactPhone =
      typeof payload.contactPhone === 'string'
        ? payload.contactPhone.trim()
        : '';
    const sanitizedContactEmail =
      typeof payload.contactEmail === 'string'
        ? payload.contactEmail.trim()
        : '';
    const sanitizedInstructors = this.sanitizeInstructors(payload.instructors);
    const teamCount = Number.isFinite(payload.teamCount)
      ? Math.round(payload.teamCount as number)
      : NaN;
    const peopleCount = Number.isFinite(payload.peopleCount)
      ? Math.round(payload.peopleCount as number)
      : NaN;
    const positionsCount = Number.isFinite(payload.positionsCount)
      ? Math.round(payload.positionsCount as number)
      : NaN;

    if (
      !realizationId ||
      !companyName ||
      !sanitizedContactPerson ||
      (!sanitizedContactPhone && !sanitizedContactEmail) ||
      !this.isValidRealizationType(payload.type) ||
      !scenarioId ||
      !Number.isFinite(teamCount) ||
      teamCount < 1 ||
      !Number.isFinite(peopleCount) ||
      peopleCount < 1 ||
      !Number.isFinite(positionsCount) ||
      positionsCount < 1 ||
      !this.isValidRealizationStatus(payload.status) ||
      !payload.scheduledAt ||
      !Number.isFinite(scheduledTimestamp) ||
      (stationDraftsResult.provided && stationDraftsResult.drafts === null) ||
      (stationDraftsResult.provided && validatedStationDrafts === null)
    ) {
      throw new BadRequestException('Invalid payload');
    }

    const realizationIndex = this.realizations.findIndex(
      (realization) => realization.id === realizationId,
    );

    if (realizationIndex < 0) {
      throw new NotFoundException('Realization not found');
    }

    const current = this.realizations[realizationIndex];
    const requestedScenario = this.scenarioService.findScenarioById(scenarioId);

    if (!requestedScenario) {
      throw new BadRequestException('Scenario not found');
    }

    const baseScenario =
      requestedScenario.id === current.scenarioId
        ? this.ensureRealizationScenarioInstance(requestedScenario, current.id)
        : this.scenarioService.cloneScenario(requestedScenario.id, {
            realizationId: current.id,
          });

    if (!baseScenario) {
      throw new BadRequestException('Scenario not found');
    }

    const syncResult = this.syncScenarioStations(
      baseScenario,
      current.id,
      stationDraftsResult.provided
        ? this.alignDraftIdsToScenario(
            baseScenario,
            validatedStationDrafts as ValidScenarioStationDraft[],
          )
        : undefined,
    );

    if (!syncResult.ok) {
      throw new BadRequestException(syncResult.message);
    }

    const changedBy = this.getChangedBy(payload.changedBy);
    const nextScheduledAt = new Date(scheduledTimestamp).toISOString();
    const nextStationIds = syncResult.stations.map((station) => station.id);
    const changes: string[] = [];

    if (current.companyName !== companyName) {
      changes.push('firma');
    }

    if (current.type !== payload.type) {
      changes.push('typ realizacji');
    }

    if (current.contactPerson !== sanitizedContactPerson) {
      changes.push('osoba kontaktowa');
    }

    if ((current.contactPhone ?? '') !== sanitizedContactPhone) {
      changes.push('telefon kontaktowy');
    }

    if ((current.contactEmail ?? '') !== sanitizedContactEmail) {
      changes.push('e-mail kontaktowy');
    }

    if (current.instructors.join('|') !== sanitizedInstructors.join('|')) {
      changes.push('instruktorzy');
    }

    if (current.status !== payload.status) {
      changes.push('status');
    }

    if (current.teamCount !== teamCount) {
      changes.push('liczba drużyn');
    }

    if (current.peopleCount !== peopleCount) {
      changes.push('liczba osób');
    }

    if (current.positionsCount !== positionsCount) {
      changes.push('liczba stanowisk');
    }

    if (current.scheduledAt !== nextScheduledAt) {
      changes.push('termin');
    }

    if (current.scenarioId !== syncResult.scenario.id) {
      changes.push('scenariusz');
    }

    if ((current.logoUrl ?? '') !== (payload.logoUrl?.trim() ?? '')) {
      changes.push('logo');
    }

    if ((current.offerPdfUrl ?? '') !== (payload.offerPdfUrl?.trim() ?? '')) {
      changes.push('oferta PDF');
    }

    if (current.stationIds.join('|') !== nextStationIds.join('|')) {
      changes.push('stanowiska');
    }

    const updatedRealization: RealizationEntity = {
      ...current,
      companyName,
      contactPerson: sanitizedContactPerson,
      contactPhone: sanitizedContactPhone || undefined,
      contactEmail: sanitizedContactEmail || undefined,
      instructors: sanitizedInstructors,
      type: payload.type,
      logoUrl: payload.logoUrl?.trim() || undefined,
      offerPdfUrl: payload.offerPdfUrl?.trim() || undefined,
      offerPdfName: payload.offerPdfName?.trim() || undefined,
      scenarioId: syncResult.scenario.id,
      stationIds: nextStationIds,
      scenarioStations: syncResult.stations,
      teamCount,
      requiredDevicesCount: this.calculateRequiredDevices(teamCount),
      peopleCount,
      positionsCount,
      status: this.resolveRealizationStatus(payload.status, nextScheduledAt),
      scheduledAt: nextScheduledAt,
      updatedAt: new Date().toISOString(),
      logs: [
        ...current.logs,
        this.createLog(
          changedBy,
          'updated',
          changes.length > 0
            ? `Zmieniono: ${changes.join(', ')}.`
            : 'Zapisano bez zmian merytorycznych.',
        ),
      ],
    };

    this.realizations = this.realizations.map((realization) =>
      realization.id === realizationId ? updatedRealization : realization,
    );
    return updatedRealization;
  }

  private resolveRealizationStatus(
    status: RealizationStatus,
    scheduledAt: string,
  ) {
    const scheduledTimestamp = new Date(scheduledAt).getTime();

    if (Number.isFinite(scheduledTimestamp) && scheduledTimestamp < Date.now()) {
      return 'done' as const;
    }

    return status;
  }

  private calculateRequiredDevices(teamCount: number) {
    return teamCount + 2;
  }

  private createLog(
    changedBy: string,
    action: 'created' | 'updated',
    description: string,
  ): RealizationLog {
    return {
      id: crypto.randomUUID(),
      changedBy,
      changedAt: new Date().toISOString(),
      action,
      description,
    };
  }

  private getChangedBy(rawValue?: string) {
    return rawValue?.trim() || 'admin@local';
  }

  private sanitizeInstructors(value: unknown) {
    if (!Array.isArray(value)) {
      return [] as string[];
    }

    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);
  }

  private isValidStationType(value: unknown): value is StationType {
    return value === 'quiz' || value === 'time' || value === 'points';
  }

  private isValidRealizationType(value: unknown): value is RealizationType {
    return (
      typeof value === 'string' &&
      REALIZATION_TYPES.includes(value as RealizationType)
    );
  }

  private isValidRealizationStatus(
    value: unknown,
  ): value is RealizationStatus {
    return (
      typeof value === 'string' &&
      REALIZATION_STATUSES.includes(value as RealizationStatus)
    );
  }

  private readScenarioStationDrafts(value: unknown): ScenarioStationDraftsResult {
    if (typeof value === 'undefined') {
      return { provided: false, drafts: [] };
    }

    if (!Array.isArray(value)) {
      return { provided: true, drafts: null };
    }

    return {
      provided: true,
      drafts: value.map((item) => {
        const draft = (item ?? {}) as ScenarioStationDraftPayload;

        return {
          id: typeof draft.id === 'string' ? draft.id.trim() || undefined : undefined,
          name: typeof draft.name === 'string' ? draft.name : undefined,
          type: draft.type,
          description:
            typeof draft.description === 'string' ? draft.description : undefined,
          imageUrl: typeof draft.imageUrl === 'string' ? draft.imageUrl : undefined,
          points: typeof draft.points === 'number' ? draft.points : undefined,
          timeLimitSeconds:
            typeof draft.timeLimitSeconds === 'number'
              ? draft.timeLimitSeconds
              : undefined,
          sourceTemplateId:
            typeof draft.sourceTemplateId === 'string'
              ? draft.sourceTemplateId.trim() || undefined
              : undefined,
        };
      }),
    };
  }

  private validateScenarioStationDrafts(
    drafts: ScenarioStationDraftPayload[],
  ): ValidScenarioStationDraft[] | null {
    const validated = drafts.map((draft) => {
      const parsedTimeLimit = this.stationService.parseTimeLimitSeconds(
        draft.timeLimitSeconds,
      );

      if (
        !draft.name?.trim() ||
        !this.isValidStationType(draft.type) ||
        !draft.description?.trim() ||
        typeof draft.points !== 'number' ||
        !Number.isFinite(draft.points) ||
        draft.points <= 0 ||
        !parsedTimeLimit.ok
      ) {
        return null;
      }

      return {
        id: draft.id,
        name: draft.name.trim(),
        type: draft.type,
        description: draft.description.trim(),
        imageUrl: draft.imageUrl?.trim() || undefined,
        points: Math.round(draft.points),
        timeLimitSeconds: parsedTimeLimit.value,
        sourceTemplateId: draft.sourceTemplateId,
      };
    });

    if (validated.some((draft) => draft === null)) {
      return null;
    }

    return validated as ValidScenarioStationDraft[];
  }

  private getScenarioStationsOrdered(scenario: ScenarioEntity) {
    return this.stationService.findStationsByIds(scenario.stationIds);
  }

  private scenarioBelongsToRealization(
    scenario: ScenarioEntity,
    realizationId: string,
  ) {
    if (!scenario.sourceTemplateId) {
      return false;
    }

    const stations = this.getScenarioStationsOrdered(scenario);

    if (stations.length === 0) {
      return false;
    }

    return stations.every(
      (station) =>
        station.scenarioInstanceId === scenario.id &&
        station.realizationId === realizationId,
    );
  }

  private ensureRealizationScenarioInstance(
    sourceScenario: ScenarioEntity,
    realizationId: string,
  ): ScenarioEntity | null {
    if (this.scenarioBelongsToRealization(sourceScenario, realizationId)) {
      return sourceScenario;
    }

    return this.scenarioService.cloneScenario(sourceScenario.id, {
      realizationId,
    });
  }

  private syncScenarioStations(
    scenario: ScenarioEntity,
    realizationId: string,
    drafts?: ValidScenarioStationDraft[],
  ): SyncScenarioStationsResult {
    const currentStations = this.getScenarioStationsOrdered(scenario);

    if (!drafts) {
      if (currentStations.length === 0) {
        return { ok: false, message: 'Scenario not found' };
      }

      const currentStationIds = currentStations.map((station) => station.id);

      if (currentStationIds.join('|') !== scenario.stationIds.join('|')) {
        this.scenarioService.replaceScenario({
          ...scenario,
          stationIds: currentStationIds,
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        ok: true,
        scenario: { ...scenario, stationIds: currentStationIds },
        stations: currentStations,
      };
    }

    if (drafts.length === 0) {
      return {
        ok: false,
        message: 'Realization must include at least one station',
      };
    }

    const keptStationIds = new Set<string>();
    const finalStations: StationEntity[] = [];

    for (const draft of drafts) {
      const stationInput: StationDraftInput = {
        name: draft.name,
        type: draft.type,
        description: draft.description,
        imageUrl: draft.imageUrl,
        points: draft.points,
        timeLimitSeconds: draft.timeLimitSeconds,
        sourceTemplateId: draft.sourceTemplateId,
      };

      if (draft.id) {
        const existingStation = this.stationService.findStationById(draft.id);

        if (!existingStation) {
          return { ok: false, message: 'Station not found' };
        }

        if (
          existingStation.scenarioInstanceId !== scenario.id ||
          existingStation.realizationId !== realizationId
        ) {
          return {
            ok: false,
            message: 'Station does not belong to this realization',
          };
        }

        const updatedStation = this.stationService.updateScenarioStationInstance(
          existingStation.id,
          stationInput,
        );

        if (!updatedStation) {
          return { ok: false, message: 'Station not found' };
        }

        keptStationIds.add(updatedStation.id);
        finalStations.push(updatedStation);
        continue;
      }

      const createdStation = this.stationService.createScenarioStationInstance(
        stationInput,
        { scenarioInstanceId: scenario.id, realizationId },
      );
      keptStationIds.add(createdStation.id);
      finalStations.push(createdStation);
    }

    const stationsToRemove = currentStations
      .filter(
        (station) =>
          station.scenarioInstanceId === scenario.id &&
          station.realizationId === realizationId,
      )
      .filter((station) => !keptStationIds.has(station.id))
      .map((station) => station.id);

    if (stationsToRemove.length > 0) {
      this.stationService.removeStationsByIds(stationsToRemove);
    }

    const updatedScenario = this.scenarioService.replaceScenario({
      ...scenario,
      stationIds: finalStations.map((station) => station.id),
      updatedAt: new Date().toISOString(),
    });

    return { ok: true, scenario: updatedScenario, stations: finalStations };
  }

  private alignDraftIdsToScenario(
    scenario: ScenarioEntity,
    drafts: ValidScenarioStationDraft[],
  ) {
    const scenarioStations = this.getScenarioStationsOrdered(scenario);
    const scenarioStationIds = new Set(
      scenarioStations.map((station) => station.id),
    );
    const scenarioStationsBySourceTemplate = new Map<string, string>();

    for (const station of scenarioStations) {
      if (station.sourceTemplateId) {
        scenarioStationsBySourceTemplate.set(station.sourceTemplateId, station.id);
      }
    }

    return drafts.map((draft) => {
      if (!draft.id) {
        return draft;
      }

      if (scenarioStationIds.has(draft.id)) {
        return draft;
      }

      const mappedId = scenarioStationsBySourceTemplate.get(draft.id);

      if (mappedId) {
        return {
          ...draft,
          id: mappedId,
        };
      }

      return {
        ...draft,
        id: undefined,
        sourceTemplateId: draft.sourceTemplateId ?? draft.id,
      };
    });
  }

  private resolveRealizationStations(realization: RealizationEntity) {
    const linkedScenario = this.scenarioService.findScenarioById(
      realization.scenarioId,
    );
    const stationIds = linkedScenario?.stationIds ?? realization.stationIds;
    const stations = this.stationService.findStationsByIds(stationIds);

    return {
      scenarioId: linkedScenario?.id ?? realization.scenarioId,
      stationIds: stations.map((station) => station.id),
      scenarioStations: stations,
    };
  }

  private createInitialRealizations(): RealizationEntity[] {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return [
      {
        id: 'r-1',
        companyName: 'Northwind Sp. z o.o.',
        contactPerson: 'Anna Kowalczyk',
        contactPhone: '+48 501 200 300',
        contactEmail: 'anna.kowalczyk@northwind.pl',
        instructors: ['Michał Krawiec', 'Patryk Lis'],
        type: 'outdoor-games',
        logoUrl: 'https://placehold.co/160x160/18181b/f4f4f5?text=NW',
        offerPdfUrl: 'https://example.com/mock-offers/northwind-offer.pdf',
        offerPdfName: 'Northwind - oferta.pdf',
        scenarioId: 's-1',
        stationIds: ['g-1', 'g-2', 'g-4'],
        scenarioStations: [],
        teamCount: 4,
        requiredDevicesCount: this.calculateRequiredDevices(4),
        peopleCount: 18,
        positionsCount: 4,
        status: 'done',
        scheduledAt: new Date(now - 3 * dayMs).toISOString(),
        createdAt: new Date(now - 6 * dayMs).toISOString(),
        updatedAt: new Date(now - 2 * dayMs).toISOString(),
        logs: [
          {
            id: crypto.randomUUID(),
            changedBy: 'admin@survivorquest.app',
            changedAt: new Date(now - 6 * dayMs).toISOString(),
            action: 'created',
            description: 'Utworzono realizację.',
          },
          {
            id: crypto.randomUUID(),
            changedBy: 'koordynator@survivorquest.app',
            changedAt: new Date(now - 2 * dayMs).toISOString(),
            action: 'updated',
            description: 'Zmieniono status realizacji na zrealizowana.',
          },
        ],
      },
      {
        id: 'r-2',
        companyName: 'Baltic Logistics',
        contactPerson: 'Łukasz Duda',
        contactPhone: '+48 512 111 222',
        contactEmail: 'lukasz.duda@balticlogistics.pl',
        instructors: ['Kamil Brzeziński', 'Paweł Bąk'],
        type: 'hotel-games',
        scenarioId: 's-3',
        stationIds: ['g-2', 'g-3'],
        scenarioStations: [],
        teamCount: 6,
        requiredDevicesCount: this.calculateRequiredDevices(6),
        peopleCount: 24,
        positionsCount: 6,
        status: 'in-progress',
        scheduledAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(now - 2 * dayMs).toISOString(),
        updatedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
        logs: [
          {
            id: crypto.randomUUID(),
            changedBy: 'admin@survivorquest.app',
            changedAt: new Date(now - 2 * dayMs).toISOString(),
            action: 'created',
            description: 'Utworzono realizację.',
          },
        ],
      },
      {
        id: 'r-3',
        companyName: 'Horizon Tech',
        contactPerson: 'Karolina Nowak',
        contactPhone: '+48 698 555 440',
        contactEmail: 'karolina.nowak@horizontech.pl',
        instructors: ['Mateusz Sikora'],
        type: 'workshops',
        scenarioId: 's-1',
        stationIds: ['g-1', 'g-2', 'g-4'],
        scenarioStations: [],
        teamCount: 3,
        requiredDevicesCount: this.calculateRequiredDevices(3),
        peopleCount: 14,
        positionsCount: 3,
        status: 'planned',
        scheduledAt: new Date(now + dayMs).toISOString(),
        createdAt: new Date(now - dayMs).toISOString(),
        updatedAt: new Date(now - dayMs).toISOString(),
        logs: [
          {
            id: crypto.randomUUID(),
            changedBy: 'admin@survivorquest.app',
            changedAt: new Date(now - dayMs).toISOString(),
            action: 'created',
            description: 'Utworzono realizację.',
          },
        ],
      },
    ];
  }
}
