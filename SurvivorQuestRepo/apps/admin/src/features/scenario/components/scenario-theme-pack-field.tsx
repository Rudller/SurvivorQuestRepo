"use client";

import {
  realizationThemePackOptions,
  type RealizationThemePack,
} from "@/features/realizations/types/realization";

type ScenarioThemePackFieldProps = {
  value: RealizationThemePack;
  onChange: (next: RealizationThemePack) => void;
};

/**
 * Oprawa scenariusza. Realizacja tworzona z tego scenariusza dostaje ją jako
 * punkt wyjścia (i przy kryminalnej — włączone akta); potem można ją tam zmienić.
 */
export function ScenarioThemePackField({ value, onChange }: ScenarioThemePackFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-zinc-400">Oprawa</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as RealizationThemePack)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
      >
        {realizationThemePackOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-zinc-500">
        {realizationThemePackOptions.find((option) => option.value === value)?.hint}
        {value === "crime" ? " Akta sprawy dodasz poniżej." : ""}
      </p>
    </label>
  );
}
