import { z } from "zod";
import type { Realization, RealizationExportFile } from "./types/realization";
import { toRealizationStationDraft } from "./components/realization-stations-editor";

const realizationExportDataSchema = z.object({
  companyName: z.string(),
  location: z.string().optional(),
  language: z.enum(["polish", "english", "ukrainian", "russian", "other"]),
  customLanguage: z.string().optional(),
  introText: z.string().optional(),
  gameRules: z.string().optional(),
  contactPerson: z.string(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  instructors: z.array(z.string()),
  type: z.enum(["outdoor-games", "hotel-games", "workshops", "evening-attractions", "dj", "recreation"]),
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
  teamStationNumberingEnabled: z.boolean(),
  timedStationPointsDecayEnabled: z.boolean(),
  hideTaskList: z.boolean(),
  status: z.enum(["planned", "in-progress", "done"]),
  scheduledAt: z.string(),
});

const realizationExportFileSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  realization: realizationExportDataSchema,
  scenarioStations: z.array(z.record(z.string(), z.unknown())),
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
      contactPerson: realization.contactPerson,
      contactPhone: realization.contactPhone,
      contactEmail: realization.contactEmail,
      instructors: realization.instructors,
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
      teamStationNumberingEnabled: realization.teamStationNumberingEnabled,
      timedStationPointsDecayEnabled: realization.timedStationPointsDecayEnabled,
      hideTaskList: realization.hideTaskList,
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

  return {
    schemaVersion: 1,
    exportedAt: result.data.exportedAt,
    realization: result.data.realization,
    scenarioStations: result.data.scenarioStations as RealizationExportFile["scenarioStations"],
  };
}
