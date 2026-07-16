"use client";

import { useState } from "react";

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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c977]">SurvivorQuest</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#f3f5ef] sm:text-3xl">Galeria zdjęć</h1>
        <p className="text-sm text-[#bdcdbf]">
          Podaj kod realizacji, aby zobaczyć zdjęcia z gry.
        </p>
      </header>

      <form
        className="space-y-4 rounded-2xl border border-[#446251]/70 bg-[#12221b]/85 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!code.trim() || isVerifying) {
            return;
          }
          void onSubmit(code.trim());
        }}
      >
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#bdcdbf]">Kod realizacji</span>
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="np. ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full rounded-xl border border-[#446251] bg-[#0d1612] px-4 py-3 text-base font-semibold tracking-wide text-[#f3f5ef] outline-none focus:border-[#f0c977]/60"
          />
        </label>

        {errorMessage ? (
          <p className="text-sm text-[#f0977b]" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!code.trim() || isVerifying}
          className="w-full rounded-xl bg-[#f0c977] px-4 py-3 text-sm font-semibold text-[#12221b] transition hover:bg-[#f3d68f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVerifying ? "Sprawdzanie..." : "Wejdź do galerii"}
        </button>
      </form>
    </div>
  );
}
