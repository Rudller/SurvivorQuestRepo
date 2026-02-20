"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminSidebarProps = {
  userEmail?: string;
  isLoggingOut: boolean;
  onLogout: () => Promise<void> | void;
};

const navItems = [
  { href: "/", label: "Panel główny" },
  { href: "/tasks", label: "Lista zadań" },
  { href: "/current-realization", label: "Aktualna realizacja" },
  { href: "/users", label: "Użytkownicy" },
  { href: "/realizations", label: "Realizacje" },
  { href: "/games", label: "Gry" },
  { href: "/chat", label: "Czat" },
];

export function AdminSidebar({ userEmail, isLoggingOut, onLogout }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-72 bg-zinc-900/95">
      <div className="flex h-full flex-col p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">SurvivorQuest</p>
        <h2 className="mt-2 text-lg font-semibold text-zinc-100">Admin Panel</h2>

        <nav className="mt-6 space-y-0.5 border-l border-zinc-800/80">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`-ml-px flex items-center border-l-2 px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 border-t border-zinc-800 pt-4">
          <p className="text-xs text-zinc-400">Zalogowany</p>
          <p className="truncate text-sm text-zinc-200">{userEmail ?? "-"}</p>
          <button
            onClick={() => void onLogout()}
            disabled={isLoggingOut}
            className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? "Wylogowywanie..." : "Wyloguj"}
          </button>
        </div>
      </div>
    </aside>
  );
}