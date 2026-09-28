"use client";

import { useState } from "react";

interface ScenarioCategoriesFieldProps {
  categories: string[];
  onChange: (categories: string[]) => void;
}

/** Tagi scenariusza — ten sam wzorzec co „Kategorie" w formularzu stanowiska. */
export function ScenarioCategoriesField({ categories, onChange }: ScenarioCategoriesFieldProps) {
  const [categoryInput, setCategoryInput] = useState("");

  function addCategory() {
    const nextCategory = categoryInput.trim();
    if (!nextCategory) {
      return;
    }

    if (!categories.includes(nextCategory)) {
      onChange([...categories, nextCategory]);
    }
    setCategoryInput("");
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-zinc-400">Kategorie</span>
      <div className="flex gap-2">
        <input
          value={categoryInput}
          onChange={(event) => setCategoryInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            event.preventDefault();
            addCategory();
          }}
          placeholder="Wpisz kategorię i naciśnij Enter"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
        />
        <button
          type="button"
          onClick={addCategory}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
        >
          Dodaj
        </button>
      </div>
      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-200"
            >
              {category}
              <button
                type="button"
                onClick={() => onChange(categories.filter((item) => item !== category))}
                aria-label={`Usuń kategorię ${category}`}
                className="rounded-full text-zinc-400 transition hover:text-zinc-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
