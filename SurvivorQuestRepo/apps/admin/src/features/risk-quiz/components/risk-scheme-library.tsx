"use client";

import { useState } from "react";
import {
  useAssignCategoryToSchemeMutation,
  useCreateRiskCategoryMutation,
  useCreateRiskSchemeMutation,
  useDeleteRiskSchemeMutation,
  useGetRiskCategoriesQuery,
  useGetRiskSchemesQuery,
  useRemoveCategoryFromSchemeMutation,
  useRenameRiskSchemeMutation,
} from "../api/risk-quiz.api";
import { CategoryListRow } from "./risk-category-card";
import { EditCategoryModal } from "./edit-category-modal";
import type { RiskCategory, RiskScheme } from "../types/risk-quiz";
import { RiskSchemeQrPanel } from "./risk-scheme-qr-panel";
import { TabStrip, type TabItem } from "@/shared/components/tab-strip";

type SchemeCardProps = {
  scheme: RiskScheme;
  /** Realization-owned decks can't be deleted from here — the realization needs one. */
  allowDelete?: boolean;
  /** When given, each assigned category gets an "edit tasks" button. */
  onEditCategory?: (category: RiskCategory) => void;
};

export function SchemeCard({ scheme, allowDelete = true, onEditCategory }: SchemeCardProps) {
  const { data: allCategories } = useGetRiskCategoriesQuery();
  const [renameScheme] = useRenameRiskSchemeMutation();
  const [deleteScheme, { isLoading: isDeleting }] = useDeleteRiskSchemeMutation();
  const [assignCategory, { isLoading: isAssigning }] = useAssignCategoryToSchemeMutation();
  const [removeCategory] = useRemoveCategoryFromSchemeMutation();
  const [name, setName] = useState(scheme.name);
  const [isQrPanelOpen, setIsQrPanelOpen] = useState(false);
  const [categoryToAdd, setCategoryToAdd] = useState("");

  const assignedCategoryIds = new Set(scheme.schemeCategories.map((item) => item.categoryId));
  const availableCategories = (allCategories ?? []).filter((category) => !assignedCategoryIds.has(category.id));

  async function handleAssign() {
    if (!categoryToAdd) return;
    await assignCategory({ schemeId: scheme.id, categoryId: categoryToAdd }).unwrap();
    setCategoryToAdd("");
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== scheme.name) {
              void renameScheme({ schemeId: scheme.id, name: name.trim() });
            }
          }}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 outline-none focus:border-amber-400/80"
        />
        {allowDelete ? (
          <button
            type="button"
            onClick={() => void deleteScheme({ schemeId: scheme.id })}
            disabled={isDeleting}
            className="shrink-0 rounded-md border border-red-500/40 px-2.5 py-1.5 text-xs text-red-300 transition hover:border-red-400 disabled:opacity-60"
          >
            Usuń talię
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        {scheme.schemeCategories.length === 0 ? (
          <p className="text-xs text-zinc-500">Brak przypisanych kategorii.</p>
        ) : (
          scheme.schemeCategories.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5"
            >
              <div>
                <p className="text-sm text-zinc-100">{item.category.name}</p>
                <p className="text-xs text-zinc-500">{item.category.poolStations.length} zadań w puli</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {onEditCategory ? (
                  <button
                    type="button"
                    onClick={() => onEditCategory(item.category)}
                    className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-200 transition hover:border-zinc-500"
                  >
                    Edytuj zadania
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void removeCategory({ schemeCategoryId: item.id })}
                  className="rounded-md border border-red-500/40 px-2 py-0.5 text-[11px] text-red-300 transition hover:border-red-400"
                >
                  Usuń
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <select
          value={categoryToAdd}
          onChange={(event) => setCategoryToAdd(event.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
        >
          <option value="">— wybierz kategorię do przypisania —</option>
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} ({category.poolStations.length} zadań)
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void handleAssign()}
          disabled={isAssigning || !categoryToAdd}
          className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
        >
          Przypisz
        </button>
      </div>

      {/* The panel mounts only while open: a deck with a few categories is
          already dozens of QR images, and generating them on every library
          render would be wasted work when you are just editing categories. */}
      <div className="border-t border-zinc-800 pt-3">
        <button
          type="button"
          onClick={() => setIsQrPanelOpen(true)}
          disabled={scheme.schemeCategories.length === 0}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 disabled:opacity-50"
        >
          Kody QR do druku
        </button>
      </div>

      {isQrPanelOpen ? (
        <RiskSchemeQrPanel
          schemeId={scheme.id}
          schemeName={scheme.name}
          onClose={() => setIsQrPanelOpen(false)}
        />
      ) : null}
    </div>
  );
}

function CategoriesSection() {
  const { data: categories, isLoading, isError } = useGetRiskCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateRiskCategoryMutation();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<RiskCategory | null>(null);

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    await createCategory({ name: newCategoryName.trim() }).unwrap();
    setNewCategoryName("");
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">Kategorie — pule zadań</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Samodzielne, wielokrotnego użytku banki zadań (np. „Historia”) z pulami wg poziomu trudności. Przypisz do
          nich stanowiska (dowolnego typu — quiz, wordle, hangman...) poniżej, a potem przypnij kategorię do talii.
        </p>
      </div>

      <div className="flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <input
          value={newCategoryName}
          onChange={(event) => setNewCategoryName(event.target.value)}
          placeholder="Nazwa kategorii, np. Historia"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
        />
        <button
          type="button"
          onClick={() => void handleCreateCategory()}
          disabled={isCreating}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
        >
          {isCreating ? "Dodawanie..." : "Dodaj kategorię"}
        </button>
      </div>

      {isLoading && <p className="text-sm text-zinc-400">Ładowanie kategorii...</p>}
      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Nie udało się pobrać kategorii.
        </div>
      )}
      {!isLoading && !isError && categories && categories.length === 0 ? (
        <p className="text-sm text-zinc-500">Brak kategorii. Dodaj pierwszą powyżej.</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {(categories ?? []).map((category) => (
          <CategoryListRow key={category.id} category={category} onEdit={() => setEditingCategory(category)} />
        ))}
      </div>

      {editingCategory ? (
        <EditCategoryModal
          category={categories?.find((item) => item.id === editingCategory.id) ?? editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      ) : null}
    </section>
  );
}

function SchemesSection() {
  const { data: schemes, isLoading, isError } = useGetRiskSchemesQuery();
  const [createScheme, { isLoading: isCreating }] = useCreateRiskSchemeMutation();
  const [newSchemeName, setNewSchemeName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreateScheme() {
    setFormError(null);
    if (!newSchemeName.trim()) {
      setFormError("Podaj nazwę talii.");
      return;
    }
    try {
      await createScheme({ name: newSchemeName.trim() }).unwrap();
      setNewSchemeName("");
    } catch {
      setFormError("Nie udało się utworzyć talii (nazwa może być już zajęta).");
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">Talie</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Talia przypina gotowe kategorie (np. 5 kategorii) — dokładnie jak Scenariusz przypina Stanowiska. Przy
          tworzeniu lub edycji realizacji typu Ryzykanci wybierzesz jedną talię.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h3 className="text-sm font-semibold text-zinc-100">Nowa talia</h3>
        <div className="flex gap-2">
          <input
            value={newSchemeName}
            onChange={(event) => setNewSchemeName(event.target.value)}
            placeholder="Nazwa talii, np. Standardowy zestaw"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
          />
          <button
            type="button"
            onClick={() => void handleCreateScheme()}
            disabled={isCreating}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {isCreating ? "Tworzenie..." : "Utwórz talię"}
          </button>
        </div>
        {formError ? <p className="text-xs text-red-300">{formError}</p> : null}
      </div>

      {isLoading && <p className="text-sm text-zinc-400">Ładowanie talii...</p>}
      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Nie udało się pobrać talii.
        </div>
      )}
      {!isLoading && !isError && schemes && schemes.length === 0 ? (
        <p className="text-sm text-zinc-500">Brak talii. Utwórz pierwszą powyżej.</p>
      ) : null}

      <div className="space-y-4">
        {(schemes ?? []).map((scheme) => (
          <SchemeCard key={scheme.id} scheme={scheme} />
        ))}
      </div>
    </section>
  );
}

export function RiskSchemeLibrary() {
  const [activeTab, setActiveTab] = useState<"schemes" | "categories">("schemes");
  const tabs: TabItem[] = [
    { id: "schemes", label: "Talie" },
    { id: "categories", label: "Kategorie" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Ryzykanci</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Najpierw zbuduj kategorie (pule zadań), potem złóż z nich talię do przypisania w realizacji.
        </p>
      </div>

      <TabStrip tabs={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as "schemes" | "categories")} />

      {activeTab === "schemes" ? <SchemesSection /> : <CategoriesSection />}
    </div>
  );
}
