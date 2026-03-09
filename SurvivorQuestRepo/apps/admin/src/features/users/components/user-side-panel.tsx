"use client";

import type { ReactNode } from "react";

type UserSidePanelProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function UserSidePanel({ title, description, onClose, children }: UserSidePanelProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Zamknij panel"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
            >
              Zamknij
            </button>
          </div>

          {children}
        </div>
      </aside>
    </>
  );
}
