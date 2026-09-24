import type { RiskScheme } from "../types/risk-quiz";
import { RiskCategoryPoolCounts, RiskDeckSummary } from "./risk-deck-summary";

/**
 * Talia wybrana w dropdownie, ale jeszcze niezapisana. Tylko do odczytu:
 * to szablon z biblioteki, a edycja zadań musi iść na kopii realizacji,
 * która powstaje dopiero przy zapisie — edytowanie tu zmieniałoby bibliotekę.
 */
export function RiskDeckPreview({ scheme }: { scheme: RiskScheme }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <p className="text-xs text-amber-100">
          Podgląd talii <strong>{scheme.name}</strong>. Po zapisaniu zostanie skopiowana do tej realizacji i dopiero
          wtedy będzie można edytować jej zadania.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <RiskDeckSummary scheme={scheme} />
        <div className="space-y-2">
          {scheme.schemeCategories.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5">
              <p className="text-sm text-zinc-100">{item.category.name}</p>
              <RiskCategoryPoolCounts category={item.category} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
