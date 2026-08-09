export function sanitizeFileNamePart(value: string, fallback: string) {
  const normalized = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "");

  return normalized.length > 0 ? normalized : fallback;
}

export function buildStationQrFileName(realizationName: string, stationName: string) {
  const safeRealizationName = sanitizeFileNamePart(realizationName, "realizacja");
  const safeStationName = sanitizeFileNamePart(stationName, "stanowisko");
  return `${safeRealizationName} - ${safeStationName}.png`;
}

export function buildStationQrHuntCodeFileName(realizationName: string, stationName: string, code: string) {
  const safeRealizationName = sanitizeFileNamePart(realizationName, "realizacja");
  const safeStationName = sanitizeFileNamePart(stationName, "stanowisko");
  const safeCode = sanitizeFileNamePart(code, "kod");
  return `${safeRealizationName} - ${safeStationName} - ${safeCode}.png`;
}

export function buildStationQrArchiveFileName(realizationName: string) {
  const safeRealizationName = sanitizeFileNamePart(realizationName, "realizacja");
  return `${safeRealizationName} - kody-qr.zip`;
}

export function buildPointsQrCodeFileName(realizationName: string, label: string | null, code: string) {
  const safeRealizationName = sanitizeFileNamePart(realizationName, "realizacja");
  const safeLabel = sanitizeFileNamePart(label ?? code, "kod-punktowy");
  return `${safeRealizationName} - Punkty - ${safeLabel}.png`;
}
