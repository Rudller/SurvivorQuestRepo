"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { GalleryPhoto, GalleryRealizationSummary } from "../types";
import { groupPhotosByTeam } from "../lib/group-photos";
import { GalleryLightbox } from "./gallery-lightbox";
import { Wordmark } from "@/components/wordmark";

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
        <p className="text-xs font-semibold">
          <Wordmark />
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ivory sm:text-3xl">{realization.companyName}</h1>
        <p className="text-sm text-ivory-muted">
          {[scheduledDate, realization.location].filter(Boolean).join(" • ")}
        </p>
      </header>

      {teamGroups.length === 0 ? (
        <p className="rounded-2xl border border-line/70 bg-graphite/85 p-6 text-sm text-ivory-muted">
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
                  <h2 className="text-lg font-semibold text-ivory">{group.teamName}</h2>
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
                  <p className="text-sm text-ivory-muted">Brak zdjęć tej drużyny.</p>
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
          ? "border-amber/70 bg-amber/15 text-amber"
          : "border-line bg-graphite/80 text-ivory-muted hover:border-amber/40 hover:text-ivory"
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
        isCover ? "border-amber/50" : "border-line/70"
      } bg-obsidian`}
    >
      <Image
        src={photo.url}
        alt={photo.stationName ?? (isCover ? "Selfie drużyny" : "Zdjęcie zadania")}
        fill
        sizes="(min-width: 768px) 25vw, 50vw"
        className="object-cover transition duration-200 group-hover:scale-105"
      />
      {isCover ? (
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-graphite/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber">
          Selfie
        </span>
      ) : null}
    </button>
  );
}
