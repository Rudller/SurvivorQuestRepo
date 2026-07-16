export type GalleryPhotoKind = "TEAM_SELFIE" | "TASK_PROOF";

export type GalleryPhoto = {
  id: string;
  kind: GalleryPhotoKind;
  url: string;
  teamId: string;
  teamName: string | null;
  teamColor: string | null;
  stationName: string | null;
  createdAt: string;
};

export type GalleryRealizationSummary = {
  companyName: string;
  scheduledAt: string;
  location: string | null;
};

export type GalleryPhotosResponse = {
  realization: GalleryRealizationSummary;
  photos: GalleryPhoto[];
};

export type GalleryTeamGroup = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  selfie: GalleryPhoto | null;
  taskPhotos: GalleryPhoto[];
};
