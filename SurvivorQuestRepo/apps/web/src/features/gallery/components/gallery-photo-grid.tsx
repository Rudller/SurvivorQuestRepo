"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { GalleryPhoto, GalleryRealizationSummary } from "../types";
import { groupPhotosByTeam } from "../lib/group-photos";
import { GalleryLightbox } from "./gallery-lightbox";

type GalleryPhotoGridProps = {
  realization: GalleryRealizationSummary;
  photos: GalleryPhoto[];
};

const ALL_TEAMS_FILTER = "all";

export function GalleryPhotoGrid({ realization, photos }: GalleryPhotoGridProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(ALL_TEAMS_FILTER);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);

  const teamGroups = useMemo(() => groupPhotosByTeam(photos), [photos]);
  const visibleGroups = useMemo(
    () =>
      selectedTeamId === ALL_TEAMS_FILTER
        ? teamGroups
        : teamGroups.filter((group) => group.teamId === selectedTeamId),
    [teamGroups, selectedTeamId],
  );

  const scheduledDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" }).format(new Date(realization.scheduledAt));
    } catch {
      return null;
    }
  }, [realization.scheduledAt]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c977]">SurvivorQuest</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#f3f5ef] sm:text-3xl">{realization.companyName}</h1>
        <p className="text-sm text-[#bdcdbf]">
          {[scheduledDate, realization.location].filter(Boolean).join(" • ")}
        </p>
      </header>

      {teamGroups.length === 0 ? (
        <p className="rounded-2xl border border-[#446251]/70 bg-[#12221b]/85 p-6 text-sm text-[#bdcdbf]">
          Brak zdjęć do wyświetlenia.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <TeamFilterPill
              label="Wszystkie drużyny"
              isActive={selectedTeamId === ALL_TEAMS_FILTER}
              onClick={() => setSelectedTeamId(ALL_TEAMS_FILTER)}
            />
            {teamGroups.map((group) => (
              <TeamFilterPill
                key={group.teamId}
                label={group.teamName}
                color={group.teamColor}
                isActive={selectedTeamId === group.teamId}
                onClick={() => setSelectedTeamId(group.teamId)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-10">
            {visibleGroups.map((group) => (
              <section key={group.teamId} className="space-y-4">
                <div className="flex items-center gap-3">
                  {group.teamColor ? (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: group.teamColor }}
                      aria-hidden
                    />
                  ) : null}
                  <h2 className="text-lg font-semibold text-[#f3f5ef]">{group.teamName}</h2>
                </div>

                {group.selfie || group.taskPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {group.selfie ? (
                      <PhotoThumbnail photo={group.selfie} isCover onClick={() => setActivePhoto(group.selfie)} />
                    ) : null}
                    {group.taskPhotos.map((photo) => (
                      <PhotoThumbnail key={photo.id} photo={photo} onClick={() => setActivePhoto(photo)} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#bdcdbf]">Brak zdjęć tej drużyny.</p>
                )}
              </section>
            ))}
          </div>
        </>
      )}

      <GalleryLightbox photo={activePhoto} onClose={() => setActivePhoto(null)} />
    </div>
  );
}

function TeamFilterPill({
  label,
  color,
  isActive,
  onClick,
}: {
  label: string;
  color?: string | null;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
        isActive
          ? "border-[#f0c977]/70 bg-[#f0c977]/15 text-[#f0c977]"
          : "border-[#446251] bg-[#12221b]/80 text-[#bdcdbf] hover:border-[#f0c977]/40 hover:text-[#f3f5ef]"
      }`}
    >
      {color ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden /> : null}
      {label}
    </button>
  );
}

function PhotoThumbnail({
  photo,
  isCover,
  onClick,
}: {
  photo: GalleryPhoto;
  isCover?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative aspect-square overflow-hidden rounded-xl border ${
        isCover ? "border-[#f0c977]/50" : "border-[#446251]/70"
      } bg-[#0d1612]`}
    >
      <Image
        src={photo.url}
        alt={photo.stationName ?? (isCover ? "Selfie drużyny" : "Zdjęcie zadania")}
        fill
        sizes="(min-width: 768px) 25vw, 50vw"
        className="object-cover transition duration-200 group-hover:scale-105"
      />
      {isCover ? (
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#12221b]/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#f0c977]">
          Selfie
        </span>
      ) : null}
    </button>
  );
}
