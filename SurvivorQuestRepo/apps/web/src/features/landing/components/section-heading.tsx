type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <header className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-soft">{eyebrow}</p>
      <h2 className="mt-2.5 text-2xl font-semibold leading-tight tracking-tight text-ivory sm:text-3xl">{title}</h2>
      <p className="mt-3.5 text-sm leading-relaxed text-ivory-muted sm:text-base">{description}</p>
    </header>
  );
}
