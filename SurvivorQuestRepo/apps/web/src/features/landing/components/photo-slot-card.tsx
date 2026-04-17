type PhotoSlotCardProps = {
  title: string;
  description: string;
  badge?: string;
  className?: string;
};

export function PhotoSlotCard({ title, description, badge, className }: PhotoSlotCardProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-[#446251]/80 bg-[#162921]/90 p-5 shadow-[0_0_0_1px_rgba(68,98,81,0.25),0_30px_60px_-40px_rgba(0,0,0,0.95)] ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,201,119,0.22),transparent_56%)] opacity-80 transition group-hover:opacity-100" />
      <div className="relative">
        <h3 className="text-base font-semibold text-[#f3f5ef] sm:text-lg">{title}</h3>
        <p className="mt-2 text-sm text-[#bdcdbf]">{description}</p>
      </div>
      <div className="relative mt-5 rounded-2xl border border-dashed border-[#bdcdbf]/35 bg-[#12221b]/95 p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#98ad9c]">Miejsce na zdjęcie</p>
        <p className="mt-2 text-xs leading-relaxed text-[#98ad9c]">
          Docelowo podmień ten blok na finalny asset (foto lub wideo), zachowując proporcje i opis ALT.
        </p>
        {badge ? (
          <span className="mt-4 inline-flex rounded-full border border-[#f0c977]/35 bg-[#f0c977]/15 px-3 py-1 text-[11px] font-medium text-[#f0c977]">
            {badge}
          </span>
        ) : null}
      </div>
    </article>
  );
}
