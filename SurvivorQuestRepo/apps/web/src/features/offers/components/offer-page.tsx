import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { getContactEmail, getContactPhone, toDialablePhone } from "@/lib/contact";
import { OFFERS, type Offer } from "@/features/offers/model/offers";
import { OfferDownloadButton } from "@/features/offers/components/offer-download-button";

/**
 * One layout for every offer, rendered from a registry entry.
 *
 * Deliberately short. Most visitors arrive by scanning a printed code while
 * walking a trade-fair floor on a bad connection, so the download button sits
 * above the fold on a 375px phone — headline, one paragraph, button — and the
 * supporting detail follows underneath for whoever actually stops to read.
 */
export function OfferPage({ offer }: { offer: Offer }) {
  const contactEmail = getContactEmail();
  const contactPhone = getContactPhone();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="space-y-4">
        <Link href="/" className="inline-block text-xs font-semibold">
          <Wordmark />
        </Link>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ivory sm:text-4xl">
          {offer.title}
        </h1>
        <p className="text-sm leading-relaxed text-ivory-muted sm:text-base">{offer.lead}</p>
      </header>

      <section className="space-y-3">
        <OfferDownloadButton
          pdfPath={offer.pdfPath}
          offerSlug={offer.slug}
          label="Pobierz ofertę PDF"
        />
        <p className="text-xs text-ivory-faint">{offer.pdfNote}</p>
      </section>

      <section
        aria-label="Co obejmuje oferta"
        className="rounded-2xl border border-line/70 bg-graphite/85 p-5 sm:p-6"
      >
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-soft">
          Co organizujemy
        </h2>
        <ul className="mt-4 space-y-3">
          {offer.points.map((point) => (
            <li key={point} className="flex gap-3 text-sm text-ivory-muted sm:text-base">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Kontakt" className="rounded-2xl bg-ink p-5 sm:p-6">
        <h2 className="font-semibold text-ivory">Porozmawiajmy o Waszym evencie</h2>
        <p className="mt-2 text-sm text-ivory-muted">
          Podaj liczbę osób, termin i miejsce — wrócimy z propozycją formatu i wyceną.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`tel:${toDialablePhone(contactPhone)}`}
            className="inline-flex items-center justify-center rounded-xl bg-graphite px-5 py-3 text-sm font-semibold text-ivory transition hover:-translate-y-0.5 hover:bg-graphite-hi hover:text-amber-soft"
          >
            {contactPhone}
          </Link>
          <Link
            href={`mailto:${contactEmail}`}
            className="inline-flex items-center justify-center rounded-xl bg-graphite px-5 py-3 text-sm font-semibold text-ivory transition hover:-translate-y-0.5 hover:bg-graphite-hi hover:text-amber-soft"
          >
            {contactEmail}
          </Link>
        </div>
      </section>

      {/* Only worth a link once there is something else to go back to. */}
      {OFFERS.length > 1 ? (
        <p className="text-sm text-ivory-faint">
          <Link href="/oferta" className="text-amber underline-offset-4 hover:underline">
            ← Wszystkie oferty
          </Link>
        </p>
      ) : null}

      <p className="text-sm text-ivory-faint">
        Więcej o formatach, zdjęcia i odpowiedzi na częste pytania:{" "}
        <Link href="/" className="text-amber underline-offset-4 hover:underline">
          survivorquest.pl
        </Link>
      </p>
    </main>
  );
}
