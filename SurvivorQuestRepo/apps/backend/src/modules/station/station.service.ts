import { Injectable, NotFoundException } from '@nestjs/common';

export type StationType = 'quiz' | 'time' | 'points';

export type StationEntity = {
  id: string;
  name: string;
  type: StationType;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  sourceTemplateId?: string;
  scenarioInstanceId?: string;
  realizationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StationDraftInput = {
  name: string;
  type: StationType;
  description: string;
  imageUrl?: string;
  points: number;
  timeLimitSeconds: number;
  sourceTemplateId?: string;
};

export type ParseTimeLimitResult =
  | { ok: true; value: number }
  | { ok: false; value: null };

@Injectable()
export class StationService {
  private stations: StationEntity[] = this.createInitialStations();

  parseTimeLimitSeconds(value: unknown): ParseTimeLimitResult {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 600) {
      return { ok: false, value: null };
    }

    return { ok: true, value: Math.round(value) };
  }

  listTemplateStations() {
    return this.stations.filter(
      (station) => !station.scenarioInstanceId && !station.realizationId,
    );
  }

  findStationById(id: string) {
    return this.stations.find((station) => station.id === id) || null;
  }

  findStationsByIds(ids: string[]) {
    return ids
      .map((stationId) => this.findStationById(stationId))
      .filter((station): station is StationEntity => Boolean(station));
  }

  isTemplateStation(station: StationEntity) {
    return !station.scenarioInstanceId && !station.realizationId;
  }

  addTemplateStation(
    station: Omit<
      StationEntity,
      'sourceTemplateId' | 'scenarioInstanceId' | 'realizationId'
    >,
  ) {
    const templateStation: StationEntity = {
      ...station,
      sourceTemplateId: station.id,
      scenarioInstanceId: undefined,
      realizationId: undefined,
    };

    this.stations = [templateStation, ...this.stations];
    return templateStation;
  }

  replaceTemplateStation(updatedStation: StationEntity) {
    this.stations = this.stations.map((station) =>
      station.id === updatedStation.id ? updatedStation : station,
    );
    return updatedStation;
  }

  removeStationById(id: string) {
    const beforeLength = this.stations.length;
    this.stations = this.stations.filter((station) => station.id !== id);

    if (this.stations.length === beforeLength) {
      throw new NotFoundException('Station not found');
    }
  }

  removeStationsByIds(ids: string[]) {
    const idSet = new Set(ids);
    this.stations = this.stations.filter((station) => !idSet.has(station.id));
  }

  cloneStationsForScenario(
    sourceStationIds: string[],
    options?: { scenarioInstanceId?: string; realizationId?: string },
  ) {
    const nowIso = new Date().toISOString();

    const clonedStations = sourceStationIds.flatMap((stationId) => {
      const sourceStation = this.findStationById(stationId);

      if (!sourceStation) {
        return [];
      }

      const clonedStation: StationEntity = {
        ...sourceStation,
        id: crypto.randomUUID(),
        sourceTemplateId: sourceStation.sourceTemplateId ?? sourceStation.id,
        scenarioInstanceId:
          options?.scenarioInstanceId ?? sourceStation.scenarioInstanceId,
        realizationId: options?.realizationId ?? sourceStation.realizationId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      return [clonedStation];
    });

    this.stations = [...clonedStations, ...this.stations];
    return clonedStations;
  }

  createScenarioStationInstance(
    input: StationDraftInput,
    context: { scenarioInstanceId: string; realizationId?: string },
  ) {
    const nowIso = new Date().toISOString();
    const stationId = crypto.randomUUID();
    const normalized = this.normalizeStationDraft(input, stationId);

    const station: StationEntity = {
      id: stationId,
      ...normalized,
      scenarioInstanceId: context.scenarioInstanceId,
      realizationId: context.realizationId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.stations = [station, ...this.stations];
    return station;
  }

  updateScenarioStationInstance(id: string, input: StationDraftInput) {
    const currentStation = this.findStationById(id);

    if (!currentStation) {
      return null;
    }

    const normalized = this.normalizeStationDraft(input, currentStation.id);
    const updatedStation: StationEntity = {
      ...currentStation,
      ...normalized,
      sourceTemplateId: normalized.sourceTemplateId ?? currentStation.sourceTemplateId,
      updatedAt: new Date().toISOString(),
    };

    this.stations = this.stations.map((station) =>
      station.id === id ? updatedStation : station,
    );
    return updatedStation;
  }

  private getFallbackImage(seed: string) {
    return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
  }

  private resolveImageUrl(imageUrl: string | undefined, seed: string) {
    return imageUrl?.trim() || this.getFallbackImage(seed);
  }

  private normalizeStationDraft(input: StationDraftInput, currentId: string) {
    const normalizedName = input.name.trim() || 'Untitled station';

    return {
      name: normalizedName,
      type: input.type,
      description: input.description.trim(),
      imageUrl: this.resolveImageUrl(input.imageUrl, normalizedName || currentId),
      points: Math.round(input.points),
      timeLimitSeconds: Math.round(input.timeLimitSeconds),
      sourceTemplateId: input.sourceTemplateId?.trim() || undefined,
    };
  }

  private createInitialStations() {
    const now = new Date().toISOString();

    return [
      {
        id: 'g-1',
        name: 'Quiz: Podstawy survivalu',
        type: 'quiz' as const,
        description:
          'Stanowisko quizowe z pytaniami o bezpieczeństwo i podstawy przetrwania.',
        imageUrl:
          'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=640&q=80&auto=format&fit=crop',
        points: 100,
        timeLimitSeconds: 300,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'g-2',
        name: 'Na czas: Ewakuacja z lasu',
        type: 'time' as const,
        description:
          'Stanowisko na czas z zadaniami zespołowymi wykonywanymi pod presją minut.',
        imageUrl:
          'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=640&q=80&auto=format&fit=crop',
        points: 180,
        timeLimitSeconds: 420,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'g-3',
        name: 'Na punkty: Mapa i kompas',
        type: 'points' as const,
        description:
          'Stanowisko punktowane za poprawne odnalezienie punktów kontrolnych i współpracę.',
        imageUrl:
          'https://images.unsplash.com/photo-1502920514313-52581002a659?w=640&q=80&auto=format&fit=crop',
        points: 220,
        timeLimitSeconds: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'g-4',
        name: 'Quiz: Alarm nocny',
        type: 'quiz' as const,
        description:
          'Szybki quiz decyzyjny z reakcjami kryzysowymi i priorytetyzacją działań.',
        imageUrl:
          'https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=640&q=80&auto=format&fit=crop',
        points: 130,
        timeLimitSeconds: 240,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'g-5',
        name: 'Na punkty: Strefa taktyczna',
        type: 'points' as const,
        description:
          'Stanowisko punktowane za mini-zadania logiczne i poprawne decyzje zespołowe.',
        imageUrl:
          'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=640&q=80&auto=format&fit=crop',
        points: 160,
        timeLimitSeconds: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }
}
