"use client";

import { useState } from "react";
import {
  useGetPointsQrCodeSuggestionsQuery,
  type PointsQrClaimMode,
} from "@/features/current-realization/api/current-realization.api";
import { generateSampleCompletionCode } from "@/features/games/station.utils";

export type PointsQrCodeDraft = {
  localId: string;
  points: number;
  label: string;
  code: string;
  claimMode: PointsQrClaimMode;
};

type PointsQrCodesDraftEditorProps = {
  drafts: PointsQrCodeDraft[];
  onChange: (drafts: PointsQrCodeDraft[]) => void;
};

function getClaimModeLabel(mode: PointsQrClaimMode) {
  return mode === "FIRST_TEAM" ? "Tylko pierwsza drużyna" : "Każda drużyna raz";
}

export function PointsQrCodesDraftEditor({ drafts, onChange }: PointsQrCodesDraftEditorProps) {
  const { data: codeSuggestions } = useGetPointsQrCodeSuggestionsQuery();
  const [points, setPoints] = useState(10);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [claimMode, setClaimMode] = useState<PointsQrClaimMode>("PER_TEAM");
  const [formError, setFormError] = useState<string | null>(null);

  function handleAdd() {
    setFormError(null);

    if (!Number.isFinite(points) || points <= 0) {
      setFormError("Podaj poprawną liczbę punktów (większą od zera).");
      return;
    }

    onChange([
      ...drafts,
      {
        localId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        points: Math.round(points),
        label: label.trim(),
        code: code.trim(),
        claimMode,
      },
    ]);
    setPoints(10);
    setLabel("");
    setCode("");
    setClaimMode("PER_TEAM");
  }

  function handleRemove(localId: string) {
    onChange(drafts.filter((draft) => draft.localId !== localId));
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Skan takiego kodu tylko przyznaje drużynie punkty — nie jest to stanowisko, więc nie pojawia się na liście
        zadań i nie wpływa na ukończenie gry. Same kody QR i ich obrazy do pobrania będą dostępne po zapisaniu
        realizacji (w zakładce edycji).
      </p>

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h3 className="text-sm font-semibold text-zinc-100">Nowy kod punktowy</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Punkty</span>
            <input
              type="number"
              min={1}
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Etykieta (tylko dla admina, opcjonalna)</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Np. Bonus przy fontannie"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Kod QR</span>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              list="points-qr-code-draft-suggestions"
              placeholder="Zostaw puste, aby wygenerować automatycznie"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
            <datalist id="points-qr-code-draft-suggestions">
              {(codeSuggestions ?? []).map((suggestion) => (
                <option key={suggestion.code} value={suggestion.code}>
                  {suggestion.label ? `${suggestion.label} (${suggestion.points} pkt)` : `${suggestion.points} pkt`}
                </option>
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => setCode(generateSampleCompletionCode(8, "letters"))}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
            >
              Wygeneruj
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Zostaw puste, aby system wygenerował nowy losowy kod. Wybierz z podpowiedzi już użyty kod, aby ta sama
            naklejka QR pasowała też do tego kodu punktowego.
          </p>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Kto może zeskanować</span>
          <div className="inline-flex w-fit rounded-lg border border-zinc-700 bg-zinc-900 p-1">
            {(["PER_TEAM", "FIRST_TEAM"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setClaimMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  claimMode === mode ? "bg-amber-400 text-zinc-950" : "text-zinc-300 hover:text-zinc-100"
                }`}
              >
                {getClaimModeLabel(mode)}
              </button>
            ))}
          </div>
        </label>
        {formError ? <p className="text-xs text-red-300">{formError}</p> : null}
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300"
        >
          Dodaj kod do listy
        </button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-zinc-500">Brak dodanych kodów punktowych.</p>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <div
              key={draft.localId}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-100">{draft.label || "(bez etykiety)"}</p>
                <p className="text-xs text-zinc-500">
                  {draft.points} pkt • {getClaimModeLabel(draft.claimMode)}
                  {draft.code ? ` • kod: ${draft.code}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(draft.localId)}
                className="shrink-0 rounded-md border border-red-500/40 px-2 py-1 text-[11px] text-red-300 transition hover:border-red-400"
              >
                Usuń
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
