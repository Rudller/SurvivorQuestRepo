"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  useGetCurrentRealizationPointsQrCodesQuery,
  useCreateCurrentRealizationPointsQrCodeMutation,
  useDeleteCurrentRealizationPointsQrCodeMutation,
  useGetPointsQrCodeSuggestionsQuery,
  type PointsQrClaimMode,
} from "@/features/current-realization/api/current-realization.api";
import { buildPointsQrCodeFileName } from "@/shared/lib/station-qr-file-name";
import { addCaptionToQrImageDataUrl } from "@/shared/lib/qr-image-caption";
import { QrImageLightbox, type QrImageLightboxImage } from "@/shared/components/qr-image-lightbox";
import { generateSampleCompletionCode } from "@/features/games/station.utils";

type PointsQrCodesManagerProps = {
  realizationId: string;
  realizationName: string;
};

const QR_IMAGE_WIDTH = 220;

function getClaimModeLabel(mode: PointsQrClaimMode) {
  return mode === "FIRST_TEAM" ? "Tylko pierwsza drużyna" : "Każda drużyna raz";
}

export function PointsQrCodesManager({ realizationId, realizationName }: PointsQrCodesManagerProps) {
  const { data, isLoading, isError } = useGetCurrentRealizationPointsQrCodesQuery({ realizationId });
  const [createPointsQrCode, { isLoading: isCreating }] = useCreateCurrentRealizationPointsQrCodeMutation();
  const [deletePointsQrCode] = useDeleteCurrentRealizationPointsQrCodeMutation();
  const { data: codeSuggestions } = useGetPointsQrCodeSuggestionsQuery();

  const [points, setPoints] = useState(10);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [claimMode, setClaimMode] = useState<PointsQrClaimMode>("PER_TEAM");
  const [formError, setFormError] = useState<string | null>(null);
  const [qrImagesByCodeId, setQrImagesByCodeId] = useState<Record<string, string>>({});
  const [lightboxImage, setLightboxImage] = useState<QrImageLightboxImage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setQrImagesByCodeId({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      data.entries.map(async (entry) => {
        const qrImage = await QRCode.toDataURL(entry.code, {
          margin: 1,
          width: QR_IMAGE_WIDTH,
          errorCorrectionLevel: "M",
        });
        try {
          const withCaption = await addCaptionToQrImageDataUrl(qrImage, entry.label || entry.code);
          return [entry.id, withCaption] as const;
        } catch {
          return [entry.id, qrImage] as const;
        }
      }),
    ).then((items) => {
      if (!cancelled) {
        setQrImagesByCodeId(Object.fromEntries(items));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [data]);

  async function handleCreate() {
    setFormError(null);

    if (!Number.isFinite(points) || points <= 0) {
      setFormError("Podaj poprawną liczbę punktów (większą od zera).");
      return;
    }

    try {
      await createPointsQrCode({
        realizationId,
        points: Math.round(points),
        label: label.trim() || undefined,
        code: code.trim() || undefined,
        claimMode,
      }).unwrap();
      setPoints(10);
      setLabel("");
      setCode("");
      setClaimMode("PER_TEAM");
    } catch {
      setFormError("Nie udało się utworzyć kodu punktowego.");
    }
  }

  async function handleDelete(pointsQrCodeId: string) {
    setDeletingId(pointsQrCodeId);
    try {
      await deletePointsQrCode({ realizationId, pointsQrCodeId }).unwrap();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Skan takiego kodu tylko przyznaje drużynie punkty — nie jest to stanowisko, więc nie pojawia się na liście
        zadań i nie wpływa na ukończenie gry.
      </p>

      <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h3 className="text-sm font-semibold text-zinc-100">Nowy kod punktowy</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Punkty</span>
            <input
              type="number"
              min={1}
              value={points}
              onChange={(event) => setPoints(Number(event.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Etykieta (tylko dla admina, opcjonalna)</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Np. Bonus przy fontannie"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Kod QR</span>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              list="points-qr-code-suggestions"
              placeholder="Zostaw puste, aby wygenerować automatycznie"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
            <datalist id="points-qr-code-suggestions">
              {(codeSuggestions ?? []).map((suggestion) => (
                <option key={suggestion.code} value={suggestion.code}>
                  {suggestion.label ? `${suggestion.label} (${suggestion.points} pkt)` : `${suggestion.points} pkt`}
                </option>
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => setCode(generateSampleCompletionCode(8, "letters"))}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500"
            >
              Wygeneruj
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Zostaw puste, aby system wygenerował nowy losowy kod. Wybierz z podpowiedzi już użyty kod, aby ta sama
            naklejka QR pasowała też do tego kodu punktowego.
          </p>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Kto może zeskanować</span>
          <div className="inline-flex w-fit rounded-lg border border-zinc-700 bg-zinc-900 p-1">
            {(["PER_TEAM", "FIRST_TEAM"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setClaimMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  claimMode === mode ? "bg-amber-400 text-zinc-950" : "text-zinc-300 hover:text-zinc-100"
                }`}
              >
                {getClaimModeLabel(mode)}
              </button>
            ))}
          </div>
        </label>
        {formError ? <p className="text-xs text-red-300">{formError}</p> : null}
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isCreating}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
        >
          {isCreating ? "Tworzenie..." : "Utwórz kod"}
        </button>
      </div>

      {isLoading && <p className="text-sm text-zinc-400">Ładowanie kodów...</p>}
      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Nie udało się pobrać kodów punktowych dla realizacji.
        </div>
      )}

      {!isLoading && !isError && data && data.entries.length === 0 ? (
        <p className="text-sm text-zinc-500">Brak kodów punktowych. Utwórz pierwszy powyżej.</p>
      ) : null}

      {!isLoading && !isError && data && data.entries.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.entries.map((entry) => {
            const qrImage = qrImagesByCodeId[entry.id];
            const fileName = buildPointsQrCodeFileName(realizationName, entry.label, entry.code);

            return (
              <article key={entry.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{entry.label || entry.code}</h3>
                    <p className="text-xs text-zinc-500">
                      {entry.points} pkt • {getClaimModeLabel(entry.claimMode)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    className="shrink-0 rounded-md border border-red-500/40 px-2 py-1 text-[11px] text-red-300 transition hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === entry.id ? "Usuwanie..." : "Usuń"}
                  </button>
                </div>

                <div className="mt-3 flex min-h-56 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                  {qrImage ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          src: qrImage,
                          downloadSrc: qrImage,
                          alt: `Kod QR ${entry.code}`,
                          downloadFileName: fileName,
                          caption: entry.label || entry.code,
                        })
                      }
                      className="cursor-zoom-in rounded-md transition hover:opacity-90"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrImage} alt={`Kod QR ${entry.code}`} className="h-48 w-48 rounded-md bg-white p-1" />
                    </button>
                  ) : (
                    <p className="text-xs text-zinc-500">Renderowanie kodu...</p>
                  )}
                </div>

                <p className="mt-2 text-center text-[11px] text-zinc-500">
                  Zeskanowany {entry.claimCount}× {entry.claimMode === "FIRST_TEAM" && entry.claimCount > 0 ? "(kod wyczerpany)" : ""}
                </p>

                {qrImage ? (
                  <a
                    href={qrImage}
                    download={fileName}
                    className="mt-3 block rounded-md border border-zinc-700 px-2.5 py-1.5 text-center text-xs text-zinc-200 transition hover:border-zinc-500"
                  >
                    Pobierz PNG
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      <QrImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
