# Realization JSON Export/Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins download a realization's configuration as a JSON file (for prod/test transfer and archiving) and re-import that file to prefill the existing "new realization" form.

**Architecture:** Pure `apps/admin` frontend feature, zero backend changes. Export reads data already returned by `GET /realizations` (`Realization.scenarioStations`). Import parses/validates the JSON client-side and feeds it into `CreateRealizationForm` as prefilled initial state; submission reuses the existing `createRealization` mutation unchanged.

**Tech Stack:** Next.js 16 admin app, TypeScript, Zod (already a dependency, `^4.3.6` — two-arg `z.record(keySchema, valueSchema)` API), Tailwind classes matching existing components.

## Global Constraints

- UI text in Polish, matching existing labels/tone in `apps/admin/src/features/realizations/`.
- `apps/admin` has no unit test runner (only `pnpm --filter admin lint` and `pnpm --filter admin build`, per root `CLAUDE.md`). Each task below is verified with `pnpm --filter admin lint`; the final task runs a full `pnpm --filter admin build` plus a manual dev-server walkthrough.
- Follow the existing feature layout: types in `apps/admin/src/features/realizations/types/realization.ts`, cross-cutting logic in a new root-level file `apps/admin/src/features/realizations/realization-export.ts` (sibling of the existing `realization.utils.ts`), UI changes in existing `components/` files.
- Reuse existing helpers instead of duplicating logic: `toRealizationStationDraft` (`components/realization-stations-editor.tsx`), `parseRealizationLanguageSelection` / `toDateTimeLocalValue` (already imported in `create-realization-form.tsx`).
- No new npm dependencies — Zod is already installed in `apps/admin`.

---

### Task 1: Add export/import types

**Files:**
- Modify: `apps/admin/src/features/realizations/types/realization.ts`

**Interfaces:**
- Consumes: existing `Realization`, `RealizationStationDraft`, `RealizationLanguage`, `RealizationType`, `RealizationStatus` types defined earlier in the same file.
- Produces: `RealizationExportRealizationData` and `RealizationExportFile` types, used by Task 2 (build/parse logic) and Task 4 (form prefill prop).

- [ ] **Step 1: Append the export types to the end of the file**

Add this block at the end of `apps/admin/src/features/realizations/types/realization.ts` (after the existing `RealizationStationDraft` type):

```ts
export type RealizationExportRealizationData = {
  companyName: string;
  location?: string;
  language: RealizationLanguage;
  customLanguage?: string;
  introText?: string;
  gameRules?: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  instructors: string[];
  type: RealizationType;
  logoUrl?: string;
  hideMap: boolean;
  mapImageUrl?: string;
  offerPdfUrl?: string;
  offerPdfName?: string;
  teamCount: number;
  peopleCount: number;
  durationMinutes: number;
  showLeaderboard: boolean;
  showLeaderboardDuringGame: boolean;
  showLeaderboardOnFinish: boolean;
  teamStationNumberingEnabled: boolean;
  timedStationPointsDecayEnabled: boolean;
  hideTaskList: boolean;
  status: RealizationStatus;
  scheduledAt: string;
};

export type RealizationExportFile = {
  schemaVersion: 1;
  exportedAt: string;
  realization: RealizationExportRealizationData;
  scenarioStations: RealizationStationDraft[];
};
```

This is a deliberate subset of `Realization`: it excludes database-specific/derived fields that don't make sense on another environment (`id`, `scenarioId`, `scenarioTemplateId`, `scenarioTemplateName`, `stationIds`, `joinCode`, `requiredDevicesCount`, `positionsCount`, `locationRequired`, `createdAt`, `updatedAt`, `logs`).

- [ ] **Step 2: Lint**

Run: `pnpm --filter admin lint`
Expected: no errors (unused-export warnings are fine — the types are consumed starting in Task 2).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/realizations/types/realization.ts
git commit -m "feat(admin): add realization export/import types"
```

---

### Task 2: Build the export/import logic module

**Files:**
- Create: `apps/admin/src/features/realizations/realization-export.ts`

**Interfaces:**
- Consumes: `RealizationExportFile`, `RealizationExportRealizationData` (Task 1, `./types/realization`); `Realization`, `RealizationStationDraft` (`./types/realization`); `toRealizationStationDraft(station: Station): RealizationStationDraft` (already exported from `./components/realization-stations-editor.tsx`).
- Produces:
  - `buildRealizationExport(realization: Realization): RealizationExportFile`
  - `downloadRealizationExport(realization: Realization): void`
  - `parseRealizationExportFile(raw: unknown): RealizationExportFile | null`
  - Consumed by Task 3 (`downloadRealizationExport`) and Task 5 (`parseRealizationExportFile`).

- [ ] **Step 1: Write the module**

Create `apps/admin/src/features/realizations/realization-export.ts`:

```ts
import { z } from "zod";
import type { Realization, RealizationExportFile } from "./types/realization";
import { toRealizationStationDraft } from "./components/realization-stations-editor";

const realizationExportDataSchema = z.object({
  companyName: z.string(),
  location: z.string().optional(),
  language: z.enum(["polish", "english", "ukrainian", "russian", "other"]),
  customLanguage: z.string().optional(),
  introText: z.string().optional(),
  gameRules: z.string().optional(),
  contactPerson: z.string(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  instructors: z.array(z.string()),
  type: z.enum(["outdoor-games", "hotel-games", "workshops", "evening-attractions", "dj", "recreation"]),
  logoUrl: z.string().optional(),
  hideMap: z.boolean(),
  mapImageUrl: z.string().optional(),
  offerPdfUrl: z.string().optional(),
  offerPdfName: z.string().optional(),
  teamCount: z.number(),
  peopleCount: z.number(),
  durationMinutes: z.number(),
  showLeaderboard: z.boolean(),
  showLeaderboardDuringGame: z.boolean(),
  showLeaderboardOnFinish: z.boolean(),
  teamStationNumberingEnabled: z.boolean(),
  timedStationPointsDecayEnabled: z.boolean(),
  hideTaskList: z.boolean(),
  status: z.enum(["planned", "in-progress", "done"]),
  scheduledAt: z.string(),
});

const realizationExportFileSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  realization: realizationExportDataSchema,
  scenarioStations: z.array(z.record(z.string(), z.unknown())),
});

function slugifyCompanyName(companyName: string) {
  const slug = companyName
    .toLowerCase()
    .normalize("NFKD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "realizacja";
}

export function buildRealizationExport(realization: Realization): RealizationExportFile {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    realization: {
      companyName: realization.companyName,
      location: realization.location,
      language: realization.language,
      customLanguage: realization.customLanguage,
      introText: realization.introText,
      gameRules: realization.gameRules,
      contactPerson: realization.contactPerson,
      contactPhone: realization.contactPhone,
      contactEmail: realization.contactEmail,
      instructors: realization.instructors,
      type: realization.type,
      logoUrl: realization.logoUrl,
      hideMap: realization.hideMap,
      mapImageUrl: realization.mapImageUrl,
      offerPdfUrl: realization.offerPdfUrl,
      offerPdfName: realization.offerPdfName,
      teamCount: realization.teamCount,
      peopleCount: realization.peopleCount,
      durationMinutes: realization.durationMinutes,
      showLeaderboard: realization.showLeaderboard,
      showLeaderboardDuringGame: realization.showLeaderboardDuringGame,
      showLeaderboardOnFinish: realization.showLeaderboardOnFinish,
      teamStationNumberingEnabled: realization.teamStationNumberingEnabled,
      timedStationPointsDecayEnabled: realization.timedStationPointsDecayEnabled,
      hideTaskList: realization.hideTaskList,
      status: realization.status,
      scheduledAt: realization.scheduledAt,
    },
    scenarioStations: realization.scenarioStations.map((station) => ({
      ...toRealizationStationDraft(station),
      id: undefined,
    })),
  };
}

export function downloadRealizationExport(realization: Realization) {
  const exportFile = buildRealizationExport(realization);
  const json = JSON.stringify(exportFile, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const link = document.createElement("a");
  link.href = url;
  link.download = `realizacja-${slugifyCompanyName(realization.companyName)}-${datePart}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseRealizationExportFile(raw: unknown): RealizationExportFile | null {
  const result = realizationExportFileSchema.safeParse(raw);
  if (!result.success) {
    return null;
  }

  return {
    schemaVersion: 1,
    exportedAt: result.data.exportedAt,
    realization: result.data.realization,
    scenarioStations: result.data.scenarioStations as RealizationExportFile["scenarioStations"],
  };
}
```

`{ ...toRealizationStationDraft(station), id: undefined }` is intentional: `JSON.stringify` drops properties whose value is `undefined`, so the exported file never contains the source environment's station id (it's meaningless on the target environment), without needing an unused-variable destructure that could trip lint rules.

`scenarioStations` in the Zod schema is validated loosely (array of records) — the deep station shape (quiz data, translations, etc.) is already re-validated by the existing `hasInvalidRealizationStationDrafts` / `normalizeRealizationStationDrafts` checks when the prefilled form is submitted, so duplicating that validation here would be redundant.

- [ ] **Step 2: Lint**

Run: `pnpm --filter admin lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/realizations/realization-export.ts
git commit -m "feat(admin): add realization JSON export/import build and parse logic"
```

---

### Task 3: Add the "Pobierz JSON" button to the realizations table

**Files:**
- Modify: `apps/admin/src/features/realizations/components/realizations-table.tsx:1-8` (imports), `:216-235` (Akcje column actions)

**Interfaces:**
- Consumes: `downloadRealizationExport(realization: Realization): void` (Task 2, `../realization-export`).

- [ ] **Step 1: Import the export function**

In `apps/admin/src/features/realizations/components/realizations-table.tsx`, after the existing imports (below the `import { getStatusLabel, ... } from "../realization.utils";` block, i.e. after line 15), add:

```tsx
import { downloadRealizationExport } from "../realization-export";
```

- [ ] **Step 2: Add the button next to "Kody QR" / "Edytuj"**

Find this block (around line 216-235):

```tsx
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onShowStationQrs(realization)}
                            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                          >
                            Kody QR
                          </button>
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(realization)}
                              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                            >
                              Edytuj
                            </button>
                          ) : null}
                        </div>
                      </td>
```

Replace it with:

```tsx
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onShowStationQrs(realization)}
                            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                          >
                            Kody QR
                          </button>
                          {onEdit ? (
                            <button
                              type="button"
                              onClick={() => onEdit(realization)}
                              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                            >
                              Edytuj
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => downloadRealizationExport(realization)}
                            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                          >
                            Pobierz JSON
                          </button>
                        </div>
                      </td>
```

- [ ] **Step 3: Lint**

Run: `pnpm --filter admin lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/realizations/components/realizations-table.tsx
git commit -m "feat(admin): add download-JSON button to realizations table"
```

---

### Task 4: Prefill `CreateRealizationForm` from imported data

**Files:**
- Modify: `apps/admin/src/features/realizations/components/create-realization-form.tsx:4-10` (type imports), `:49-56` (props interface), `:82` (function signature), `:89-124` (state declarations), `:197` (scenarioStations state), `:365-385` (submit handler asset resolution), `:387-419` (payload), `:421-452` (post-save reset), `:953-965` (offer PDF remove button)

**Interfaces:**
- Consumes: `RealizationExportFile` (Task 1, `../types/realization`).
- Produces: `CreateRealizationForm` now accepts an optional `initialData?: RealizationExportFile` prop, consumed by Task 5.

- [ ] **Step 1: Import the new type**

Change the top-of-file type import (lines 4-10):

```tsx
import type {
  Realization,
  RealizationLanguage,
  RealizationStationDraft,
  RealizationStatus,
  RealizationType,
} from "../types/realization";
```

to:

```tsx
import type {
  Realization,
  RealizationExportFile,
  RealizationLanguage,
  RealizationStationDraft,
  RealizationStatus,
  RealizationType,
} from "../types/realization";
```

- [ ] **Step 2: Add the `initialData` prop**

Change the props interface (lines 49-56):

```tsx
interface CreateRealizationFormProps {
  scenarios: Scenario[];
  stations: Station[];
  realizations: Realization[];
  userEmail?: string;
  onClose: () => void;
  onSaved?: (realization: Realization) => void;
}
```

to:

```tsx
interface CreateRealizationFormProps {
  scenarios: Scenario[];
  stations: Station[];
  realizations: Realization[];
  userEmail?: string;
  initialData?: RealizationExportFile;
  onClose: () => void;
  onSaved?: (realization: Realization) => void;
}
```

- [ ] **Step 3: Destructure the prop**

Change the function signature (line 82):

```tsx
export function CreateRealizationForm({ scenarios, stations, realizations, userEmail, onClose, onSaved }: CreateRealizationFormProps) {
```

to:

```tsx
export function CreateRealizationForm({ scenarios, stations, realizations, userEmail, initialData, onClose, onSaved }: CreateRealizationFormProps) {
```

- [ ] **Step 4: Prefill the state declarations**

Replace the whole state block (lines 89-124):

```tsx
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<RealizationLanguage[]>(["polish"]);
  const [customLanguage, setCustomLanguage] = useState("");
  const [introText, setIntroText] = useState("");
  const [gameRules, setGameRules] = useState("");
  const [instructors, setInstructors] = useState<string[]>([]);
  const [instructorInput, setInstructorInput] = useState("");
  const [selectedType, setSelectedType] = useState<RealizationType>("outdoor-games");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [logoInputMode, setLogoInputMode] = useState<"upload" | "existing">("upload");
  const [hideMap, setHideMap] = useState(false);
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string | undefined>(undefined);
  const [mapImageInputMode, setMapImageInputMode] = useState<"upload" | "existing">("upload");
  const [offerPdfFile, setOfferPdfFile] = useState<File | null>(null);
  const [offerPdfName, setOfferPdfName] = useState<string | undefined>();
  const [offerPdfError, setOfferPdfError] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [teamCount, setTeamCount] = useState(2);
  const [peopleCount, setPeopleCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [showLeaderboardDuringGame, setShowLeaderboardDuringGame] = useState(true);
  const [showLeaderboardOnFinish, setShowLeaderboardOnFinish] = useState(true);
  const [teamStationNumberingEnabled, setTeamStationNumberingEnabled] = useState(true);
  const [timedStationPointsDecayEnabled, setTimedStationPointsDecayEnabled] = useState(false);
  const [hideTaskList, setHideTaskList] = useState(false);
  const [status, setStatus] = useState<RealizationStatus>("planned");
  const [scheduledAt, setScheduledAt] = useState(() => toDateTimeLocalValue(new Date().toISOString()));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const scheduledAtInputRef = useRef<DateTimeInputElement | null>(null);
```

with:

```tsx
  const initialLanguageSelection = initialData
    ? parseRealizationLanguageSelection(initialData.realization.language, initialData.realization.customLanguage)
    : { selectedLanguages: ["polish"] as RealizationLanguage[], customLanguage: "" };

  const [companyName, setCompanyName] = useState(initialData?.realization.companyName ?? "");
  const [location, setLocation] = useState(initialData?.realization.location ?? "");
  const [contactPerson, setContactPerson] = useState(initialData?.realization.contactPerson ?? "");
  const [contactPhone, setContactPhone] = useState(initialData?.realization.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initialData?.realization.contactEmail ?? "");
  const [selectedLanguages, setSelectedLanguages] = useState<RealizationLanguage[]>(initialLanguageSelection.selectedLanguages);
  const [customLanguage, setCustomLanguage] = useState(initialLanguageSelection.customLanguage);
  const [introText, setIntroText] = useState(initialData?.realization.introText ?? "");
  const [gameRules, setGameRules] = useState(initialData?.realization.gameRules ?? "");
  const [instructors, setInstructors] = useState<string[]>(initialData?.realization.instructors ?? []);
  const [instructorInput, setInstructorInput] = useState("");
  const [selectedType, setSelectedType] = useState<RealizationType>(initialData?.realization.type ?? "outdoor-games");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(initialData?.realization.logoUrl);
  const [logoInputMode, setLogoInputMode] = useState<"upload" | "existing">("upload");
  const [hideMap, setHideMap] = useState(initialData?.realization.hideMap ?? false);
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [mapImageUrl, setMapImageUrl] = useState<string | undefined>(initialData?.realization.mapImageUrl);
  const [mapImageInputMode, setMapImageInputMode] = useState<"upload" | "existing">("upload");
  const [offerPdfFile, setOfferPdfFile] = useState<File | null>(null);
  const [offerPdfUrl, setOfferPdfUrl] = useState<string | undefined>(initialData?.realization.offerPdfUrl);
  const [offerPdfName, setOfferPdfName] = useState<string | undefined>(initialData?.realization.offerPdfName);
  const [offerPdfError, setOfferPdfError] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [teamCount, setTeamCount] = useState(initialData?.realization.teamCount ?? 2);
  const [peopleCount, setPeopleCount] = useState(initialData?.realization.peopleCount ?? 10);
  const [durationMinutes, setDurationMinutes] = useState(initialData?.realization.durationMinutes ?? 120);
  const [showLeaderboardDuringGame, setShowLeaderboardDuringGame] = useState(
    initialData?.realization.showLeaderboardDuringGame ?? true,
  );
  const [showLeaderboardOnFinish, setShowLeaderboardOnFinish] = useState(
    initialData?.realization.showLeaderboardOnFinish ?? true,
  );
  const [teamStationNumberingEnabled, setTeamStationNumberingEnabled] = useState(
    initialData?.realization.teamStationNumberingEnabled ?? true,
  );
  const [timedStationPointsDecayEnabled, setTimedStationPointsDecayEnabled] = useState(
    initialData?.realization.timedStationPointsDecayEnabled ?? false,
  );
  const [hideTaskList, setHideTaskList] = useState(initialData?.realization.hideTaskList ?? false);
  const [status, setStatus] = useState<RealizationStatus>(initialData?.realization.status ?? "planned");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toDateTimeLocalValue(initialData?.realization.scheduledAt ?? new Date().toISOString()),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const scheduledAtInputRef = useRef<DateTimeInputElement | null>(null);
```

Note: `selectedScenarioId` intentionally stays `""` regardless of `initialData` — the source environment's scenario id never exists on the target environment, so the admin must always pick a scenario template manually, exactly like the plain "new realization" flow.

- [ ] **Step 5: Prefill the station list**

Find (around line 197):

```tsx
  const [scenarioStations, setScenarioStations] = useState(() => [] as ReturnType<typeof mapScenarioStations>);
```

Replace with:

```tsx
  const [scenarioStations, setScenarioStations] = useState(
    () => initialData?.scenarioStations ?? ([] as ReturnType<typeof mapScenarioStations>),
  );
```

- [ ] **Step 6: Make the offer-PDF URL survive submit without a re-upload**

Find this block inside the submit handler (around lines 365-385):

```tsx
            try {
              let finalLogoUrl = logoUrl;
              let offerPdfUrl: string | undefined;
              let nextOfferPdfName: string | undefined;

              if (logoFile) {
                const uploadedLogo = await uploadRealizationLogo(logoFile).unwrap();
                finalLogoUrl = uploadedLogo.url;
              }

              let finalMapImageUrl = mapImageUrl;
              if (mapImageFile) {
                const uploadedMapImage = await uploadRealizationMapImage(mapImageFile).unwrap();
                finalMapImageUrl = uploadedMapImage.url;
              }

              if (offerPdfFile) {
                const uploadedOffer = await uploadRealizationOffer(offerPdfFile).unwrap();
                offerPdfUrl = uploadedOffer.url;
                nextOfferPdfName = offerPdfFile.name;
              }
```

Replace with:

```tsx
            try {
              let finalLogoUrl = logoUrl;
              let finalOfferPdfUrl = offerPdfUrl;
              let nextOfferPdfName = offerPdfName;

              if (logoFile) {
                const uploadedLogo = await uploadRealizationLogo(logoFile).unwrap();
                finalLogoUrl = uploadedLogo.url;
              }

              let finalMapImageUrl = mapImageUrl;
              if (mapImageFile) {
                const uploadedMapImage = await uploadRealizationMapImage(mapImageFile).unwrap();
                finalMapImageUrl = uploadedMapImage.url;
              }

              if (offerPdfFile) {
                const uploadedOffer = await uploadRealizationOffer(offerPdfFile).unwrap();
                finalOfferPdfUrl = uploadedOffer.url;
                nextOfferPdfName = offerPdfFile.name;
              }
```

This mirrors the existing `finalLogoUrl` / `finalMapImageUrl` pattern: without it, an imported `offerPdfUrl` would silently be dropped on submit unless the admin re-uploads the PDF (logo and map image already preserve their imported URL correctly, because they were designed to support the "pick from already-used assets" flow — offer PDF wasn't, since until now a realization was never created with a pre-existing offer PDF).

- [ ] **Step 7: Send the resolved offer PDF URL in the payload**

Find (around lines 399-403, inside the `createRealization({...})` call):

```tsx
                offerPdfUrl,
                offerPdfName: nextOfferPdfName,
```

Replace with:

```tsx
                offerPdfUrl: finalOfferPdfUrl,
                offerPdfName: nextOfferPdfName,
```

- [ ] **Step 8: Reset the new state on successful save**

Find (around lines 448-450, in the post-save reset block):

```tsx
              setOfferPdfFile(null);
              setOfferPdfName(undefined);
```

Replace with:

```tsx
              setOfferPdfFile(null);
              setOfferPdfUrl(undefined);
              setOfferPdfName(undefined);
```

- [ ] **Step 9: Let the admin clear an imported offer PDF before submit**

Find (around lines 953-965):

```tsx
              {offerPdfFile && (
                <button
                  type="button"
                  onClick={() => {
                    setOfferPdfFile(null);
                    setOfferPdfName(undefined);
                    setOfferPdfError(null);
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Usuń PDF
                </button>
              )}
```

Replace with:

```tsx
              {(offerPdfFile || offerPdfUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setOfferPdfFile(null);
                    setOfferPdfUrl(undefined);
                    setOfferPdfName(undefined);
                    setOfferPdfError(null);
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Usuń PDF
                </button>
              )}
```

Without this, a PDF name pulled in from `initialData` would render but have no way to be removed from the form — inconsistent with how logo/map image already behave (`{(logoFile || logoUrl) && (...)}`).

- [ ] **Step 10: Lint**

Run: `pnpm --filter admin lint`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add apps/admin/src/features/realizations/components/create-realization-form.tsx
git commit -m "feat(admin): prefill create-realization form from imported JSON"
```

---

### Task 5: Wire the "Importuj z JSON" button on the realizations page

**Files:**
- Modify: `apps/admin/src/app/realizations/page.tsx`

**Interfaces:**
- Consumes: `parseRealizationExportFile(raw: unknown): RealizationExportFile | null` (Task 2, `@/features/realizations/realization-export`); `CreateRealizationForm`'s `initialData?: RealizationExportFile` prop (Task 4).

- [ ] **Step 1: Extend the imports**

Change:

```tsx
import { useEffect, useState } from "react";
```

to:

```tsx
import { useEffect, useRef, useState } from "react";
```

Add, after the existing `import type { Realization } from "@/features/realizations/types/realization";` line:

```tsx
import type { RealizationExportFile } from "@/features/realizations/types/realization";
import { parseRealizationExportFile } from "@/features/realizations/realization-export";
```

- [ ] **Step 2: Add import state and the file handler**

Change:

```tsx
  const router = useRouter();
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
```

to:

```tsx
  const router = useRouter();
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [importInitialData, setImportInitialData] = useState<RealizationExportFile | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
```

Add this function inside the component, above the `return (` statement (right after the `useEffect` that redirects on unauthorized session):

```tsx
  async function handleImportFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    try {
      const raw = JSON.parse(await file.text());
      const parsed = parseRealizationExportFile(raw);
      if (!parsed) {
        setImportError("Niepoprawny plik JSON realizacji.");
        return;
      }

      setImportError(null);
      setImportInitialData(parsed);
      setIsCreatePanelOpen(true);
    } catch {
      setImportError("Nie udało się odczytać pliku JSON.");
    }
  }
```

- [ ] **Step 3: Add the button, hidden file input, and error banner**

Find:

```tsx
          {canManageRealizations ? (
            <button
              type="button"
              onClick={() => setIsCreatePanelOpen(true)}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300"
            >
              Nowa realizacja
            </button>
          ) : null}
        </div>

        {isLoading && <p className="text-zinc-400">Ładowanie realizacji...</p>}
```

Replace with:

```tsx
          {canManageRealizations ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
              >
                Importuj z JSON
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => setIsCreatePanelOpen(true)}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300"
              >
                Nowa realizacja
              </button>
            </div>
          ) : null}
        </div>

        {importError && (
          <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {importError}
          </div>
        )}

        {isLoading && <p className="text-zinc-400">Ładowanie realizacji...</p>}
```

- [ ] **Step 4: Pass `initialData` into `CreateRealizationForm` and clear it on close**

Find:

```tsx
        {canManageRealizations && isCreatePanelOpen && (
          <CreateRealizationForm
            scenarios={scenarios ?? []}
            stations={stations ?? []}
            realizations={realizations ?? []}
            userEmail={meData?.user.email}
            onSaved={(savedRealization) => setEditingRealization(savedRealization)}
            onClose={() => setIsCreatePanelOpen(false)}
          />
        )}
```

Replace with:

```tsx
        {canManageRealizations && isCreatePanelOpen && (
          <CreateRealizationForm
            scenarios={scenarios ?? []}
            stations={stations ?? []}
            realizations={realizations ?? []}
            userEmail={meData?.user.email}
            initialData={importInitialData ?? undefined}
            onSaved={(savedRealization) => setEditingRealization(savedRealization)}
            onClose={() => {
              setIsCreatePanelOpen(false);
              setImportInitialData(null);
            }}
          />
        )}
```

- [ ] **Step 5: Lint**

Run: `pnpm --filter admin lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/app/realizations/page.tsx
git commit -m "feat(admin): add JSON import entry point to realizations page"
```

---

### Task 6: Full verification

**Files:** none (verification only)

**Interfaces:** none — exercises the full feature built in Tasks 1-5.

- [ ] **Step 1: Full build**

Run: `pnpm --filter admin build`
Expected: build succeeds with no type errors (this is the only type-checking gate available, since `apps/admin` has no standalone `tsc --noEmit` script).

- [ ] **Step 2: Manual smoke test — export**

Run: `pnpm dev:admin`, log in, open `/realizations`.
1. Click "Pobierz JSON" on any realization row with at least one station.
2. Confirm a `realizacja-<slug>-<date>.json` file downloads.
3. Open it and confirm it has `schemaVersion: 1`, an `exportedAt` timestamp, a `realization` object with company/contact/settings fields (no `id`, `scenarioId`, `joinCode`, or `logs` keys), and a `scenarioStations` array where each station has no `id` key.

- [ ] **Step 3: Manual smoke test — import**

1. On `/realizations`, click "Importuj z JSON" and select the file downloaded in Step 2.
2. Confirm the "Nowa realizacja" panel opens with company name, contact info, game settings, and the station list already filled in and matching the source realization.
3. Confirm "Scenariusz (szablon)" is empty and must be picked manually.
4. Pick a scenario template, submit, and confirm the new realization appears in the table with the same station count/points/settings as the source (scenario/join code/ids will differ, which is expected).

- [ ] **Step 4: Manual smoke test — bad file**

1. Click "Importuj z JSON" again and select an unrelated/non-JSON file (or a `.json` file with `{"foo": "bar"}`).
2. Confirm the red "Niepoprawny plik JSON realizacji." (or "Nie udało się odczytać pliku JSON.") banner appears and no panel opens.

- [ ] **Step 5: Final commit (only if Step 2-4 required fixes)**

If any manual check above required a code fix, stage and commit it with a message describing the fix. If all checks passed with no changes, skip this step.
