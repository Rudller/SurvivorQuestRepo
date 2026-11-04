import type { CaseFileOwner, CaseFilePayload } from "@/features/realizations/api/realization.api";

/**
 * Dowód dodany w formularzu NOWEGO scenariusza, zanim scenariusz istnieje.
 *
 * Zdjęcia i nagrania wysyła się pod konkretny, zapisany scenariusz, więc do
 * czasu kliknięcia „Utwórz” plik czeka w przeglądarce. `payload.url` trzyma
 * wtedy lokalny adres podglądu (blob:), który przy wysyłce zostaje zastąpiony
 * prawdziwym adresem z magazynu plików.
 */
export type DraftCaseFile = {
  localId: string;
  payload: CaseFilePayload;
  file: File | null;
};

type UploadResult = { url: string; key: string };

export type DraftCaseFileApi = {
  uploadImage: (owner: CaseFileOwner, file: File) => Promise<UploadResult>;
  uploadAudio: (owner: CaseFileOwner, file: File) => Promise<UploadResult>;
  createCaseFile: (owner: CaseFileOwner, payload: CaseFilePayload) => Promise<unknown>;
};

/**
 * Zapisuje dowody robocze po kolei, w kolejności listy — backend nadaje każdemu
 * nowemu dowodowi następny numer, więc kolejność w aktach zgadza się z tą w
 * formularzu. Błąd jednego dowodu nie zatrzymuje pozostałych; zwracamy tytuły
 * tych, które nie weszły, żeby nic nie przepadło po cichu.
 */
export async function saveDraftCaseFiles(
  owner: CaseFileOwner,
  drafts: DraftCaseFile[],
  api: DraftCaseFileApi,
): Promise<{ failedTitles: string[] }> {
  const failedTitles: string[] = [];

  for (const draft of drafts) {
    try {
      let payload = draft.payload;

      if (draft.file && (payload.kind === "image" || payload.kind === "audio")) {
        const uploaded =
          payload.kind === "audio"
            ? await api.uploadAudio(owner, draft.file)
            : await api.uploadImage(owner, draft.file);
        payload = { ...payload, url: uploaded.url, objectKey: uploaded.key };
      }

      await api.createCaseFile(owner, payload);
    } catch {
      failedTitles.push(draft.payload.title);
    }
  }

  return { failedTitles };
}

/** Adres podglądu z przeglądarki trzeba zwolnić, gdy dowód znika z formularza. */
export function releaseDraftPreview(draft: DraftCaseFile) {
  if (draft.payload.url?.startsWith("blob:")) {
    URL.revokeObjectURL(draft.payload.url);
  }
}
