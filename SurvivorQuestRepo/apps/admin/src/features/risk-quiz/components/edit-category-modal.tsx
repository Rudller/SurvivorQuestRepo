"use client";

import { useState } from "react";
import { useDeleteRiskCategoryMutation, useUpdateRiskCategoryMutation } from "../api/risk-quiz.api";
import { RISK_DIFFICULTY_OPTIONS, type RiskCategory, type RiskDifficulty } from "../types/risk-quiz";
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
