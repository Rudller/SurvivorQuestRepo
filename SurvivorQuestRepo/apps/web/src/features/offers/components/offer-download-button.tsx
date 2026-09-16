"use client";

/**
 * The download call to action, and the only client component on the offer page.
 *
 * It is a plain `<a download>` first and an analytics hook second: the click
 * handler never calls `preventDefault`, so the file downloads even if gtag is
 * absent, blocked or throws. Analytics must not stand between a visitor and the
 * offer they scanned a code to get.
 *
 * Note that GA only loads after cookie consent (see `AnalyticsGate`), so this
 * event undercounts — visitors who dismiss the banner still download the file
 * but are never recorded. Treat the number as a floor, not a total.
 */

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params?: Record<string, unknown>) => void;
  }
}

type OfferDownloadButtonProps = {
  pdfPath: string;
  offerSlug: string;
  label: string;
};

export function OfferDownloadButton({ pdfPath, offerSlug, label }: OfferDownloadButtonProps) {
  return (
    <a
      href={pdfPath}
      download
      onClick={() => {
        try {
          window.gtag?.("event", "offer_download", { offer_slug: offerSlug });
        } catch {
          /* Analytics is best effort; the download continues regardless. */
        }
      }}
      className="inline-flex w-full items-center justify-center rounded-xl bg-amber px-6 py-4 text-base font-semibold text-obsidian transition hover:-translate-y-0.5 hover:bg-amber-soft active:translate-y-0 active:bg-amber-deep sm:w-auto sm:px-8"
    >
      {label}
    </a>
  );
}
