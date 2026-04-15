import Link from "next/link";

export default function HomePage() {
  const adminPanelHref =
    process.env.NEXT_PUBLIC_ADMIN_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3100/admin/login" : "/admin/login");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 sm:text-xs">SurvivorQuest</p>
        <Link
          href={adminPanelHref}
          className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-700 px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-amber-400 hover:text-amber-300 sm:w-auto"
        >
          Panel admina
        </Link>
      </header>

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-2xl sm:mt-8 sm:rounded-3xl sm:p-8 lg:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-amber-300 sm:text-sm">Nowa strona główna</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100 sm:mt-4 sm:text-4xl lg:text-5xl">
          Eventy, które angażują od pierwszej minuty.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300 sm:mt-5 sm:text-base lg:text-lg">
          SurvivorQuest łączy gry terenowe, realizacje zespołowe i nowoczesne narzędzia operacyjne. Ta aplikacja jest
          nowym publicznym frontendem projektu pod adresem <span className="text-zinc-100">/</span>.
        </p>

        <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:rounded-2xl">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Gry terenowe</h2>
            <p className="mt-2 text-xs text-zinc-400 sm:text-sm">Scenariusze dopasowane do liczby uczestników i miejsca realizacji.</p>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:rounded-2xl">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Obsługa eventów</h2>
            <p className="mt-2 text-xs text-zinc-400 sm:text-sm">Planowanie i koordynacja realizacji od briefu po podsumowanie.</p>
          </article>
          <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:rounded-2xl">
            <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">Panel operacyjny</h2>
            <p className="mt-2 text-xs text-zinc-400 sm:text-sm">Narzędzia admina zostały przeniesione pod adres /admin.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
