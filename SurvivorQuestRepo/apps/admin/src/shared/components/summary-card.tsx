import type { ReactNode } from "react";

type SummaryCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function SummaryCard({ title, children, className }: SummaryCardProps) {
  return (
    <section className={`space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 ${className ?? ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      {children}
    </section>
  );
}
