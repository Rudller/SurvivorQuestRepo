"use client";

import { useState } from "react";
import { useGetRealizationRiskSchemeQuery } from "../api/risk-quiz.api";
import { SchemeCard } from "./risk-scheme-library";
import { EditCategoryModal } from "./edit-category-modal";
import type { RiskCategory } from "../types/risk-quiz";

type RealizationRiskDeckEditorProps = {
  realizationId: string;
};

/**
 * Full deck editor scoped to one realization.
 *
 * The deck it edits is the realization's OWN clone — fetching it is what adopts
 * a shared template into a private copy (see cloneSchemeForRealization on the
 * backend), so nothing changed here can leak into another realization or back
 * into the library on /risk-quiz.
 */
export function RealizationRiskDeckEditor({
  realizationId,
}: RealizationRiskDeckEditorProps) {
  const {
    data: scheme,
    isLoading,
    isError,
  } = useGetRealizationRiskSchemeQuery({ realizationId });
  const [editingCategory, setEditingCategory] = useState<RiskCategory | null>(
    null,
  );

  if (isLoading) {
    return <p className="text-sm text-zinc-400">Ładowanie talii realizacji...</p>;
  }

  if (isError || !scheme) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Nie udało się wczytać talii tej realizacji. Upewnij się, że talia jest
        wybrana i zapisana.
      </div>
    );
  }

  // The modal renders from the freshly-fetched copy so pool edits show up
  // immediately, falling back to the row we opened it with.
  const editingCategoryLive =
    scheme.schemeCategories.find(
      (item) => item.categoryId === editingCategory?.id,
    )?.category ?? editingCategory;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <p className="text-xs text-emerald-100">
          To jest <strong>własna kopia talii</strong> tej realizacji. Zmiany
          nazwy, kategorii i zadań dotyczą wyłącznie tej realizacji — biblioteka
          w zakładce „Ryzykanci” i pozostałe realizacje zostają nietknięte.
        </p>
      </div>

      <SchemeCard
        scheme={scheme}
        allowDelete={false}
        onEditCategory={(category) => setEditingCategory(category)}
      />

      {editingCategoryLive ? (
        <EditCategoryModal
          category={editingCategoryLive}
          onClose={() => setEditingCategory(null)}
        />
      ) : null}
    </div>
  );
}
