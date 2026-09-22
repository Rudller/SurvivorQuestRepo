import {
  realizationTypeOptions,
  type Realization,
  type RealizationType,
} from "@/features/realizations/types/realization";

/**
 * Przegląd biznesowy liczony po stronie panelu z listy `GET /realizations`,
 * którą ekran główny i tak pobiera. Backend nie ma endpointu agregującego i
 * przy obecnej skali (dziesiątki realizacji) nie ma powodu go dokładać —
 * gdyby lista urosła do setek, to jest miejsce na `GET /realizations/summary`.
 */

const MONTH_LABELS = [
  "sty",
  "lut",
  "mar",
  "kwi",
  "maj",
  "cze",
  "lip",
  "sie",
  "wrz",
  "paź",
  "lis",
  "gru",
];

const MONTHS_ON_CHART = 12;

export type MonthBucket = {
  key: string;
  label: string;
  count: number;
  /** 0–100 względem najwyższego słupka, nie względem sumy. */
  heightPercent: number;
  isCurrent: boolean;
};

export type FormatShare = {
  type: RealizationType;
  label: string;
  count: number;
  sharePercent: number;
};

export type BusinessSummary = {
  monthLabel: string;
  eventsThisMonth: number;
  peopleThisMonth: number;
  teamsThisMonth: number;
  months: MonthBucket[];
  formats: FormatShare[];
  totalEvents: number;
};

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getTypeLabel(type: RealizationType) {
  return realizationTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function buildBusinessSummary(
  realizations: Realization[] | undefined,
  now: number,
): BusinessSummary {
  const reference = new Date(now);
  const currentKey = toMonthKey(reference);

  const monthKeys: { key: string; label: string }[] = [];
  for (let offset = MONTHS_ON_CHART - 1; offset >= 0; offset -= 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth() - offset, 1);
    monthKeys.push({ key: toMonthKey(date), label: MONTH_LABELS[date.getMonth()] });
  }

  const countsByMonth = new Map<string, number>();
  const countsByType = new Map<RealizationType, number>();
  let eventsThisMonth = 0;
  let peopleThisMonth = 0;
  let teamsThisMonth = 0;

  for (const realization of realizations ?? []) {
    const scheduled = new Date(realization.scheduledAt);
    if (!Number.isFinite(scheduled.getTime())) {
      continue;
    }

    const key = toMonthKey(scheduled);
    countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
    countsByType.set(realization.type, (countsByType.get(realization.type) ?? 0) + 1);

    if (key === currentKey) {
      eventsThisMonth += 1;
      peopleThisMonth += realization.peopleCount ?? 0;
      teamsThisMonth += realization.teamCount ?? 0;
    }
  }

  const rawMonths = monthKeys.map((month) => ({
    ...month,
    count: countsByMonth.get(month.key) ?? 0,
    isCurrent: month.key === currentKey,
  }));

  const tallest = rawMonths.reduce((max, month) => Math.max(max, month.count), 0);
  const months = rawMonths.map((month) => ({
    ...month,
    heightPercent: tallest > 0 ? Math.round((month.count / tallest) * 100) : 0,
  }));

  const totalEvents = realizations?.length ?? 0;
  const formats = [...countsByType.entries()]
    .map(([type, count]) => ({
      type,
      label: getTypeLabel(type),
      count,
      sharePercent: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
    }))
    .sort((left, right) => right.count - left.count);

  return {
    monthLabel: reference.toLocaleDateString("pl-PL", { month: "long", year: "numeric" }),
    eventsThisMonth,
    peopleThisMonth,
    teamsThisMonth,
    months,
    formats,
    totalEvents,
  };
}
