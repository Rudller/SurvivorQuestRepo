import type { CurrentRealizationOverview } from "@/features/current-realization/types/current-realization-overview";

/**
 * Wyliczenia dla kokpitu „na żywo”. Wszystko pochodzi z jednej odpowiedzi
 * `GET /mobile/admin/realizations/current` — poza `durationMinutes`, którego
 * ten endpoint nie zwraca, więc czas do końca liczy się dopiero gdy strona
 * poda długość realizacji z listy `GET /realizations`.
 */

type Overview = CurrentRealizationOverview;
type OverviewTeam = Overview["teams"][number];

export type RankedTeam = {
  id: string;
  slotNumber: number;
  name: string;
  color: string | null;
  points: number;
  tasksDone: number;
  tasksTotal: number;
  /** 0–100, gotowe do wstawienia w szerokość paska. */
  progressPercent: number;
  isOffline: boolean;
};

export type StationProgress = {
  stationId: string;
  stationName: string;
  doneTeams: number;
  totalTeams: number;
  progressPercent: number;
};

export type LiveSummary = {
  teamsActive: number;
  teamsTotal: number;
  tasksDone: number;
  tasksTotal: number;
  tasksPercent: number;
  pointsTotal: number;
  ranking: RankedTeam[];
  stations: StationProgress[];
};

/**
 * Drużyny „puste” — bez nazwy, bez urządzenia i bez postępu — to nieobsadzone
 * sloty. Ta sama reguła, co w backendowym `buildRealizationLeaderboard()`,
 * inaczej ranking na panelu pokazywałby wiersze, których na tabletach nie ma.
 */
function isParticipating(team: OverviewTeam) {
  return (
    Boolean(team.name?.trim()) ||
    team.deviceCount > 0 ||
    team.points !== 0 ||
    team.taskStats.done > 0 ||
    team.status !== "unassigned"
  );
}

function toPercent(done: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((done / total) * 100));
}

export function buildLiveSummary(overview: Overview): LiveSummary {
  const teams = overview.teams.filter(isParticipating);

  const tasksDone = teams.reduce((sum, team) => sum + team.taskStats.done, 0);
  const tasksTotal = teams.reduce((sum, team) => sum + team.taskStats.total, 0);

  const ranking = [...teams]
    .sort((left, right) => right.points - left.points || left.slotNumber - right.slotNumber)
    .map((team) => ({
      id: team.id,
      slotNumber: team.slotNumber,
      name: team.name?.trim() || `Drużyna ${team.slotNumber}`,
      color: team.color,
      points: team.points,
      tasksDone: team.taskStats.done,
      tasksTotal: team.taskStats.total,
      progressPercent: toPercent(team.taskStats.done, team.taskStats.total),
      isOffline: team.status === "offline",
    }));

  const stations = overview.realization.stations.map((station) => {
    const doneTeams = teams.filter((team) =>
      team.tasks.some((task) => task.stationId === station.stationId && task.status === "done"),
    ).length;

    return {
      stationId: station.stationId,
      stationName: station.stationName,
      doneTeams,
      totalTeams: teams.length,
      progressPercent: toPercent(doneTeams, teams.length),
    };
  });

  return {
    teamsActive: overview.stats.activeTeams,
    teamsTotal: teams.length,
    tasksDone,
    tasksTotal,
    tasksPercent: toPercent(tasksDone, tasksTotal),
    pointsTotal: overview.stats.pointsTotal,
    ranking,
    stations,
  };
}

/**
 * Ile minut zostało do planowanego końca. `null`, gdy nie znamy długości
 * realizacji albo czas już minął — panel pokazuje wtedy sam status, zamiast
 * ujemnego licznika.
 */
export function getMinutesLeft(
  scheduledAt: string,
  durationMinutes: number | undefined,
  now: number,
): number | null {
  if (!durationMinutes || durationMinutes <= 0) {
    return null;
  }

  const start = new Date(scheduledAt).getTime();
  if (!Number.isFinite(start)) {
    return null;
  }

  const minutesLeft = Math.round((start + durationMinutes * 60_000 - now) / 60_000);
  return minutesLeft > 0 ? minutesLeft : null;
}

export function formatMinutesLeft(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}:${String(rest).padStart(2, "0")} h` : `${rest} min`;
}
