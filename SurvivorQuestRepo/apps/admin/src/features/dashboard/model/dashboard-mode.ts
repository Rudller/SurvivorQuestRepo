import type { CurrentRealizationOverview } from "@/features/current-realization/types/current-realization-overview";

/**
 * W jakim trybie ma się pokazać panel główny.
 *
 * Backend sam wybiera „bieżącą" realizację (`resolveCurrentMobileRealization`:
 * najpierw trwająca, potem najbliższa zaplanowana, na końcu ostatnia przeszła)
 * i sam normalizuje status po upływie czasu (`normalizeStatus` w
 * `apps/backend/src/modules/mobile/mobile.service.ts`). Panel nie powtarza tej
 * logiki — czyta gotowy status.
 */
export type DashboardMode = "live" | "upcoming" | "idle";

export function resolveDashboardMode(
  overview: CurrentRealizationOverview | undefined,
  now: number,
): DashboardMode {
  if (!overview) {
    return "idle";
  }

  if (overview.realization.status === "in-progress") {
    return "live";
  }

  const scheduledAt = new Date(overview.realization.scheduledAt).getTime();
  if (Number.isFinite(scheduledAt) && scheduledAt >= now) {
    return "upcoming";
  }

  return "idle";
}
