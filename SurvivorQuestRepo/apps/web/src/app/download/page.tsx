import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pobierz aplikację | SurvivorQuest",
  description: "Pobierz aplikację mobilną SurvivorQuest na Androida i iOS.",
};

function DownloadButton({
  href,
  label,
  disabledLabel,
}: {
  href?: string;
  label: string;
  disabledLabel: string;
}) {
  if (!href) {
    return (
      <span className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 text-sm font-medium text-zinc-500">
        {disabledLabel}
      </span>
    );
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center rounded-xl bg-[#f0c977] px-4 py-2.5 text-sm font-semibold text-[#13231b] transition hover:bg-[#ffd98d]"
    >
      {label}
    </Link>
  );
}

function AndroidWatermark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="pointer-events-none absolute -right-12 top-1/2 h-56 w-56 -translate-y-1/2 text-[#98ad9c]/15"
      fill="currentColor"
    >
      <path d="m10.213 1.471.691-1.26q.069-.124-.048-.192-.128-.057-.195.058l-.7 1.27A4.8 4.8 0 0 0 8.005.941q-1.032 0-1.956.404l-.7-1.27Q5.281-.037 5.154.02q-.117.069-.049.193l.691 1.259a4.25 4.25 0 0 0-1.673 1.476A3.7 3.7 0 0 0 3.5 5.02h9q0-1.125-.623-2.072a4.27 4.27 0 0 0-1.664-1.476ZM6.22 3.303a.37.37 0 0 1-.267.11.35.35 0 0 1-.263-.11.37.37 0 0 1-.107-.264.37.37 0 0 1 .107-.265.35.35 0 0 1 .263-.11q.155 0 .267.11a.36.36 0 0 1 .112.265.36.36 0 0 1-.112.264m4.101 0a.35.35 0 0 1-.262.11.37.37 0 0 1-.268-.11.36.36 0 0 1-.112-.264q0-.154.112-.265a.37.37 0 0 1 .268-.11q.155 0 .262.11a.37.37 0 0 1 .107.265q0 .153-.107.264M3.5 11.77q0 .441.311.75.311.306.76.307h.758l.01 2.182q0 .414.292.703a.96.96 0 0 0 .7.288.97.97 0 0 0 .71-.288.95.95 0 0 0 .292-.703v-2.182h1.343v2.182q0 .414.292.703a.97.97 0 0 0 .71.288.97.97 0 0 0 .71-.288.95.95 0 0 0 .292-.703v-2.182h.76q.436 0 .749-.308.31-.307.311-.75V5.365h-9zm10.495-6.587a.98.98 0 0 0-.702.278.9.9 0 0 0-.293.685v4.063q0 .406.293.69a.97.97 0 0 0 .702.284q.42 0 .712-.284a.92.92 0 0 0 .293-.69V6.146a.9.9 0 0 0-.293-.685 1 1 0 0 0-.712-.278m-12.702.283a1 1 0 0 1 .712-.283q.41 0 .702.283a.9.9 0 0 1 .293.68v4.063a.93.93 0 0 1-.288.69.97.97 0 0 1-.707.284 1 1 0 0 1-.712-.284.92.92 0 0 1-.293-.69V6.146q0-.396.293-.68" />
    </svg>
  );
}

function AppleWatermark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="pointer-events-none absolute -right-12 top-1/2 h-56 w-56 -translate-y-1/2 text-zinc-200/12"
      fill="currentColor"
    >
      <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
    </svg>
  );
}

export default function DownloadPage() {
  const androidDownloadUrl = process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL?.trim();
  const iosAppStoreUrl = process.env.NEXT_PUBLIC_IOS_APPSTORE_URL?.trim();
  const iosTestFlightUrl = process.env.NEXT_PUBLIC_IOS_TESTFLIGHT_URL?.trim();
  const iosDownloadUrl = iosAppStoreUrl || iosTestFlightUrl;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c977]">SurvivorQuest mobile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#f3f5ef] sm:text-4xl">Pobierz aplikację</h1>
          <p className="mt-3 max-w-3xl text-sm text-[#bdcdbf] sm:text-base">
            Wybierz system i pobierz SurvivorQuest na swoje urządzenie.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-[#446251] bg-[#12221b]/80 px-4 py-2.5 text-sm font-medium text-[#f3f5ef] transition hover:border-[#f0c977]/60 hover:text-[#f0c977]"
        >
          Wróć na stronę główną
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-2xl border border-[#446251]/70 bg-[#12221b]/85 p-5">
          <AndroidWatermark />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ad9c]">Android</p>
            <h2 className="mt-2 text-xl font-semibold text-[#f3f5ef]">Pobierz na Androida</h2>
            <p className="mt-3 text-sm text-[#bdcdbf]">
              Zainstaluj aplikację i dołącz do gry w kilka chwil.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <DownloadButton
                href={androidDownloadUrl}
                label="Pobierz na Androida"
                disabledLabel="Wersja na Androida wkrótce"
              />
            </div>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-2xl border border-[#446251]/70 bg-[#12221b]/85 p-5">
          <AppleWatermark />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#98ad9c]">iOS</p>
            <h2 className="mt-2 text-xl font-semibold text-[#f3f5ef]">Pobierz na iOS</h2>
            <p className="mt-3 text-sm text-[#bdcdbf]">
              Pobierz aplikację na iPhone&apos;a lub iPada i rozpocznij zabawę.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <DownloadButton
                href={iosDownloadUrl}
                label="Pobierz na iOS"
                disabledLabel="Wersja na iOS wkrótce"
              />
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-[#446251]/70 bg-[#162921]/85 p-5">
        <h3 className="text-base font-semibold text-[#f3f5ef]">Gotowi na start?</h3>
        <p className="mt-3 text-sm text-[#bdcdbf]">
          Po instalacji wpisz kod drużyny i wejdź prosto do rozgrywki.
        </p>
      </section>
    </main>
  );
}
