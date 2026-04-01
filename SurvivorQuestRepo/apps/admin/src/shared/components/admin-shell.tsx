"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

type AdminShellProps = {
  userEmail?: string;
  isLoggingOut: boolean;
  onLogout: () => Promise<void> | void;
  contentClassName?: string;
  children: ReactNode;
};

export function AdminShell({
  userEmail,
  isLoggingOut,
  onLogout,
  contentClassName = "space-y-4 p-4 sm:p-6 lg:p-8",
  children,
}: AdminShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileMenuId = useId();

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileNavOpen]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 px-4 py-3 backdrop-blur lg:hidden">
        <p className="text-sm font-semibold tracking-wide text-zinc-100">SurvivorQuest Admin</p>
        <button
          type="button"
          aria-label="Otwórz menu nawigacji"
          aria-controls={mobileMenuId}
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 transition hover:border-zinc-500"
        >
          <span className="sr-only">Menu</span>
          <span className="space-y-1">
            <span className="block h-0.5 w-4 rounded bg-current" />
            <span className="block h-0.5 w-4 rounded bg-current" />
            <span className="block h-0.5 w-4 rounded bg-current" />
          </span>
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-zinc-900/95 lg:block">
        <AdminSidebar userEmail={userEmail} isLoggingOut={isLoggingOut} onLogout={onLogout} />
      </aside>

      {isMobileNavOpen ? (
        <>
          <button
            type="button"
            aria-label="Zamknij menu nawigacji"
            onClick={() => setIsMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-zinc-950/70 lg:hidden"
          />
          <aside
            id={mobileMenuId}
            className="fixed inset-y-0 left-0 z-50 w-full max-w-xs border-r border-zinc-800 bg-zinc-900/95 lg:hidden"
          >
            <AdminSidebar
              userEmail={userEmail}
              isLoggingOut={isLoggingOut}
              onLogout={onLogout}
              onNavigate={() => setIsMobileNavOpen(false)}
            />
          </aside>
        </>
      ) : null}

      <div className="min-h-screen lg:pl-72">
        <section className={contentClassName}>{children}</section>
      </div>
    </main>
  );
}
