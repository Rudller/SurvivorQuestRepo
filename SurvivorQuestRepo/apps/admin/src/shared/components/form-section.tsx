import type { ReactNode } from "react";

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset
      className={`min-w-0 space-y-3 overflow-x-hidden rounded-lg border border-zinc-800 p-4 ${className ?? ""}`}
    >
      <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</legend>
      {description ? <p className="text-xs text-zinc-500">{description}</p> : null}
      {children}
    </fieldset>
  );
}
