"use client";

import { useState } from "react";

import { SegmentedToggle } from "@/shared/components/segmented-toggle";
import {
  useCreateCaseFileMutation,
  useUpdateCaseFileMutation,
  useUploadCaseFileAudioMutation,
  useUploadCaseFileImageMutation,
  type CaseFileEntry,
  type CaseFileField,
  type CaseFileKind,
  type CaseFilePayload,
  type CaseFileUnlockMode,
} from "@/features/realizations/api/realization.api";

/**
 * Formularz dowodu — wspólny dla dodawania i edycji.
 *
 * Pliki wysyłane są NATYCHMIAST po wybraniu, nie odkładane do zapisu jak logo
 * realizacji. Powód: dowód i tak zapisuje się osobnym wywołaniem, więc
 * odkładanie pliku niczego by nie grupowało, a przy edycji trzeba pokazać
 * podgląd zanim admin kliknie „Zapisz". To ten sam wzorzec, którym idą obrazki
 * stanowisk.
 */

type CaseFileFormProps = {
  realizationId: string;
  stations: { id: string; name: string }[];
  initial?: CaseFileEntry;
  onDone: () => void;
  onCancel?: () => void;
};

const KIND_OPTIONS: { value: CaseFileKind; label: string }[] = [
  { value: "text", label: "Notatka" },
  { value: "image", label: "Zdjęcie" },
  { value: "audio", label: "Nagranie" },
  { value: "dossier", label: "Kartoteka" },
];

const EMPTY_FIELD: CaseFileField = { label: "", value: "" };

export function CaseFileForm({
  realizationId,
  stations,
  initial,
  onDone,
  onCancel,
}: CaseFileFormProps) {
  const [kind, setKind] = useState<CaseFileKind>(initial?.kind ?? "text");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [objectKey, setObjectKey] = useState<string | null>(initial?.objectKey ?? null);
  const [fields, setFields] = useState<CaseFileField[]>(
    initial?.fields?.length ? initial.fields : [EMPTY_FIELD],
  );
  const [unlockMode, setUnlockMode] = useState<CaseFileUnlockMode>(
    initial?.unlockMode ?? "from-start",
  );
  const [stationId, setStationId] = useState(initial?.stationId ?? "");
  const [error, setError] = useState<string | null>(null);

  const [createCaseFile, { isLoading: isCreating }] = useCreateCaseFileMutation();
  const [updateCaseFile, { isLoading: isUpdating }] = useUpdateCaseFileMutation();
  const [uploadImage, { isLoading: isUploadingImage }] = useUploadCaseFileImageMutation();
  const [uploadAudio, { isLoading: isUploadingAudio }] = useUploadCaseFileAudioMutation();

  const isBusy = isCreating || isUpdating || isUploadingImage || isUploadingAudio;

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setError(null);

    try {
      const uploaded =
        kind === "audio"
          ? await uploadAudio({ realizationId, file }).unwrap()
          : await uploadImage({ realizationId, file }).unwrap();

      setUrl(uploaded.url);
      setObjectKey(uploaded.key);
    } catch {
      setError("Nie udało się wysłać pliku. Sprawdź format i rozmiar.");
    }
  }

  function buildPayload(): CaseFilePayload | null {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Podaj tytuł dowodu.");
      return null;
    }

    if (unlockMode === "after-station" && !stationId) {
      setError("Wybierz stanowisko albo ustaw odblokowanie od startu.");
      return null;
    }

    const base: CaseFilePayload = {
      kind,
      title: trimmedTitle,
      unlockMode,
      stationId: unlockMode === "after-station" ? stationId : null,
    };

    if (kind === "text") {
      if (!body.trim()) {
        setError("Notatka musi mieć treść.");
        return null;
      }
      return { ...base, body: body.trim() };
    }

    if (kind === "image" || kind === "audio") {
      if (!url.trim()) {
        setError(kind === "audio" ? "Wgraj nagranie." : "Wgraj zdjęcie.");
        return null;
      }
      return { ...base, url: url.trim(), objectKey };
    }

    const filled = fields
      .map((field) => ({ label: field.label.trim(), value: field.value.trim() }))
      .filter((field) => field.label && field.value);

    if (filled.length === 0) {
      setError("Kartoteka musi mieć co najmniej jedno wypełnione pole.");
      return null;
    }

    return { ...base, fields: filled };
  }

  async function handleSubmit() {
    const payload = buildPayload();

    if (!payload) {
      return;
    }

    try {
      if (initial) {
        await updateCaseFile({ realizationId, caseFileId: initial.id, payload }).unwrap();
      } else {
        await createCaseFile({ realizationId, payload }).unwrap();
      }
      onDone();
    } catch {
      setError("Nie udało się zapisać dowodu.");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <SegmentedToggle
        options={KIND_OPTIONS}
        value={kind}
        onChange={(next) => {
          setKind(next);
          setError(null);
        }}
      />

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-zinc-400">Tytuł</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Np. Zeznanie recepcjonisty"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
        />
      </label>

      {kind === "text" && (
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Treść</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            maxLength={5000}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
          />
        </label>
      )}

      {(kind === "image" || kind === "audio") && (
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400">
            {kind === "audio" ? "Nagranie" : "Zdjęcie"}
          </span>
          <input
            type="file"
            accept={kind === "audio" ? "audio/*" : "image/png,image/jpeg,image/webp"}
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-xs file:text-zinc-200"
          />
          {isUploadingImage || isUploadingAudio ? (
            <p className="text-xs text-zinc-500">Wysyłanie pliku…</p>
          ) : null}
          {url && kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Podgląd dowodu"
              className="max-h-48 rounded-lg border border-zinc-800 object-contain"
            />
          ) : null}
          {url && kind === "audio" ? (
            <audio controls src={url} className="w-full">
              Twoja przeglądarka nie odtworzy tego nagrania.
            </audio>
          ) : null}
        </div>
      )}

      {kind === "dossier" && (
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-wider text-zinc-400">
            Pola kartoteki
          </span>
          {fields.map((field, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={field.label}
                onChange={(event) =>
                  setFields((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Pole"
                maxLength={120}
                className="w-1/3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
              <input
                value={field.value}
                onChange={(event) =>
                  setFields((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, value: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Wartość"
                maxLength={500}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
              <button
                type="button"
                onClick={() =>
                  setFields((prev) =>
                    prev.length === 1
                      ? [EMPTY_FIELD]
                      : prev.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="rounded-lg border border-zinc-700 px-3 text-sm text-zinc-400 hover:text-zinc-200"
                aria-label="Usuń pole"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFields((prev) => [...prev, EMPTY_FIELD])}
            disabled={fields.length >= 30}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 disabled:opacity-50"
          >
            Dodaj pole
          </button>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-zinc-400">
          Odblokowanie
        </span>
        <select
          value={unlockMode === "from-start" ? "" : stationId}
          onChange={(event) => {
            const next = event.target.value;
            setUnlockMode(next ? "after-station" : "from-start");
            setStationId(next);
          }}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
        >
          <option value="">Od startu gry</option>
          {stations.map((station, index) => (
            <option key={station.id} value={station.id}>
              #{index + 1} {station.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          Dowód odblokuje się, gdy dowolna drużyna zaliczy wybrane stanowisko —
          akta są wspólne dla całej realizacji.
        </p>
      </label>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isBusy}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
        >
          {initial ? "Zapisz zmiany" : "Dodaj dowód"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100"
          >
            Anuluj
          </button>
        ) : null}
      </div>
    </div>
  );
}
