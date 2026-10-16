import type { GalleryPhoto } from "../types";

/** Krótki podpis na miniaturze: zadanie, z którego zdjęcie pochodzi. */
export function photoCaption(photo: GalleryPhoto) {
  if (photo.kind === "TEAM_SELFIE") {
    return "Selfie drużyny";
  }
  return photo.stationName ?? "Zdjęcie z zadania";
}

export function photoLabel(photo: GalleryPhoto) {
  if (photo.kind === "TEAM_SELFIE") {
    return `Selfie drużyny ${photo.teamName ?? ""}`.trim();
  }
  return photo.stationName ? `${photo.teamName ?? "Drużyna"}, ${photo.stationName}` : (photo.teamName ?? "Zdjęcie z gry");
}
