"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { getTasksByStatus } from "@/features/tasks/lib/tasks.data";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function TasksPage() {
  const router = useRouter();
  const todoTasks = getTasksByStatus("todo");
  const inProgressTasks = getTasksByStatus("in-progress");
  const doneTasks = getTasksByStatus("done");

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  useEffect(() => {
    if (isMeError && isUnauthorized(meError)) {
      router.replace("/login");
    }
  }, [isMeError, meError, router]);

  if (isMeLoading) {
    return <main className="p-8">Sprawdzanie sesji...</main>;
  }

  if (isMeError) {
    return <main className="p-8">Przekierowanie do logowania...</main>;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <AdminSidebar
        userEmail={meData?.user.email}
        isLoggingOut={isLoggingOut}
        onLogout={async () => {
          await logout().unwrap();
          router.replace("/login");
        }}
      />

      <div className="min-h-screen pl-72">
        <section className="space-y-6 p-6 lg:p-8">
          <div className="w-full max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
            <h1 className="mb-4 text-xl font-semibold tracking-tight">Lista zadań</h1>

            <div className="grid gap-3 md:grid-cols-3">
              <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">Do zrobienia</p>
                <ul className="space-y-2 text-sm text-zinc-200">
                  {todoTasks.map((task) => (
                    <li key={task.id} className="rounded-md border border-zinc-800 bg-zinc-900/70 px-2.5 py-2">
                      {task.title}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-300">W trakcie</p>
                <ul className="space-y-2 text-sm text-zinc-200">
                  {inProgressTasks.map((task) => (
                    <li key={task.id} className="rounded-md border border-zinc-800 bg-zinc-900/70 px-2.5 py-2">
                      {task.title}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">Zrobione</p>
                <ul className="space-y-2 text-sm text-zinc-200">
                  {doneTasks.map((task) => (
                    <li key={task.id} className="rounded-md border border-zinc-800 bg-zinc-900/70 px-2.5 py-2">
                      {task.title}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
