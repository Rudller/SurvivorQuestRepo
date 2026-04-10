import type { OnboardingSession } from "../../onboarding/model/types";

export type ExpeditionTaskStatus = "todo" | "in-progress" | "done" | "failed";

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type PlayerLocation = MapCoordinate & {
  accuracy?: number;
  speed?: number;
  heading?: number;
  at: string;
};

export type ExpeditionSessionEndReason =
  | "time-expired"
  | "all-tasks-completed"
  | "realization-finished";

export type ExpeditionLeaderboardEntry = {
  position: number;
  teamId: string;
  slotNumber: number;
  name: string;
  color: string | null;
  badgeKey: string | null;
  badgeImageUrl: string | null;
  points: number;
  progressDone: number;
  progressTotal: number;
  progressPercent: number;
};

export type ExpeditionSessionState = {
  realization: {
    id: string;
    companyName: string;
    introText?: string;
    gameRules?: string;
    contactPerson: string;
    contactPhone?: string;
    contactEmail?: string;
    logoUrl?: string;
    type?: string;
    teamCount?: number;
    peopleCount?: number;
    positionsCount?: number;
    instructors: string[];
    status: "planned" | "in-progress" | "done";
    locationRequired: boolean;
    scheduledAt: string;
    durationMinutes: number;
    stations: ExpeditionRealizationStation[];
  };
  team: {
    id: string;
    slotNumber: number;
    name: string | null;
    color: string | null;
    badgeKey: string | null;
    points: number;
    lastLocation: PlayerLocation | null;
  };
  tasks: ExpeditionTask[];
  endState: {
    isEnded: boolean;
    reason: ExpeditionSessionEndReason | null;
    endedAt: string | null;
  };
  leaderboard: {
    updatedAt: string;
    entries: ExpeditionLeaderboardEntry[];
  };
  meta: {
    sessionExpiresAt: string;
    eventLogCount: number;
  };
};

export type ExpeditionTask = {
  stationId: string;
  status: ExpeditionTaskStatus;
  pointsAwarded: number;
  startedAt: string | null;
  finishedAt: string | null;
};

export type ExpeditionStationType =
  | "quiz"
  | "audio-quiz"
  | "time"
  | "points"
  | "wordle"
  | "hangman"
  | "mastermind"
  | "anagram"
  | "caesar-cipher"
  | "memory"
  | "simon"
  | "rebus"
  | "boggle"
  | "mini-sudoku"
  | "matching";

export type ExpeditionStationQuiz = {
  question: string;
  answers: [string, string, string, string];
  correctAnswerIndex: number;
  audioUrl?: string;
};

export type ExpeditionRealizationStation = {
  id: string;
  name: string;
  type: ExpeditionStationType;
  description: string;
  imageUrl: string;
  points: number;
  timeLimitSeconds: number;
  completionCodeInputMode?: "numeric" | "alphanumeric";
  quiz?: ExpeditionStationQuiz;
  latitude?: number;
  longitude?: number;
};

export type StationPinCustomization = {
  icon: string;
  color: string;
};

export type StationPin = {
  stationId: string;
  label: string;
  coordinate: MapCoordinate;
  status: ExpeditionTaskStatus;
  failed?: boolean;
  pointsAwarded: number;
  customization: StationPinCustomization;
};

export const DEFAULT_STATION_PIN_CUSTOMIZATION: StationPinCustomization = {
  icon: "📍",
  color: "#f59e0b",
};

const DEFAULT_STATION_POINTS: Record<string, number> = {
  "g-1": 100,
  "g-2": 180,
  "g-3": 220,
  "g-4": 130,
  "g-5": 160,
};

export function resolveDefaultStationPoints(stationId: string) {
  return DEFAULT_STATION_POINTS[stationId] ?? 100;
}

export function buildInitialSessionState(session: OnboardingSession): ExpeditionSessionState {
  const stationIds = session.realization?.stationIds?.length ? session.realization.stationIds : ["g-1", "g-2", "g-3"];

  return {
    realization: {
      id: session.realization?.id ?? session.realizationId ?? "offline-realization",
      companyName: session.realization?.companyName ?? "Realizacja terenowa",
      introText: session.realization?.introText,
      gameRules: session.realization?.gameRules,
      contactPerson: "",
      contactPhone: undefined,
      contactEmail: undefined,
      logoUrl: undefined,
      type: undefined,
      teamCount: session.realization?.teamCount,
      peopleCount: undefined,
      positionsCount: undefined,
      instructors: [],
      status: session.realization?.status ?? "in-progress",
      locationRequired: session.realization?.locationRequired ?? false,
      scheduledAt: session.realization?.scheduledAt ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      durationMinutes:
        typeof session.realization?.durationMinutes === "number" &&
        Number.isFinite(session.realization.durationMinutes) &&
        session.realization.durationMinutes >= 1
          ? Math.round(session.realization.durationMinutes)
          : 120,
      stations: stationIds.map((stationId) => ({
        id: stationId,
        name: `Stanowisko ${stationId}`,
        type: "quiz",
        description: "Opis stanowiska będzie dostępny po pełnym spięciu danych realizacji.",
        imageUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(stationId)}`,
        points: resolveDefaultStationPoints(stationId),
        timeLimitSeconds: 0,
        latitude: undefined,
        longitude: undefined,
      })),
    },
    team: {
      id: `team-slot-${session.team.slotNumber ?? 1}`,
      slotNumber: session.team.slotNumber ?? 1,
      name: session.team.name || "Drużyna",
      color: session.team.colorKey,
      badgeKey: session.team.icon,
      points: 0,
      lastLocation: null,
    },
    tasks: stationIds.map((stationId) => ({
      stationId,
      status: "todo",
      pointsAwarded: 0,
      startedAt: null,
      finishedAt: null,
    })),
    endState: {
      isEnded: false,
      reason: null,
      endedAt: null,
    },
    leaderboard: {
      updatedAt: new Date().toISOString(),
      entries: [],
    },
    meta: {
      sessionExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      eventLogCount: 0,
    },
  };
}
