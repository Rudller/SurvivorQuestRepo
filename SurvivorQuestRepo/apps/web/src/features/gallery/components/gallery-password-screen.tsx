"use client";

import { useState } from "react";
import { Wordmark } from "@/components/wordmark";

type GalleryPasswordScreenProps = {
  onSubmit: (code: string) => Promise<void>;
  isVerifying: boolean;
  errorMessage: string | null;
};

export function GalleryPasswordScreen({ onSubmit, isVerifying, errorMessage }: GalleryPasswordScreenProps) {
  const [code, setCode] = useState("");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="space-y-2 text-center">
        <p className="text-xs font-semibold">
          <Wordmark />
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-ivory sm:text-3xl">Galeria zdjęć</h1>
        <p className="text-sm text-ivory-muted">
          Podaj kod realizacji, aby zobaczyć zdjęcia z gry.
        </p>
      </header>

      <form
        className="space-y-4 rounded-2xl border border-line/70 bg-graphite/85 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!code.trim() || isVerifying) {
            return;
          }
          void onSubmit(code.trim());
        }}
      >
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">Kod realizacji</span>
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="np. ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full rounded-xl border border-line bg-obsidian px-4 py-3 text-base font-semibold tracking-wide text-ivory outline-none focus:border-amber/60"
          />
        </label>

        {errorMessage ? (
          <p className="text-sm text-alert" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!code.trim() || isVerifying}
          className="w-full rounded-xl bg-amber px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-amber-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVerifying ? "Sprawdzanie..." : "Wejdź do galerii"}
        </button>
      </form>
    </div>
  );
}
