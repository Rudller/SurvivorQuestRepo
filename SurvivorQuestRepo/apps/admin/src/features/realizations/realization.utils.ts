import type { Realization, RealizationStatus } from "./types/realization";

export type RealizationSortField = "company" | "scheduledAt" | "status" | "createdAt";
export type SortDirection = "asc" | "desc";

export function getStatusLabel(status: RealizationStatus) {
  switch (status) {
    case "planned":
      return "Zaplanowana";
    case "in-progress":
      return "W trakcie";
    case "done":
      return "Zrealizowana";
    default:
      return status;
  }
}

export function getStatusClass(status: RealizationStatus) {
  switch (status) {
    case "planned":
      return "border-sky-400/40 bg-sky-500/10 text-sky-300";
    case "in-progress":
      return "border-amber-400/40 bg-amber-500/10 text-amber-300";
    case "done":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
    default:
      return "border-zinc-700 text-zinc-300";
  }
}

export function getStatusOrder(status: RealizationStatus) {
  if (status === "planned") return 0;
  if (status === "in-progress") return 1;
  return 2;
}

export function toDateTimeLocalValue(isoDate: string) {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function toIsoFromDateTimeLocal(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

export function calculateRequiredDevices(teamCount: number) {
  return teamCount + 2;
}

export function getDistinctUsedAssets(
  realizations: Realization[],
  field: "logoUrl" | "mapImageUrl",
): { url: string; label: string }[] {
  const seenUrls = new Set<string>();
  const options: { url: string; label: string }[] = [];

  for (const realization of realizations) {
    const url = realization[field]?.trim();
    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    options.push({ url, label: realization.companyName });
  }

  return options;
}

export function getAssetUsageMap(
  realizations: Realization[],
  field: "logoUrl" | "mapImageUrl",
): Map<string, string[]> {
  const usageByUrl = new Map<string, string[]>();

  for (const realization of realizations) {
    const url = realization[field]?.trim();
    if (!url) {
      continue;
    }

    const companies = usageByUrl.get(url) ?? [];
    companies.push(realization.companyName);
    usageByUrl.set(url, companies);
  }

  return usageByUrl;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
