"use client";

import { useMemo, useState } from "react";
import type { Station } from "@/features/games/types/station";
import { stationTypeOptions } from "@/features/games/types/station";
import { groupStationsByCategory } from "@/features/games/station-catalog.utils";
import { useIsDirty } from "@/shared/lib/use-is-dirty";
import {
  useCreateCaseFileMutation,
  useUploadCaseFileAudioMutation,
  useUploadCaseFileImageMutation,
} from "@/features/realizations/api/realization.api";
import type { RealizationThemePack } from "@/features/realizations/types/realization";
import {
  releaseDraftPreview,
  saveDraftCaseFiles,
  type DraftCaseFile,
} from "@/features/realizations/components/case-file-draft";
import { CaseFilesDraftManager } from "@/features/realizations/components/case-files-draft-manager";
import { useCreateScenarioMutation } from "../api/scenario.api";
import type { Scenario } from "../types/scenario";
import { ScenarioCategoriesField } from "./scenario-categories-field";
import { ScenarioThemePackField } from "./scenario-theme-pack-field";
import {
  compactScenarioTranslations,
  ScenarioTextsField,
  type ScenarioTexts,
} from "./scenario-texts-field";

const emptyTexts: ScenarioTexts = { introText: "", gameRules: "", translations: {} };

interface CreateScenarioFormProps {
  stations: Station[];
  isStationsLoading: boolean;
  onClose: () => void;
  /**
   * Scenariusz powstał, ale część dowodów nie weszła — strona otwiera wtedy
   * jego edycję z listą brakujących, żeby nic nie przepadło po cichu.
   */
  onCreatedWithMissingCaseFiles: (scenario: Scenario, failedTitles: string[]) => void;
}

function getTypeLabel(value: string) {
  return stationTypeOptions.find((option) => option.value === value)?.label ?? "Quiz";
}

export function CreateScenarioForm({
  stations,
  isStationsLoading,
  onClose,
  onCreatedWithMissingCaseFiles,
}: CreateScenarioFormProps) {
  const [createScenario] = useCreateScenarioMutation();
  const [createCaseFile] = useCreateCaseFileMutation();
  const [uploadCaseFileImage] = useUploadCaseFileImageMutation();
  const [uploadCaseFileAudio] = useUploadCaseFileAudioMutation();
  const [isCreating, setIsCreating] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [texts, setTexts] = useState<ScenarioTexts>(emptyTexts);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [themePack, setThemePack] = useState<RealizationThemePack>("standard");
  const [caseFileDrafts, setCaseFileDrafts] = useState<DraftCaseFile[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const isCrime = themePack === "crime";

  // Stanowiska w kolejności zaznaczenia — taką kolejność dostanie scenariusz,
  // więc numery w wyborze „po stanowisku” zgadzają się z późniejszymi.
  const selectedStations = useMemo(() => {
    const byId = new Map(stations.map((station) => [station.id, station]));
    return selectedStationIds
      .map((id) => byId.get(id))
      .filter((station): station is Station => Boolean(station))
      .map((station) => ({ id: station.id, name: station.name }));
  }, [selectedStationIds, stations]);

  function toggleSelection(stationId: string) {
    setSelectedStationIds((current) =>
      current.includes(stationId) ? current.filter((item) => item !== stationId) : [...current, stationId],
    );
  }

  const stationGroups = useMemo(() => groupStationsByCategory(stations), [stations]);

  function isGroupFullySelected(groupStations: Station[]) {
    return groupStations.length > 0 && groupStations.every((station) => selectedStationIds.includes(station.id));
  }

  function toggleGroupSelection(groupStations: Station[]) {
    const groupIds = groupStations.map((station) => station.id);
    const allSelected = isGroupFullySelected(groupStations);
    setSelectedStationIds((current) =>
      allSelected
        ? current.filter((id) => !groupIds.includes(id))
        : Array.from(new Set([...current, ...groupIds])),
    );
  }

  const isDirty = useIsDirty({
    name,
    description,
    texts,
    selectedStationIds,
    categories,
    themePack,
    caseFileDrafts,
  });

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij panel tworzenia scenariusza"
        onClick={() => {
          if (!isDirty) {
            onClose();
          }
        }}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <form
          className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmedName = name.trim();
            const trimmedDescription = description.trim();

            if (trimmedName.length < 3) {
              setFormError("Nazwa scenariusza musi mieć co najmniej 3 znaki.");
              return;
            }

            if (selectedStationIds.length === 0) {
              setFormError("Wybierz przynajmniej jedno stanowisko.");
              return;
            }

            // Akta zapisują się tylko przy oprawie kryminalnej — tylko tam są widoczne.
            const draftsToSave = isCrime ? caseFileDrafts : [];
            const orphaned = draftsToSave.filter(
              (draft) =>
                draft.payload.unlockMode === "after-station" &&
                !selectedStationIds.includes(draft.payload.stationId ?? ""),
            );
            if (orphaned.length > 0) {
              setFormError(
                `Dowody przypisane do odznaczonych stanowisk: ${orphaned
                  .map((draft) => `„${draft.payload.title}”`)
                  .join(", ")}. Zaznacz te stanowiska albo zmień odblokowanie dowodów.`,
              );
              return;
            }

            setIsCreating(true);
            let created: Scenario;
            try {
              setFormError(null);
              created = await createScenario({
                name: trimmedName,
                description: trimmedDescription,
                introText: texts.introText.trim(),
                gameRules: texts.gameRules.trim(),
                translations: compactScenarioTranslations(texts.translations),
                stationIds: selectedStationIds,
                categories,
                themePack,
              }).unwrap();
            } catch {
              setIsCreating(false);
              setFormError("Nie udało się utworzyć scenariusza.");
              return;
            }

            const owner = { kind: "scenario" as const, id: created.id };
            const { failedTitles } = await saveDraftCaseFiles(owner, draftsToSave, {
              uploadImage: (target, file) => uploadCaseFileImage({ owner: target, file }).unwrap(),
              uploadAudio: (target, file) => uploadCaseFileAudio({ owner: target, file }).unwrap(),
              createCaseFile: (target, payload) => createCaseFile({ owner: target, payload }).unwrap(),
            });
            caseFileDrafts.forEach(releaseDraftPreview);
            setIsCreating(false);

            if (failedTitles.length > 0) {
              onCreatedWithMissingCaseFiles(created, failedTitles);
              return;
            }
            onClose();
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Nowy scenariusz</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
              >
                Zamknij
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {isCreating ? "Dodawanie..." : "Dodaj scenariusz"}
              </button>
            </div>
          </div>

          {formError && <p className="text-sm text-red-300">{formError}</p>}

          <div className="grid gap-4">
            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa scenariusza</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Np. Scenariusz firmowy"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <ScenarioCategoriesField categories={categories} onChange={setCategories} />

            <ScenarioThemePackField value={themePack} onChange={setThemePack} />

            <label className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Krótki opis przepływu scenariusza"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
              />
            </label>

            <ScenarioTextsField value={texts} onChange={setTexts} />

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-zinc-400">Stanowiska</span>
              <div className="max-h-96 space-y-4 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                {isStationsLoading ? (
                  <p className="text-xs text-zinc-500">Ładowanie stanowisk...</p>
                ) : stations.length === 0 ? (
                  <p className="text-xs text-zinc-500">Brak stanowisk do przypisania.</p>
                ) : (
                  stationGroups.map((group) => {
                    const groupSelected = isGroupFullySelected(group.stations);

                    return (
                      <div key={group.category} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-zinc-300">
                            {group.label} ({group.stations.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleGroupSelection(group.stations)}
                            className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 transition hover:border-amber-400/60 hover:text-amber-200"
                          >
                            {groupSelected ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
                          </button>
                        </div>
                        <div className="space-y-2">
                          {group.stations.map((station) => {
                            const checked = selectedStationIds.includes(station.id);

                            return (
                              <label
                                key={station.id}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition ${
                                  checked
                                    ? "border-amber-300 bg-amber-400/10"
                                    : "border-zinc-700 bg-zinc-900 hover:border-zinc-500"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={checked}
                                  onChange={() => toggleSelection(station.id)}
                                />
                                <div>
                                  <p className="text-sm font-semibold text-zinc-100">{station.name}</p>
                                  <p className="text-xs text-zinc-400">
                                    {getTypeLabel(station.type)} • {station.points} pkt • Czas: {station.timeLimitSeconds}s
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Poza <form>: Enter w polu dowodu nie może wysłać całego scenariusza. */}
        {isCrime ? (
          <section className="mt-5 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h3 className="text-xs uppercase tracking-wider text-zinc-400">Akta</h3>
            <CaseFilesDraftManager drafts={caseFileDrafts} onChange={setCaseFileDrafts} stations={selectedStations} />
          </section>
        ) : caseFileDrafts.length > 0 ? (
          <p className="mt-5 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
            Masz {caseFileDrafts.length} dowodów w aktach — zapiszą się tylko przy oprawie kryminalnej.
          </p>
        ) : null}
      </aside>
    </>
  );
}
