import type { ExpeditionCaseFile, ExpeditionTask } from "../model/types";

/**
 * Czyste reguły akt sprawy, wyjęte z komponentu, żeby dało się je przypiąć
 * testem bez renderowania modala.
 */

/**
 * Kolejność w teczce ustala admin, serwer wysyła ją w `order`.
 *
 * Remis rozstrzygany identyfikatorem, nie kolejnością w tablicy: bez tego dwa
 * dowody o tym samym `order` potrafiłyby zamieniać się miejscami między
 * kolejnymi odpytaniami stanu sesji i teczka „mrugałaby" w trakcie gry.
 */
export function sortCaseFiles(caseFiles: ExpeditionCaseFile[]): ExpeditionCaseFile[] {
  return [...caseFiles].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function countUnlockedCaseFiles(caseFiles: ExpeditionCaseFile[]): number {
  return caseFiles.filter((caseFile) => !caseFile.locked).length;
}

/**
 * Numer stanowiska w numeracji TEJ drużyny.
 *
 * Serwer wysyła przy zablokowanym dowodzie samo `unlockStationId`, bo numeracja
 * bywa rotowana per drużyna (`teamStationNumberingEnabled`). Mapowanie musi więc
 * powstać na urządzeniu, z `tasks`, które i tak są w stanie sesji.
 */
export function resolveUnlockStationNumber(
  caseFile: ExpeditionCaseFile,
  tasks: ExpeditionTask[],
): number | null {
  if (!caseFile.unlockStationId) {
    return null;
  }

  const task = tasks.find((item) => item.stationId === caseFile.unlockStationId);

  return task?.stationNumber ?? null;
}
