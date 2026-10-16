"use client";

import { useState } from "react";

/**
 * Link do publicznej galerii zdjęć realizacji (apps/web, /galeria/{id}).
 *
 * Galeria jest chroniona kodem realizacji — tym samym, którym dołączają
 * tablety — więc klient dostaje link i kod osobno. „Kopiuj wiadomość” składa
 * oba w gotowy tekst do maila albo komunikatora.
 */

const PRODUCTION_WEB_URL = "https://survivorquest.pl";
const LOCAL_WEB_URL = "http://localhost:3000";

export function resolveGalleryUrl(realizationId: string) {
  const configured = process.env.NEXT_PUBLIC_WEB_URL?.trim().replace(/\/+$/, "");
  const isLocal =
    typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const base = configured || (isLocal ? LOCAL_WEB_URL : PRODUCTION_WEB_URL);
  return `${base}/galeria/${realizationId}`;
}

type GalleryLinkActionsProps = {
  realizationId: string;
  joinCode: string | null | undefined;
  /** Zestaw klas przycisków — admin ma tu dwa różne konteksty kolorystyczne. */
  buttonClassName?: string;
};

export function GalleryLinkActions({ realizationId, joinCode, buttonClassName }: GalleryLinkActionsProps) {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const url = resolveGalleryUrl(realizationId);

  async function copy(kind: "link" | "message") {
    const text =
      kind === "link"
        ? url
        : `Zdjęcia z gry: ${url}\nKod dostępu do galerii: ${joinCode ?? ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyError(null);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopyError("Przeglądarka nie pozwoliła skopiować — zaznacz link ręcznie.");
    }
  }

  const buttonClass =
    buttonClassName ??
    "rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 transition hover:border-zinc-500";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => void copy("link")} className={buttonClass}>
          {copied === "link" ? "Skopiowano link" : "Kopiuj link do galerii"}
        </button>
        <button
          type="button"
          onClick={() => void copy("message")}
          disabled={!joinCode}
          className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-55`}
        >
          {copied === "message" ? "Skopiowano wiadomość" : "Kopiuj wiadomość dla klienta"}
        </button>
        <a href={url} target="_blank" rel="noreferrer" className={buttonClass}>
          Otwórz galerię
        </a>
      </div>
      {copyError ? <p className="text-[11px] text-red-300">{copyError}</p> : null}
    </div>
  );
}
