import Link from "next/link";
import { SummaryCard } from "@/shared/components/summary-card";
import { getStatusClass, getStatusLabel } from "@/features/realizations/realization.utils";
import {
  realizationTypeOptions,
  type Realization,
} from "@/features/realizations/types/realization";

const DATE_FORMAT = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function getTypeLabel(realization: Realization) {
  return (
    realizationTypeOptions.find((option) => option.value === realization.type)?.label ??
    realization.type
  );
}

export function DashboardUpcomingList({ realizations }: { realizations: Realization[] }) {
  return (
    <SummaryCard title="Najbliższe realizacje">
      {realizations.length === 0 ? (
        <p className="text-sm text-zinc-400">Brak zaplanowanych realizacji.</p>
      ) : (
        <ul className="space-y-2">
          {realizations.map((realization) => (
            <li key={realization.id}>
              <Link
                href="/realizations"
                className="flex flex-col gap-1 rounded-lg border border-zinc-800/80 p-3 transition-colors hover:border-amber-400/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-zinc-200">
                    {realization.companyName}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {DATE_FORMAT.format(new Date(realization.scheduledAt))} · {getTypeLabel(realization)}
                    {realization.teamCount ? ` · ${realization.teamCount} druż.` : ""}
                  </span>
                </span>
                <span
                  className={`shrink-0 self-start rounded-full border px-2 py-0.5 text-[10px] sm:self-auto ${getStatusClass(realization.status)}`}
                >
                  {getStatusLabel(realization.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}
