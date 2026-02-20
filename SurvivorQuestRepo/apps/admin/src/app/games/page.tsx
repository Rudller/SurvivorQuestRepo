"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { ClipboardEvent } from "react";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import {
  useCreateGameMutation,
  useDeleteGameMutation,
  useGetGamesQuery,
  useUpdateGameMutation,
} from "@/features/games/api/game.api";
import type { Game, GameType } from "@/features/games/types/game";
import { gameTypeOptions } from "@/features/games/types/game";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

type ImageInputMode = "upload" | "paste" | "url";
type SortField = "name" | "type";
type SortDirection = "asc" | "desc";

const imageModeOptions: { value: ImageInputMode; label: string }[] = [
  { value: "upload", label: "Upload" },
  { value: "paste", label: "Wklej" },
  { value: "url", label: "URL" },
];

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim()) || value.trim().startsWith("data:image/");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nie udało się odczytać pliku."));
    reader.readAsDataURL(file);
  });
}

function getGameTypeLabel(type: GameType) {
  return gameTypeOptions.find((option) => option.value === type)?.label ?? "Inna";
}

function clampTimeLimitSeconds(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.min(600, Math.round(value));
}

function formatTimeLimit(seconds: number) {
  if (seconds === 0) {
    return "Brak limitu czasu";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const paddedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${minutes}:${paddedSeconds}`;
}

export default function GamesPage() {
  const router = useRouter();

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [createGame, { isLoading: isCreating }] = useCreateGameMutation();
  const [updateGame, { isLoading: isUpdating }] = useUpdateGameMutation();
  const [deleteGame, { isLoading: isDeleting }] = useDeleteGameMutation();

  const { data: games, isLoading: isGamesLoading, isError, error, refetch } = useGetGamesQuery(undefined, {
    skip: !meData,
  });

  const [name, setName] = useState("");
  const [type, setType] = useState<GameType>("quiz");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [points, setPoints] = useState(100);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    name: string;
    type: GameType;
    description: string;
    imageUrl: string;
    points: number;
    timeLimitSeconds: number;
  }>({
    name: "",
    type: "quiz",
    description: "",
    imageUrl: "",
    points: 100,
    timeLimitSeconds: 0,
  });

  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [imageError, setImageError] = useState<string | null>(null);
  const [editImageError, setEditImageError] = useState<string | null>(null);
  const [createImageMode, setCreateImageMode] = useState<ImageInputMode>("upload");
  const [editImageMode, setEditImageMode] = useState<ImageInputMode>("upload");

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const previewName = name.trim() || "Nowa gra";
  const previewDescription = description.trim() || "Krótki opis gry pojawi się tutaj.";
  const previewImage = imageUrl.trim() || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(previewName)}`;

  const editPreviewName = editValues.name.trim() || "Nazwa gry";
  const editPreviewDescription = editValues.description.trim() || "Opis gry pojawi się tutaj.";
  const editPreviewImage =
    editValues.imageUrl.trim() || `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(editPreviewName)}`;

  const sortedGames = useMemo(() => {
    const list = [...(games ?? [])];

    list.sort((left, right) => {
      const a = sortField === "name" ? left.name : getGameTypeLabel(left.type);
      const b = sortField === "name" ? right.name : getGameTypeLabel(right.type);
      const base = a.localeCompare(b, "pl", { sensitivity: "base" });

      if (base === 0) {
        return left.name.localeCompare(right.name, "pl", { sensitivity: "base" });
      }

      return sortDirection === "asc" ? base : -base;
    });

    return list;
  }, [games, sortField, sortDirection]);

  const applyImageValue = (value: string, mode: "create" | "edit") => {
    if (mode === "create") {
      setImageUrl(value);
      setImageError(null);
      return;
    }

    setEditValues((prev) => ({ ...prev, imageUrl: value }));
    setEditImageError(null);
  };

  const handleImageFile = async (file: File | null, mode: "create" | "edit") => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      if (mode === "create") {
        setImageError("Wybierz plik obrazu.");
      } else {
        setEditImageError("Wybierz plik obrazu.");
      }
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      applyImageValue(dataUrl, mode);
    } catch {
      if (mode === "create") {
        setImageError("Nie udało się odczytać pliku obrazu.");
      } else {
        setEditImageError("Nie udało się odczytać pliku obrazu.");
      }
    }
  };

  const handleImagePaste = async (event: ClipboardEvent<HTMLDivElement>, mode: "create" | "edit") => {
    const fileItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));

    if (fileItem) {
      event.preventDefault();
      await handleImageFile(fileItem.getAsFile(), mode);
      return;
    }

    const text = event.clipboardData.getData("text");
    if (text && looksLikeUrl(text)) {
      event.preventDefault();
      applyImageValue(text.trim(), mode);
      return;
    }

    if (mode === "create") {
      setImageError("Wklej obraz lub poprawny URL.");
    } else {
      setEditImageError("Wklej obraz lub poprawny URL.");
    }
  };

  useEffect(() => {
    if (isMeError && isUnauthorized(meError)) {
      router.replace("/login");
    }
  }, [isMeError, meError, router]);

  if (isMeLoading) {
    return <main className="p-8">Sprawdzanie sesji...</main>;
  }

  if (isMeError) {
    return <main className="p-8">Przekierowanie do logowania...</main>;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <AdminSidebar
        userEmail={meData?.user.email}
        isLoggingOut={isLoggingOut}
        onLogout={async () => {
          await logout().unwrap();
          router.replace("/login");
        }}
      />

      <div className="min-h-screen pl-72">
        <section className="space-y-5 p-6 lg:space-y-6 lg:p-8">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,1fr)] xl:items-start">
          <form
            className="grid gap-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 xl:order-2 xl:sticky xl:top-6"
            onSubmit={async (event) => {
              event.preventDefault();
              setFormError(null);

              if (!name.trim() || !description.trim() || points <= 0) {
                setFormError("Uzupełnij nazwę, opis i poprawną liczbę punktów.");
                return;
              }

              if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds < 0) {
                setFormError("Podaj poprawny limit czasu w sekundach.");
                return;
              }

              try {
                await createGame({
                  name: name.trim(),
                  type,
                  description: description.trim(),
                  imageUrl: imageUrl.trim() || undefined,
                  points,
                  timeLimitSeconds: clampTimeLimitSeconds(timeLimitSeconds),
                }).unwrap();
                setName("");
                setType("quiz");
                setDescription("");
                setImageUrl("");
                setPoints(100);
                setTimeLimitSeconds(0);
                setCreateImageMode("upload");
              } catch {
                setFormError("Nie udało się utworzyć gry.");
              }
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Nowa gra</h2>
                <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">Robocza</span>
              </div>

              <div className="grid gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa gry</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Np. Night Mission"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Typ gry</span>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as GameType)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  >
                    {gameTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Krótki opis gry"
                    rows={4}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Obraz gry (URL opcjonalny)</span>
                  <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                    <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
                      {imageModeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCreateImageMode(option.value)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                            createImageMode === option.value
                              ? "bg-amber-400 text-zinc-950"
                              : "text-zinc-300 hover:text-zinc-100"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {createImageMode === "upload" && (
                      <div className="space-y-2">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500">
                          Wybierz plik obrazu
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              void handleImageFile(event.target.files?.[0] ?? null, "create");
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <p className="text-xs text-zinc-500">Obsługiwane: PNG, JPG, WEBP, SVG.</p>
                      </div>
                    )}

                    {createImageMode === "paste" && (
                      <div
                        onPaste={(event) => {
                          void handleImagePaste(event, "create");
                        }}
                        className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/70 px-3 py-3 text-xs text-zinc-400"
                      >
                        Skopiuj obraz lub link i wklej tutaj (Ctrl+V).
                      </div>
                    )}

                    {createImageMode === "url" && (
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(event) => {
                          setImageUrl(event.target.value);
                          setImageError(null);
                        }}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-zinc-500">
                        {imageUrl.trim() ? "Obraz ustawiony" : "Brak wybranego obrazu"}
                      </p>
                      {imageUrl.trim() && (
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                        >
                          Wyczyść
                        </button>
                      )}
                    </div>

                    {imageError && <p className="text-xs text-red-300">{imageError}</p>}
                  </div>
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-400">Punkty</span>
                    <div className="flex items-center gap-2">
                      {[50, 100, 150, 200].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPoints(value)}
                          className={`rounded-md border px-2.5 py-1 text-xs transition ${
                            points === value
                              ? "border-amber-300 bg-amber-400/20 text-amber-200"
                              : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={points}
                    onChange={(event) => setPoints(Number(event.target.value))}
                    placeholder="Punkty za wykonanie"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Limit czasu</span>
                  <div
                    className={`space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3 transition ${
                      timeLimitSeconds === 0 ? "opacity-60" : "opacity-100"
                    }`}
                  >
                    <p className="text-lg font-semibold leading-none text-zinc-100">{formatTimeLimit(timeLimitSeconds)}</p>
                  <input
                    type="range"
                    min={0}
                    max={600}
                    step={15}
                    value={timeLimitSeconds}
                    onChange={(event) => setTimeLimitSeconds(clampTimeLimitSeconds(Number(event.target.value)))}
                    className="w-full accent-amber-400"
                  />
                  <input
                    type="number"
                    min={0}
                    max={600}
                    step={15}
                    value={timeLimitSeconds}
                    onChange={(event) => setTimeLimitSeconds(clampTimeLimitSeconds(Number(event.target.value)))}
                    placeholder="0 = brak limitu"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                    <p className="text-xs text-zinc-500">Zakres: 0-10:00 (co 15 sek). Ustaw 0, aby wyłączyć limit czasu.</p>
                  </div>
                </div>
              </div>

              {formError && <p className="text-sm text-red-300">{formError}</p>}

              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {isCreating ? "Dodawanie..." : "Dodaj grę"}
              </button>
            </div>

            <aside className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Podgląd mobilki</p>
              <article className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                <Image
                  src={previewImage}
                  alt={previewName}
                  width={640}
                  height={256}
                  className="mb-3 h-36 w-full rounded-lg border border-zinc-800 object-cover"
                />
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-zinc-100">{previewName}</h3>
                  <span className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                    {getGameTypeLabel(type)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-zinc-400">{previewDescription}</p>
                <p className="mt-2 text-sm font-medium text-amber-300">Punkty: {points}</p>
                <p className="mt-1 text-xs text-zinc-400">Czas: {formatTimeLimit(timeLimitSeconds)}</p>
              </article>
            </aside>
          </form>

          <div className="space-y-5 xl:order-1">
          {isGamesLoading && <p className="text-zinc-400">Ładowanie gier...</p>}

          {isError && (
            <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <p>Nie udało się pobrać gier.</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-red-100/90">{JSON.stringify(error, null, 2)}</pre>
              <button onClick={() => refetch()} className="mt-2 rounded bg-amber-400 px-3 py-1.5 text-zinc-950">
                Spróbuj ponownie
              </button>
            </div>
          )}

          {!isGamesLoading && !isError && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <h3 className="text-sm font-medium text-zinc-200">Lista gier</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-zinc-400">Sortuj po</label>
                  <select
                    value={sortField}
                    onChange={(event) => setSortField(event.target.value as SortField)}
                    className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
                  >
                    <option value="name">Nazwa</option>
                    <option value="type">Typ</option>
                  </select>
                  <select
                    value={sortDirection}
                    onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                    className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none focus:border-amber-400/80"
                  >
                    <option value="asc">Rosnąco</option>
                    <option value="desc">Malejąco</option>
                  </select>
                </div>
              </div>

              {sortedGames.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
                  <p className="text-sm font-medium text-zinc-200">Brak gier</p>
                  <p className="mt-1 text-sm text-zinc-400">Dodaj pierwszą grę w formularzu powyżej.</p>
                </div>
              )}

              {sortedGames.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <div className="grid grid-cols-[72px_1.2fr_1fr_2fr_110px_110px_120px_120px] gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3 text-xs uppercase tracking-wider text-zinc-400">
                    <span>Obraz</span>
                    <span>Nazwa</span>
                    <span>Typ</span>
                    <span>Opis</span>
                    <span>Punkty</span>
                    <span>Czas</span>
                    <span>Aktualizacja</span>
                    <span>Akcje</span>
                  </div>

                  <div className="divide-y divide-zinc-800">
                    {sortedGames.map((game) => (
                      <div key={game.id} className="px-4 py-3">
                        <div className="grid grid-cols-[72px_1.2fr_1fr_2fr_110px_110px_120px_120px] items-center gap-3">
                          <Image
                            src={game.imageUrl}
                            alt={game.name}
                            width={72}
                            height={72}
                            className="h-18 w-18 rounded-lg border border-zinc-800 object-cover"
                          />
                          <p className="line-clamp-2 text-sm font-medium text-zinc-100">{game.name}</p>
                          <span className="w-fit rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                            {getGameTypeLabel(game.type)}
                          </span>
                          <p className="line-clamp-2 text-sm text-zinc-400">{game.description}</p>
                          <p className="text-sm font-medium text-amber-300">{game.points} pkt</p>
                          <p className="text-xs text-zinc-300">{formatTimeLimit(game.timeLimitSeconds)}</p>
                          <p className="text-xs text-zinc-500">{new Date(game.updatedAt).toLocaleDateString("pl-PL")}</p>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGame(game);
                                setEditFormError(null);
                                setDeleteError(null);
                                setDeleteConfirmName("");
                                setEditValues({
                                  name: game.name,
                                  type: game.type,
                                  description: game.description,
                                  imageUrl: game.imageUrl,
                                  points: game.points,
                                  timeLimitSeconds: game.timeLimitSeconds,
                                });
                                setEditImageError(null);
                                setEditImageMode("upload");
                              }}
                              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
                            >
                              Edytuj
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
          </div>
        </section>
      </div>

      {editingGame && (
        <>
          <button
            type="button"
            aria-label="Zamknij edycję"
            onClick={() => setEditingGame(null)}
            className="fixed inset-0 z-40 bg-zinc-950/70"
          />

          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-100">Edytuj grę</h2>
                  <p className="mt-1 text-sm text-zinc-400">Zmieniasz dane gry: {editingGame.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingGame(null)}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
                >
                  Zamknij
                </button>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Podgląd mobilki</p>
                <article className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                  <Image
                    src={editPreviewImage}
                    alt={editPreviewName}
                    width={640}
                    height={256}
                    className="mb-3 h-40 w-full rounded-lg border border-zinc-800 object-cover"
                  />
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-zinc-100">{editPreviewName}</h3>
                    <span className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
                      {getGameTypeLabel(editValues.type)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm text-zinc-400">{editPreviewDescription}</p>
                  <p className="mt-2 text-sm font-medium text-amber-300">Punkty: {editValues.points}</p>
                  <p className="mt-1 text-xs text-zinc-400">Czas: {formatTimeLimit(editValues.timeLimitSeconds)}</p>
                </article>
              </div>

              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setEditFormError(null);

                  if (!editValues.name.trim() || !editValues.description.trim() || editValues.points <= 0) {
                    setEditFormError("Uzupełnij nazwę, opis i poprawną liczbę punktów.");
                    return;
                  }

                  if (!Number.isFinite(editValues.timeLimitSeconds) || editValues.timeLimitSeconds < 0) {
                    setEditFormError("Podaj poprawny limit czasu w sekundach.");
                    return;
                  }

                  try {
                    await updateGame({
                      id: editingGame.id,
                      name: editValues.name.trim(),
                      type: editValues.type,
                      description: editValues.description.trim(),
                      imageUrl: editValues.imageUrl.trim() || undefined,
                      points: editValues.points,
                      timeLimitSeconds: clampTimeLimitSeconds(editValues.timeLimitSeconds),
                    }).unwrap();
                    setEditingGame(null);
                  } catch {
                    setEditFormError("Nie udało się zapisać zmian gry.");
                  }
                }}
                className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa gry</span>
                  <input
                    value={editValues.name}
                    onChange={(event) =>
                      setEditValues((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Nazwa gry"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Typ gry</span>
                  <select
                    value={editValues.type}
                    onChange={(event) =>
                      setEditValues((prev) => ({
                        ...prev,
                        type: event.target.value as GameType,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  >
                    {gameTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Opis</span>
                  <textarea
                    value={editValues.description}
                    onChange={(event) =>
                      setEditValues((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Opis gry"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Obraz gry</span>
                  <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                    <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 p-1">
                      {imageModeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setEditImageMode(option.value)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                            editImageMode === option.value
                              ? "bg-amber-400 text-zinc-950"
                              : "text-zinc-300 hover:text-zinc-100"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {editImageMode === "upload" && (
                      <div className="space-y-2">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500">
                          Wybierz plik obrazu
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              void handleImageFile(event.target.files?.[0] ?? null, "edit");
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <p className="text-xs text-zinc-500">Obsługiwane: PNG, JPG, WEBP, SVG.</p>
                      </div>
                    )}

                    {editImageMode === "paste" && (
                      <div
                        onPaste={(event) => {
                          void handleImagePaste(event, "edit");
                        }}
                        className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/70 px-3 py-3 text-xs text-zinc-400"
                      >
                        Skopiuj obraz lub link i wklej tutaj (Ctrl+V).
                      </div>
                    )}

                    {editImageMode === "url" && (
                      <input
                        type="url"
                        value={editValues.imageUrl}
                        onChange={(event) => {
                          setEditValues((prev) => ({
                            ...prev,
                            imageUrl: event.target.value,
                          }));
                          setEditImageError(null);
                        }}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                      />
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-zinc-500">
                        {editValues.imageUrl.trim() ? "Obraz ustawiony" : "Brak wybranego obrazu"}
                      </p>
                      {editValues.imageUrl.trim() && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditValues((prev) => ({
                              ...prev,
                              imageUrl: "",
                            }))
                          }
                          className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                        >
                          Wyczyść
                        </button>
                      )}
                    </div>

                    {editImageError && <p className="text-sm text-red-300">{editImageError}</p>}
                  </div>
                </div>

                <label className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Punkty</span>
                  <input
                    type="number"
                    min={1}
                    value={editValues.points}
                    onChange={(event) =>
                      setEditValues((prev) => ({
                        ...prev,
                        points: Number(event.target.value),
                      }))
                    }
                    placeholder="Punkty"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-zinc-400">Limit czasu</span>
                  <div
                    className={`space-y-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3 transition ${
                      editValues.timeLimitSeconds === 0 ? "opacity-60" : "opacity-100"
                    }`}
                  >
                    <p className="text-lg font-semibold leading-none text-zinc-100">
                      {formatTimeLimit(editValues.timeLimitSeconds)}
                    </p>
                  <input
                    type="range"
                    min={0}
                    max={600}
                    step={15}
                    value={editValues.timeLimitSeconds}
                    onChange={(event) =>
                      setEditValues((prev) => ({
                        ...prev,
                        timeLimitSeconds: clampTimeLimitSeconds(Number(event.target.value)),
                      }))
                    }
                    className="w-full accent-amber-400"
                  />
                  <input
                    type="number"
                    min={0}
                    max={600}
                    step={15}
                    value={editValues.timeLimitSeconds}
                    onChange={(event) =>
                      setEditValues((prev) => ({
                        ...prev,
                        timeLimitSeconds: clampTimeLimitSeconds(Number(event.target.value)),
                      }))
                    }
                    placeholder="0 = brak limitu"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
                  />
                    <p className="text-xs text-zinc-500">Zakres: 0-10:00 (co 15 sek). Ustaw 0, aby wyłączyć limit czasu.</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingGame(null)}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
                  >
                    {isUpdating ? "Zapisywanie..." : "Zapisz"}
                  </button>
                </div>

                {editFormError && <p className="text-sm text-red-300">{editFormError}</p>}
              </form>

              <section className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <h3 className="text-sm font-semibold text-red-200">Usuń grę</h3>
                <p className="text-xs text-red-200/90">
                  Aby usunąć grę, wpisz dokładnie jej nazwę: <span className="font-semibold">{editingGame.name}</span>
                </p>
                <input
                  value={deleteConfirmName}
                  onChange={(event) => {
                    setDeleteConfirmName(event.target.value);
                    setDeleteError(null);
                  }}
                  placeholder="Wpisz nazwę gry do potwierdzenia"
                  className="w-full rounded-lg border border-red-400/40 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-300"
                />
                <button
                  type="button"
                  disabled={isDeleting || deleteConfirmName.trim() !== editingGame.name}
                  onClick={async () => {
                    setDeleteError(null);

                    if (deleteConfirmName.trim() !== editingGame.name) {
                      setDeleteError("Nazwa gry nie zgadza się z potwierdzeniem.");
                      return;
                    }

                    try {
                      await deleteGame({
                        id: editingGame.id,
                        confirmName: deleteConfirmName.trim(),
                      }).unwrap();
                      setEditingGame(null);
                    } catch {
                      setDeleteError("Nie udało się usunąć gry.");
                    }
                  }}
                  className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? "Usuwanie..." : "Usuń grę"}
                </button>
                {deleteError && <p className="text-sm text-red-200">{deleteError}</p>}
              </section>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}
