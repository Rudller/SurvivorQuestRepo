import type { GalleryPhoto, GalleryTeamGroup } from "../types";

export function groupPhotosByTeam(photos: GalleryPhoto[]): GalleryTeamGroup[] {
  const groups = new Map<string, GalleryTeamGroup>();

  for (const photo of photos) {
    let group = groups.get(photo.teamId);
    if (!group) {
      group = {
        teamId: photo.teamId,
        teamName: photo.teamName || "Drużyna",
        teamColor: photo.teamColor,
        selfie: null,
        taskPhotos: [],
      };
      groups.set(photo.teamId, group);
    }

    if (photo.kind === "TEAM_SELFIE") {
      group.selfie = photo;
    } else {
      group.taskPhotos.push(photo);
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.teamName.localeCompare(b.teamName, "pl"));
}
