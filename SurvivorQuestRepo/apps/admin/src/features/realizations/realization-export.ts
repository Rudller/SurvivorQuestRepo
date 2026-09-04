import { z } from "zod";
import type { Realization, RealizationExportFile } from "./types/realization";
import { toRealizationStationDraft } from "./components/realization-stations-editor";
import {
  RISK_PIG_LABELS,
  type RiskPigType,
} from "@/features/risk-quiz/api/risk-quiz.api";

const realizationExportDataSchema = z.object({
  companyName: z.string(),
  location: z.string().optional(),
  language: z.enum(["polish", "english", "ukrainian", "russian", "other"]),
  customLanguage: z.string().optional(),
  introText: z.string().optional(),
  gameRules: z.string().optional(),
  translations: z
    .record(z.string(), z.object({ introText: z.string().optional(), gameRules: z.string().optional() }))
    .optional(),
  contactPerson: z.string(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  instructors: z.array(z.string()),
  notes: z.string().optional(),
  type: z.enum(["outdoor-games", "hotel-games", "workshops", "evening-attractions", "dj", "recreation", "risk-quiz"]),
  logoUrl: z.string().optional(),
  hideMap: z.boolean(),
  mapImageUrl: z.string().optional(),
  offerPdfUrl: z.string().optional(),
  offerPdfName: z.string().optional(),
  teamCount: z.number(),
  peopleCount: z.number(),
  durationMinutes: z.number(),
  showLeaderboard: z.boolean(),
  showLeaderboardDuringGame: z.boolean(),
  showLeaderboardOnFinish: z.boolean(),
  hideLeaderboardMinutesBeforeEnd: z.number().optional().default(0),
  teamStationNumberingEnabled: z.boolean(),
  timedStationPointsDecayEnabled: z.boolean(),
  hideTaskList: z.boolean(),
  riskChatEnabled: z.boolean(),
  riskChatTeamsCanPost: z.boolean(),
  pigsEnabled: z.boolean(),
  pigGrantIntervalMinutes: z.number(),
  pigEffectSeconds: z.number(),
  pigShowThrowerName: z.boolean(),
  pigTypesEnabled: z.array(z.string()).optional(),
  status: z.enum(["planned", "in-progress", "done"]),
  scheduledAt: z.string(),
});

const stationDraftExportSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.string(),
  categories: z.array(z.string()).optional(),
  description: z.string(),
  imageUrl: z.string(),
  points: z.number(),
  timeLimitSeconds: z.number(),
  completionCode: z.string().optional(),
  qrEntryCode: z.string().optional(),
  qrScanCodes: z.array(z.string()).optional(),
  quiz: z.record(z.string(), z.unknown()).optional(),
  translations: z.record(z.string(), z.unknown()).optional(),
  challengeDifficultyMode: z.string().optional(),
  challengeDifficulty: z.string().optional(),
  completionStopwatchEnabled: z.boolean().optional(),
  allowConcurrentTeams: z.boolean().optional(),
  fastestCompletionBonusPoints: z.number().optional(),
  color: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const realizationExportFileSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  realization: realizationExportDataSchema,
  scenarioStations: z.array(stationDraftExportSchema),
});

function slugifyCompanyName(companyName: string) {
  const slug = companyName
    .toLowerCase()
    .normalize("NFKD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "realizacja";
}

export function buildRealizationExport(realization: Realization): RealizationExportFile {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    realization: {
      companyName: realization.companyName,
      location: realization.location,
      language: realization.language,
      customLanguage: realization.customLanguage,
      introText: realization.introText,
      gameRules: realization.gameRules,
      translations: realization.translations,
      contactPerson: realization.contactPerson,
      contactPhone: realization.contactPhone,
      contactEmail: realization.contactEmail,
      instructors: realization.instructors,
      notes: realization.notes,
      type: realization.type,
      logoUrl: realization.logoUrl,
      hideMap: realization.hideMap,
      mapImageUrl: realization.mapImageUrl,
      offerPdfUrl: realization.offerPdfUrl,
      offerPdfName: realization.offerPdfName,
      teamCount: realization.teamCount,
      peopleCount: realization.peopleCount,
      durationMinutes: realization.durationMinutes,
      showLeaderboard: realization.showLeaderboard,
      showLeaderboardDuringGame: realization.showLeaderboardDuringGame,
      showLeaderboardOnFinish: realization.showLeaderboardOnFinish,
      hideLeaderboardMinutesBeforeEnd: realization.hideLeaderboardMinutesBeforeEnd,
      teamStationNumberingEnabled: realization.teamStationNumberingEnabled,
      timedStationPointsDecayEnabled: realization.timedStationPointsDecayEnabled,
      hideTaskList: realization.hideTaskList,
      riskChatEnabled: realization.riskChatEnabled,
      riskChatTeamsCanPost: realization.riskChatTeamsCanPost,
      pigsEnabled: realization.pigsEnabled,
      pigGrantIntervalMinutes: realization.pigGrantIntervalMinutes,
      pigEffectSeconds: realization.pigEffectSeconds,
      pigShowThrowerName: realization.pigShowThrowerName,
      pigTypesEnabled: realization.pigTypesEnabled,
      status: realization.status,
      scheduledAt: realization.scheduledAt,
    },
    scenarioStations: realization.scenarioStations.map((station) => ({
      ...toRealizationStationDraft(station),
      id: undefined,
    })),
  };
}

export function downloadRealizationExport(realization: Realization) {
  const exportFile = buildRealizationExport(realization);
  const json = JSON.stringify(exportFile, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const link = document.createElement("a");
  link.href = url;
  link.download = `realizacja-${slugifyCompanyName(realization.companyName)}-${datePart}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseRealizationExportFile(raw: unknown): RealizationExportFile | null {
  const result = realizationExportFileSchema.safeParse(raw);
  if (!result.success) {
    return null;
  }

  const { pigTypesEnabled, ...realization } = result.data.realization;

  return {
    schemaVersion: 1,
    exportedAt: result.data.exportedAt,
    realization: {
      ...realization,
      // Kept as a loose string[] in the schema and narrowed here on purpose: a
      // file written by a newer build can name a pig this one has never heard
      // of, and dropping that single entry beats refusing the whole import.
      pigTypesEnabled: pigTypesEnabled?.filter(
        (item): item is RiskPigType => item in RISK_PIG_LABELS,
      ),
    },
    scenarioStations: result.data.scenarioStations as RealizationExportFile["scenarioStations"],
  };
}
