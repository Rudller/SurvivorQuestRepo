"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { GalleryPhoto, GalleryRealizationSummary } from "../types";
import { groupPhotosByTeam } from "../lib/group-photos";
import { photoCaption, photoLabel } from "../lib/photo-labels";
import { GalleryLightbox } from "./gallery-lightbox";
import { Wordmark } from "@/components/wordmark";

type GalleryPhotoGridProps = {
  realization: GalleryRealizationSummary;
  photos: GalleryPhoto[];
  onDownloadAll: () => Promise<void>;
  onDownloadPhoto: (photo: GalleryPhoto) => Promise<void>;
};

const ALL_TEAMS_FILTER = "all";

/** Rząd w układzie murowanym ma najwyżej cztery kolumny — tyle kroków ma kaskada. */
const DEVELOP_STAGGER_STEPS = 4;
const DEVELOP_STAGGER_MS = 110;

export function GalleryPhotoGrid({ realization, photos, onDownloadAll, onDownloadPhoto }: GalleryPhotoGridProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(ALL_TEAMS_FILTER);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [isPreparingArchive, setIsPreparingArchive] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const columnCount = useColumnCount();

  const teamGroups = useMemo(() => groupPhotosByTeam(photos), [photos]);
  const visibleGroups = useMemo(
    () =>
      selectedTeamId === ALL_TEAMS_FILTER
        ? teamGroups
        : teamGroups.filter((group) => group.teamId === selectedTeamId),
    [teamGroups, selectedTeamId],
  );
  const selfies = useMemo(
    () => teamGroups.flatMap((group) => (group.selfie ? [{ group, photo: group.selfie }] : [])),
    [teamGroups],
  );

  // Kolejność przeglądania w powiększeniu = kolejność na stronie, z filtrem.
  const lightboxPhotos = useMemo(
    () => visibleGroups.flatMap((group) => [...(group.selfie ? [group.selfie] : []), ...group.taskPhotos]),
    [visibleGroups],
  );

  const subtitle = useMemo(() => {
    let date: string | null = null;
    try {
      date = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" }).format(new Date(realization.scheduledAt));
    } catch {
      date = null;
    }
    const place = [date, realization.location].filter(Boolean).join(", ");
    const counts = `${formatCount(teamGroups.length, ["drużyna", "drużyny", "drużyn"])}, ${formatCount(photos.length, ["zdjęcie", "zdjęcia", "zdjęć"])}.`;
    return place ? `${place}. ${capitalize(counts)}` : capitalize(counts);
  }, [realization.scheduledAt, realization.location, teamGroups.length, photos.length]);

  async function handleDownloadAll() {
    setDownloadError(null);
    setIsPreparingArchive(true);
    try {
      await onDownloadAll();
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Nie udało się rozpocząć pobierania.");
    } finally {
      // Plik leci już w tle przeglądarki — przycisk wraca po chwili, żeby nie
      // dało się odpalić drugiego ZIP-a jednym podwójnym kliknięciem.
      window.setTimeout(() => setIsPreparingArchive(false), 2500);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold">
            <Wordmark />
          </p>
          {photos.length > 0 ? (
            <button
              type="button"
              onClick={() => void handleDownloadAll()}
              disabled={isPreparingArchive}
              className="rounded-full bg-amber px-4 py-2 text-sm font-semibold text-obsidian transition hover:bg-amber-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber disabled:cursor-wait disabled:opacity-70"
            >
              {isPreparingArchive ? "Przygotowuję plik ZIP…" : `Pobierz wszystkie (${photos.length})`}
            </button>
          ) : null}
        </div>

        <div className="max-w-4xl space-y-4">
          <h1 className="text-[2.75rem] font-extrabold leading-[0.95] tracking-[-0.03em] text-ivory sm:text-7xl">
            {realization.companyName}
          </h1>
          <p className="max-w-2xl text-base text-ivory-muted sm:text-lg">{subtitle}</p>
          {downloadError ? <p className="text-sm text-alert">{downloadError}</p> : null}
        </div>

        {/* Rząd portretów drużyn ma sens od dwóch drużyn — przy jednej
            powtarzałby to samo selfie, które stoi zaraz niżej w jej sekcji. */}
        {selfies.length > 1 ? (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
            {selfies.map(({ group, photo }, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActivePhotoId(photo.id)}
                className="group w-40 shrink-0 snap-start text-left focus-visible:outline-none sm:w-48"
              >
                <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-ink ring-amber/70 group-focus-visible:ring-2">
                  <DevelopingImage
                    photo={photo}
                    alt={`Selfie drużyny ${group.teamName}`}
                    fill
                    sizes="(min-width: 640px) 12rem, 10rem"
                    staggerIndex={index}
                  />
                </span>
                <span className="mt-2 flex items-center gap-2 text-sm font-semibold text-ivory">
                  <TeamColorDot color={group.teamColor} />
                  <span className="truncate">{group.teamName}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {teamGroups.length === 0 ? (
        <p className="max-w-xl text-base text-ivory-muted">
          W tej galerii nie ma jeszcze zdjęć. Pojawią się tu, gdy drużyny zrobią selfie albo zaliczą zadania ze zdjęciem.
        </p>
      ) : (
        <>
          {teamGroups.length > 1 ? (
            <nav
              aria-label="Filtr drużyn"
              className="sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto bg-obsidian/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
            >
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
            </nav>
          ) : null}

          <div className="flex flex-col gap-16">
            {visibleGroups.map((group) => {
              const groupPhotos = [...(group.selfie ? [group.selfie] : []), ...group.taskPhotos];
              return (
                <section key={group.teamId} aria-labelledby={`team-${group.teamId}`} className="space-y-5">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="h-7 w-1.5 shrink-0 self-center rounded-full"
                      style={{ backgroundColor: group.teamColor ?? "var(--color-amber)" }}
                      aria-hidden
                    />
                    <h2 id={`team-${group.teamId}`} className="text-2xl font-bold tracking-tight text-ivory">
                      {group.teamName}
                    </h2>
                    <span className="text-sm text-ivory-faint">
                      {formatCount(groupPhotos.length, ["zdjęcie", "zdjęcia", "zdjęć"])}
                    </span>
                  </div>

                  {/* Kolumny składane ręcznie, wierszami: CSS `columns` układa z
                      góry na dół, więc kolejność czytania i strzałek w
                      powiększeniu rozjeżdżałaby się z tym, co widać. */}
                  <div className="flex items-start gap-3">
                    {distributeIntoColumns(groupPhotos, columnCount).map((column, columnIndex) => (
                      <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-3">
                        {column.map(({ photo, index }) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => setActivePhotoId(photo.id)}
                            className="group relative block w-full overflow-hidden rounded-xl bg-ink text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
                          >
                            <DevelopingImage
                              photo={photo}
                              alt={photoLabel(photo)}
                              sizes="(min-width: 1024px) 18rem, (min-width: 640px) 33vw, 50vw"
                              staggerIndex={index}
                              className="transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            {/* Podpis: z jakiego zadania jest zdjęcie. Przyciemnienie
                                tylko pod tekstem, żeby nie gasić całego kadru. */}
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-obsidian/90 via-obsidian/55 to-transparent px-3 pb-2.5 pt-8 text-sm font-semibold leading-snug text-ivory"
                            >
                              {photoCaption(photo)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      <GalleryLightbox
        photos={lightboxPhotos}
        activePhotoId={activePhotoId}
        onChangePhoto={setActivePhotoId}
        onClose={() => setActivePhotoId(null)}
        onDownloadPhoto={onDownloadPhoto}
      />
    </div>
  );
}

/**
 * Zdjęcie, które „wywołuje się”, gdy wjedzie w widok (klasa .sq-develop w
 * globals.css). Obserwator odpina się po pierwszym razie: zdjęcie już
 * wywołane nie gaśnie przy przewijaniu w górę.
 */
function DevelopingImage({
  photo,
  alt,
  sizes,
  staggerIndex,
  fill,
  className,
}: {
  photo: GalleryPhoto;
  alt: string;
  sizes: string;
  staggerIndex: number;
  fill?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLImageElement | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const developProps = {
    ref,
    sizes,
    src: photo.url,
    onLoad: () => setIsLoaded(true),
    "data-developed": isInView && isLoaded ? "true" : "false",
    style: { "--sq-develop-delay": `${(staggerIndex % DEVELOP_STAGGER_STEPS) * DEVELOP_STAGGER_MS}ms` } as React.CSSProperties,
  };

  if (fill) {
    return <Image {...developProps} alt={alt} fill className={`sq-develop object-cover ${className ?? ""}`} />;
  }

  // Wymiary to tylko podpowiedź dla optymalizatora — `h-auto` oddaje zdjęciu
  // jego prawdziwe proporcje, więc nic nie jest przycinane.
  return (
    <Image {...developProps} alt={alt} width={800} height={1000} className={`sq-develop h-auto w-full ${className ?? ""}`} />
  );
}

/** Zdjęcie `index` trafia do kolumny `index % count` — rzędy czytają się od lewej. */
function distributeIntoColumns(photos: GalleryPhoto[], count: number) {
  const columns: { photo: GalleryPhoto; index: number }[][] = Array.from({ length: count }, () => []);
  photos.forEach((photo, index) => columns[index % count]?.push({ photo, index }));
  return columns;
}

/** 2 kolumny na telefonie, 3 od `sm`, 4 od `lg` — te same progi co Tailwind. */
function useColumnCount() {
  const [count, setCount] = useState(2);

  useEffect(() => {
    const small = window.matchMedia("(min-width: 640px)");
    const large = window.matchMedia("(min-width: 1024px)");
    const update = () => setCount(large.matches ? 4 : small.matches ? 3 : 2);
    update();
    small.addEventListener("change", update);
    large.addEventListener("change", update);
    return () => {
      small.removeEventListener("change", update);
      large.removeEventListener("change", update);
    };
  }, []);

  return count;
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
      aria-pressed={isActive}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber ${
        isActive
          ? "border-amber/70 bg-amber/15 text-amber"
          : "border-line bg-graphite/80 text-ivory-muted hover:border-amber/40 hover:text-ivory"
      }`}
    >
      {color ? <TeamColorDot color={color} /> : null}
      {label}
    </button>
  );
}

function TeamColorDot({ color }: { color: string | null }) {
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color ?? "var(--color-amber)" }}
      aria-hidden
    />
  );
}

/** Polska odmiana liczebników: 1 zdjęcie, 2–4 zdjęcia, 5+ zdjęć (12–14 też „zdjęć”). */
function formatCount(count: number, [one, few, many]: [string, string, string]) {
  if (count === 1) {
    return `1 ${one}`;
  }
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  const form = lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
  return `${count} ${form}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
