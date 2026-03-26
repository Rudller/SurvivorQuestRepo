"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { isUnauthorizedError } from "@/features/auth/auth-error";
import { useGetUsersQuery } from "@/features/users/api/user.api";
import { CreateUserForm } from "@/features/users/components/create-user-form";
import { EditUserForm } from "@/features/users/components/edit-user-form";
import { UsersTable } from "@/features/users/components/users-table";
import type { User } from "@/features/users/types/user";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

export default function UsersPage() {
  const router = useRouter();
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  const {
    data: users,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
    refetch,
  } = useGetUsersQuery(undefined, {
    skip: !meData,
  });

  useEffect(() => {
    if (isMeError && isUnauthorizedError(meError)) {
      router.replace("/login");
    }
  }, [isMeError, meError, router]);

  if (isMeLoading) {
    return <main className="p-8">Sprawdzanie sesji...</main>;
  }

  if (isMeError) {
    return <main className="p-8">Nie udało się sprawdzić sesji. Spróbuj odświeżyć stronę.</main>;
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
        <section className="space-y-4 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-zinc-100">Użytkownicy</h1>
            <button
              type="button"
              onClick={() => setIsCreatePanelOpen(true)}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300"
            >
              Utwórz użytkownika
            </button>
          </div>

          {isUsersLoading && <p className="mt-4 text-zinc-400">Ładowanie użytkowników...</p>}

          {isUsersError && (
            <div className="mt-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <p>Nie udało się pobrać użytkowników.</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-red-100/90">
                {JSON.stringify(usersError, null, 2)}
              </pre>
              <button
                onClick={() => refetch()}
                className="mt-3 rounded bg-amber-400 px-3 py-1.5 text-zinc-950"
              >
                Spróbuj ponownie
              </button>
            </div>
          )}

          {!isUsersLoading && !isUsersError && (
            <UsersTable
              data={users ?? []}
              onEdit={setEditingUser}
            />
          )}
        </section>
      </div>

      {isCreatePanelOpen && <CreateUserForm onClose={() => setIsCreatePanelOpen(false)} />}
      {editingUser && (
        <EditUserForm key={editingUser.id} user={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </main>
  );
}


