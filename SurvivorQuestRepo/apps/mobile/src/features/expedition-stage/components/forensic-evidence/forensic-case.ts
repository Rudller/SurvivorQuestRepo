// Przykładowa sprawa dla stacji "ar-evidence". Ślady są na razie wbudowane w
// aplikację; podejrzani i sprawca przychodzą z quizu stacji (admin).
//
// Karty do wydruku i obrazy wzorcowe AR generuje
// scripts/generate-ar-evidence-cards.cjs — kod i kolejność muszą się zgadzać.

export type ForensicEvidence = {
  code: string;
  label: string;
  matchPercent: number | null;
  person: string | null;
  detail: string;
};

export const FORENSIC_SAMPLE_CASE = {
  title: "Sprawa: zatruty kieliszek",
  intro: "Gospodarz dworku zasłabł po kolacji. W pokoju zostały ślady — znajdź odciski palców lampą UV.",
  evidence: [
    {
      code: "SQ-SLAD-1",
      label: "Dowód nr 1 · kieliszek ofiary",
      matchPercent: 88,
      person: "Anna Wiśniewska, gospodyni",
      detail: "Podawała napoje przy kolacji — jej odcisk na kieliszku nikogo nie dziwi.",
    },
    {
      code: "SQ-SLAD-2",
      label: "Dowód nr 2 · klamka gabinetu",
      matchPercent: 92,
      person: "Marek Zając, ogrodnik",
      detail: "Odcisk świeży, zostawiony po 22:00. Ogrodnik kończy pracę o 18:00.",
    },
    {
      code: "SQ-SLAD-3",
      label: "Dowód nr 3 · fiolka w koszu",
      matchPercent: 79,
      person: "Marek Zając, ogrodnik",
      detail: "Fiolka po środku na chwasty. Ślad częściowy, ale zgodny.",
    },
    {
      code: "SQ-SLAD-4",
      label: "Dowód nr 4 · drzwiczki sejfu",
      matchPercent: null,
      person: null,
      detail: "Próbka zanieczyszczona — odcisk rozmazany, nie da się ustalić właściciela.",
    },
  ] satisfies ForensicEvidence[],
};

export const FORENSIC_HOLD_TO_ANALYZE_MS = 1600;

export function findForensicEvidence(code: string) {
  return FORENSIC_SAMPLE_CASE.evidence.find((item) => item.code === code) ?? null;
}

// Zebrane ślady żyją w pamięci per stacja, żeby zamknięcie skanera albo karty
// stacji nie kasowało postępu drużyny w trakcie gry.
const collectedByStation = new Map<string, string[]>();

export function readCollectedEvidence(stationId: string) {
  return collectedByStation.get(stationId) ?? [];
}

export function writeCollectedEvidence(stationId: string, codes: string[]) {
  collectedByStation.set(stationId, codes);
}
