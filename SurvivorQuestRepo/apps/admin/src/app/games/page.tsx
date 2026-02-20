"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useCreateGameMutation, useGetGamesQuery } from "@/features/games/api/game.api";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
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

  const { data: games, isLoading: isGamesLoading, isError, error, refetch } = useGetGamesQuery(undefined, {
    skip: !meData,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [points, setPoints] = useState(100);
  const [formError, setFormError] = useState<string | null>(null);

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
        <section className="space-y-4 p-6 lg:p-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Gry</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Twórz gry, które później przypiszesz do realizacji.
            </p>
          </div>

          <form
            className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setFormError(null);

              if (!name.trim() || !description.trim() || points <= 0) {
                setFormError("Uzupełnij nazwę, opis i poprawną liczbę punktów.");
                return;
              }

              try {
                await createGame({
                  name: name.trim(),
                  description: description.trim(),
                  imageUrl: imageUrl.trim() || undefined,
                  points,
                }).unwrap();
                setName("");
                setDescription("");
                setImageUrl("");
                setPoints(100);
              } catch {
                setFormError("Nie udało się utworzyć gry.");
              }
            }}
          >
            <h2 className="text-lg font-semibold">Dodaj grę</h2>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nazwa gry"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Krótki opis gry"
              rows={3}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="URL obrazka (opcjonalne)"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
            <input
              type="number"
              min={1}
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
              placeholder="Punkty za wykonanie"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
            {formError && <p className="text-sm text-red-300">{formError}</p>}
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {isCreating ? "Dodawanie..." : "Dodaj grę"}
            </button>
          </form>

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
            <div className="grid gap-3 sm:grid-cols-2">
              {(games ?? []).map((game) => (
                <article key={game.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <Image
                    src={game.imageUrl}
                    alt={game.name}
                    width={640}
                    height={256}
                    className="mb-3 h-32 w-full rounded-lg border border-zinc-800 object-cover"
                  />
                  <h3 className="font-semibold text-zinc-100">{game.name}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{game.description}</p>
                  <p className="mt-2 text-sm font-medium text-amber-300">Punkty: {game.points}</p>
                </article>
              ))}
              {games?.length === 0 && <p className="text-zinc-400">Brak gier. Dodaj pierwszą.</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
