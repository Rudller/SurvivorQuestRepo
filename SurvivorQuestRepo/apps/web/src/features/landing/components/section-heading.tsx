type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0c977]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#f3f5ef] sm:text-3xl">{title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-[#bdcdbf] sm:text-base">{description}</p>
    </div>
  );
}
