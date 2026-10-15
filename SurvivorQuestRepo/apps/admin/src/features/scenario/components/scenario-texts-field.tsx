"use client";

import { useState } from "react";
import { useTranslateRealizationTextsMutation } from "@/features/realizations/api/realization.api";
import {
  getRealizationLanguageFlag,
  getRealizationLanguageLabel,
  type RealizationLanguage,
  type RealizationTranslations,
} from "@/features/realizations/types/realization";

export type ScenarioTexts = {
  introText: string;
  gameRules: string;
  translations: RealizationTranslations;
};

type ScenarioTextsFieldProps = {
  value: ScenarioTexts;
  // Updater form: the auto-translate result lands after an await, and must
  // apply on top of whatever was typed meanwhile, not on a stale snapshot.
  onChange: (update: (prev: ScenarioTexts) => ScenarioTexts) => void;
};

// Scenario base texts are always Polish; "other" is left out because a
// scenario has no custom-language name to go with it.
const BASE_LANGUAGE: RealizationLanguage = "polish";
const EDITABLE_LANGUAGES: RealizationLanguage[] = ["polish", "english", "ukrainian", "russian"];

const textareaClassName =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80";

export function ScenarioTextsField({ value, onChange }: ScenarioTextsFieldProps) {
  const [editingLanguage, setEditingLanguage] = useState<RealizationLanguage>(BASE_LANGUAGE);
  const [message, setMessage] = useState<string | null>(null);
  const [translateTexts, { isLoading: isTranslating }] = useTranslateRealizationTextsMutation();

  const isBase = editingLanguage === BASE_LANGUAGE;
  const introText = isBase ? value.introText : (value.translations[editingLanguage]?.introText ?? "");
  const gameRules = isBase ? value.gameRules : (value.translations[editingLanguage]?.gameRules ?? "");

  function updateField(field: "introText" | "gameRules", nextValue: string) {
    if (isBase) {
      onChange((prev) => ({ ...prev, [field]: nextValue }));
      return;
    }

    const language = editingLanguage;
    onChange((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [language]: { ...prev.translations[language], [field]: nextValue },
      },
    }));
  }

  async function handleAutoTranslate() {
    if (isBase) {
      return;
    }

    // Full pass from Polish that overwrites the target, same as the
    // realization editor: a stale translation is worse than none.
    const fields: Array<"introText" | "gameRules"> = [];
    const texts: string[] = [];
    if (value.introText.trim()) {
      fields.push("introText");
      texts.push(value.introText);
    }
    if (value.gameRules.trim()) {
      fields.push("gameRules");
      texts.push(value.gameRules);
    }

    if (texts.length === 0) {
      setMessage("Nie ma czego tłumaczyć — wpisz najpierw tekst wstępu lub zasady gry po polsku.");
      return;
    }

    setMessage(null);
    const targetLanguage = editingLanguage;
    try {
      const response = await translateTexts({
        sourceLanguage: BASE_LANGUAGE,
        targetLanguage,
        texts,
      }).unwrap();

      onChange((prev) => {
        const next = { ...prev.translations[targetLanguage] };
        fields.forEach((field, index) => {
          const translated = response.texts[index]?.trim();
          if (translated) {
            next[field] = translated;
          }
        });
        return { ...prev, translations: { ...prev.translations, [targetLanguage]: next } };
      });
      setMessage(`Przetłumaczono z: ${getRealizationLanguageLabel(BASE_LANGUAGE)} na: ${getRealizationLanguageLabel(targetLanguage)}.`);
    } catch {
      setMessage("Nie udało się przetłumaczyć tekstu. Sprawdź konfigurację auto-tłumacza i spróbuj ponownie.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200">
          <span>Edytowany język</span>
          <select
            value={editingLanguage}
            onChange={(event) => {
              const nextLanguage = EDITABLE_LANGUAGES.find((language) => language === event.target.value);
              if (nextLanguage) {
                setEditingLanguage(nextLanguage);
                setMessage(null);
              }
            }}
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
          >
            {EDITABLE_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {getRealizationLanguageFlag(language)} {getRealizationLanguageLabel(language)}
                {language === BASE_LANGUAGE ? " (podstawowy)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void handleAutoTranslate()}
          disabled={isBase || isTranslating}
          title={isBase ? "Wybierz inny język niż polski, aby przetłumaczyć" : undefined}
          className="rounded-md border border-amber-400/60 px-2.5 py-1 text-xs text-amber-200 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTranslating ? "Tłumaczenie..." : "Auto-tłumacz"}
        </button>
      </div>
      {message && <p className="text-xs text-zinc-400">{message}</p>}

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-zinc-400">Tekst wstępu</span>
        <textarea
          value={introText}
          onChange={(event) => updateField("introText", event.target.value)}
          rows={4}
          placeholder={
            isBase
              ? "Tekst wstępu podpowie się automatycznie przy tworzeniu realizacji z tego scenariusza"
              : `Tekst wstępu: ${getRealizationLanguageLabel(editingLanguage)}`
          }
          className={textareaClassName}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-zinc-400">Zasady gry</span>
        <textarea
          value={gameRules}
          onChange={(event) => updateField("gameRules", event.target.value)}
          rows={4}
          placeholder={
            isBase
              ? "Zasady gry podpowiedzą się automatycznie przy tworzeniu realizacji z tego scenariusza"
              : `Zasady gry: ${getRealizationLanguageLabel(editingLanguage)}`
          }
          className={textareaClassName}
        />
      </label>
    </div>
  );
}

/** Drops empty translation entries so the payload only carries real text. */
export function compactScenarioTranslations(translations: RealizationTranslations): RealizationTranslations {
  const compacted: RealizationTranslations = {};
  for (const [language, entry] of Object.entries(translations) as Array<
    [RealizationLanguage, RealizationTranslations[RealizationLanguage]]
  >) {
    const introText = entry?.introText?.trim();
    const gameRules = entry?.gameRules?.trim();
    if (introText || gameRules) {
      compacted[language] = { introText: introText || undefined, gameRules: gameRules || undefined };
    }
  }
  return compacted;
}
