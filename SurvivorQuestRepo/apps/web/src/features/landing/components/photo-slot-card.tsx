type PhotoSlotCardProps = {
  title: string;
  description: string;
  badge?: string;
  className?: string;
};

export function PhotoSlotCard({ title, description, badge, className }: PhotoSlotCardProps) {
  return (
    <article className={`group relative overflow-hidden rounded-3xl bg-[#16261f] p-6 ${className ?? ""}`}>
      <header className="relative">
        <h3 className="text-base font-semibold text-[#f3f5ef] sm:text-lg">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#c3d2c7]">{description}</p>
      </header>

      {/*
        The empty slot reads as empty through a recessed fill rather than a dashed
        outline — nothing else on the page is framed, and an outline here would be
        the only border on it.
      */}
      <section className="relative mt-5 rounded-2xl bg-[#0f1c16] p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#98ad9c]">Miejsce na zdjęcie</p>
        <p className="mt-2 text-xs leading-relaxed text-[#98ad9c]">
          Docelowo podmień ten blok na finalny asset (foto lub wideo), zachowując proporcje i opis ALT.
        </p>
        {badge ? (
          <span className="mt-4 inline-flex rounded-full bg-[#f0c977]/15 px-3 py-1 text-[11px] font-medium text-[#f0c977]">
            {badge}
          </span>
        ) : null}
      </section>
    </article>
  );
}
