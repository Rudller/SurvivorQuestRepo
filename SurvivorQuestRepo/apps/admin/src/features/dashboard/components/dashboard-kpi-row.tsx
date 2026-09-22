import Link from "next/link";

export type KpiTile = {
  label: string;
  value: string;
  hint?: string;
  /** Podświetlenie na bursztyn/róż, gdy liczba wymaga reakcji operatora. */
  tone?: "default" | "alert";
  href?: string;
};

const TONE_CLASS: Record<NonNullable<KpiTile["tone"]>, string> = {
  default: "border-zinc-800 bg-zinc-950/50",
  alert: "border-rose-500/40 bg-rose-500/10",
};

const VALUE_CLASS: Record<NonNullable<KpiTile["tone"]>, string> = {
  default: "text-amber-300",
  alert: "text-rose-300",
};

function TileBody({ tile }: { tile: KpiTile }) {
  const tone = tile.tone ?? "default";

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{tile.label}</p>
      <p className={`text-2xl font-semibold sm:text-3xl ${VALUE_CLASS[tone]}`}>{tile.value}</p>
      {tile.hint && <p className="text-xs text-zinc-500">{tile.hint}</p>}
    </>
  );
}

export function DashboardKpiRow({ tiles }: { tiles: KpiTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {tiles.map((tile) => {
        const tone = tile.tone ?? "default";
        const className = `space-y-1 rounded-lg border p-4 ${TONE_CLASS[tone]}`;

        if (tile.href) {
          return (
            <Link
              key={tile.label}
              href={tile.href}
              className={`${className} transition-colors hover:border-amber-400/40`}
            >
              <TileBody tile={tile} />
            </Link>
          );
        }

        return (
          <section key={tile.label} className={className}>
            <TileBody tile={tile} />
          </section>
        );
      })}
    </div>
  );
}
