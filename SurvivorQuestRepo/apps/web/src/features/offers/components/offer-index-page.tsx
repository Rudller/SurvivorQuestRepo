import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { getContactEmail, getContactPhone, toDialablePhone } from "@/lib/contact";
import { OFFERS, toOfferPath } from "@/features/offers/model/offers";

/**
 * The listing at `/oferta` — one card per entry in the registry.
 *
 * This is the browsing entry point, not the one printed codes point at: a
 * scanned flyer goes straight to its offer so nobody standing in a trade-fair
 * aisle has to pick from a list first.
 */
export function OfferIndexPage() {
  const contactEmail = getContactEmail();
  const contactPhone = getContactPhone();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="space-y-4">
        <Link href="/" className="inline-block text-xs font-semibold">
          <Wordmark />
        </Link>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ivory sm:text-4xl">
          Oferta
        </h1>
        <p className="text-sm leading-relaxed text-ivory-muted sm:text-base">
          Wybierz ofertę, która Was interesuje — każdą można pobrać jako PDF.
        </p>
      </header>

      <ul className="space-y-4">
        {OFFERS.map((offer) => (
          <li key={offer.slug}>
            <Link
              href={toOfferPath(offer)}
              className="block rounded-2xl border border-line/70 bg-graphite/85 p-5 transition hover:-translate-y-0.5 hover:border-amber/60 hover:bg-graphite-hi sm:p-6"
            >
              <h2 className="text-xl font-semibold tracking-tight text-ivory sm:text-2xl">
                {offer.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ivory-muted">{offer.lead}</p>
              <p className="mt-4 text-sm font-semibold text-amber">Zobacz i pobierz PDF →</p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-label="Kontakt" className="rounded-2xl bg-ink p-5 sm:p-6">
        <h2 className="font-semibold text-ivory">Nie wiecie, który format wybrać?</h2>
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
    </main>
  );
}
