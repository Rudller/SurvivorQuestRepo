"use client";

import { useState } from "react";
import { useDeleteRiskCategoryMutation, useUpdateRiskCategoryMutation } from "../api/risk-quiz.api";
import {
  RISK_DIFFICULTY_OPTIONS,
  type RiskCategory,
  type RiskCategoryCardCodes,
  type RiskDifficulty,
} from "../types/risk-quiz";
import { PoolStationRow, StationAssignmentForm } from "./risk-category-card";
import { TabStrip, type TabItem } from "@/shared/components/tab-strip";

type EditCategoryModalProps = {
  category: RiskCategory;
  onClose: () => void;
};

export function EditCategoryModal({ category, onClose }: EditCategoryModalProps) {
  const [updateCategory] = useUpdateRiskCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteRiskCategoryMutation();
  const [name, setName] = useState(category.name);
  const [activeDifficulty, setActiveDifficulty] = useState<RiskDifficulty>("EASY");
  const [showAssignForm, setShowAssignForm] = useState(false);

  const tabs: TabItem[] = RISK_DIFFICULTY_OPTIONS.map((option) => ({ id: option.value, label: option.label }));
  const poolStationsForDifficulty = category.poolStations.filter((item) => item.difficulty === activeDifficulty);

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij edycję kategorii"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Kategoria</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => {
                  if (name.trim() && name.trim() !== category.name) {
                    void updateCategory({ categoryId: category.id, name: name.trim() });
                  }
                }}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-lg font-semibold text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
            >
              Zamknij
            </button>
          </div>

          <TabStrip
            tabs={tabs}
            activeId={activeDifficulty}
            onChange={(id) => {
              setActiveDifficulty(id as RiskDifficulty);
              setShowAssignForm(false);
            }}
          />

          {category.cardCodes ? (
            <CardCodePrefixEditor
              // Klucz po poziomie: przełączenie zakładki zaczyna od zapisanego
              // prefiksu tego poziomu, a nie od szkicu z poprzedniej.
              key={`${activeDifficulty}:${category.cardCodes.prefixes[activeDifficulty]}`}
              category={category}
              cardCodes={category.cardCodes}
              difficulty={activeDifficulty}
            />
          ) : null}

          <div className="space-y-2">
            {poolStationsForDifficulty.length === 0 ? (
              <p className="text-xs text-zinc-500">Brak zadań w tej puli.</p>
            ) : (
              poolStationsForDifficulty.map((poolStation) => (
                <PoolStationRow key={poolStation.id} poolStation={poolStation} />
              ))
            )}
          </div>

          {showAssignForm ? (
            <StationAssignmentForm
              categoryId={category.id}
              difficulty={activeDifficulty}
              onDone={() => setShowAssignForm(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAssignForm(true)}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
            >
              + Przypisz zadanie
            </button>
          )}

          <section className="rounded-lg border border-red-900/70 bg-red-950/20 p-3">
            <p className="text-xs uppercase tracking-wider text-red-300">Usuń kategorię</p>
            <p className="mt-2 text-xs text-red-200">
              Usunie kategorię ze wszystkich talii, do których jest przypięta.
            </p>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`Usunąć kategorię „${category.name}”?`)) return;
                await deleteCategory({ categoryId: category.id }).unwrap();
                onClose();
              }}
              disabled={isDeleting}
              className="mt-3 rounded-lg border border-red-700 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting ? "Usuwanie..." : "Usuń kategorię"}
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}

/**
 * Kod QR wydrukowanych kart jednej puli. Edytuje się sam prefiks — numer
 * karty (-1…-N) dopisuje backend, tak jak przy generowaniu. Istnieje, bo
 * nakład kart nie zawsze trzyma się naszego formatu (pierwszy miał "SREDNE"
 * na średnich), a poprawka w kodzie jest tańsza niż przedruk.
 */
function CardCodePrefixEditor({
  category,
  cardCodes,
  difficulty,
}: {
  category: RiskCategory;
  cardCodes: RiskCategoryCardCodes;
  difficulty: RiskDifficulty;
}) {
  const [updateCategory, { isLoading }] = useUpdateRiskCategoryMutation();
  const savedPrefix = cardCodes.prefixes[difficulty];
  const isOverridden = cardCodes.overridden.includes(difficulty);
  const cardsPerPool = cardCodes.cardsPerPool;
  const [prefix, setPrefix] = useState(savedPrefix);
  const [error, setError] = useState<string | null>(null);

  const draft = prefix.trim().toUpperCase().replace(/-+$/, "");
  const isDirty = draft !== savedPrefix;

  async function save(nextPrefix: string) {
    setError(null);
    try {
      await updateCategory({
        categoryId: category.id,
        name: category.name,
        cardCodePrefixes: { [difficulty]: nextPrefix },
      }).unwrap();
    } catch (caught) {
      const message =
        caught && typeof caught === "object" && "data" in caught
          ? (caught as { data?: { error?: { message?: string } } }).data?.error?.message
          : undefined;
      setError(message ?? "Nie udało się zapisać kodu.");
    }
  }

  return (
    <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-zinc-400">Kod QR kart</p>
        <p className="text-[11px] text-zinc-500">
          {isOverridden ? "nadpisany" : "domyślny"} · {cardsPerPool} kart w puli
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={prefix}
          onChange={(event) => setPrefix(event.target.value)}
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm uppercase text-zinc-100 outline-none focus:border-amber-400/80"
        />
        <span className="font-mono text-sm text-zinc-500">-1…-{cardsPerPool}</span>
        <button
          type="button"
          onClick={() => void save(draft)}
          disabled={!isDirty || !draft || isLoading}
          className="rounded-lg border border-amber-500/60 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Zapisywanie..." : "Zapisz kod"}
        </button>
        {isOverridden ? (
          <button
            type="button"
            onClick={() => void save("")}
            disabled={isLoading}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 disabled:opacity-50"
          >
            Przywróć domyślny
          </button>
        ) : null}
      </div>
      <p className="text-[11px] text-zinc-500">
        Musi zgadzać się z tym, co jest zakodowane w QR na wydrukowanej karcie, np.{" "}
        <span className="font-mono text-zinc-400">{draft || savedPrefix}-1</span>. Zmiana przepisuje kody
        kart w realizacjach
        {category.cardCounts ? " tej realizacji" : " korzystających z tej kategorii"}.
      </p>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </section>
  );
}
