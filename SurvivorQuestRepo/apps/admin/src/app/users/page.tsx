"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useGetUsersQuery, useUpdateUserMutation } from "@/features/users/api/user.api";
import { CreateUserForm } from "@/features/users/components/create-user-form";
import { UsersTable } from "@/features/users/components/users-table";
import type { User, UserRole, UserStatus } from "@/features/users/types/user";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function UsersPage() {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormValues, setEditFormValues] = useState({
    displayName: "",
    email: "",
    phone: "",
    role: "instructor" as UserRole,
    status: "invited" as UserStatus,
    photoUrl: "",
  });

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [updateUser, { isLoading: isUpdatingUser }] = useUpdateUserMutation();

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
        <section className="space-y-4 p-6 lg:p-8">

          <CreateUserForm />

          {editingUser && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setEditFormError(null);

                if (!editFormValues.displayName.trim() || !editFormValues.email.trim()) {
                  setEditFormError("Nazwa i email są wymagane.");
                  return;
                }

                try {
                  await updateUser({
                    id: editingUser.id,
                    displayName: editFormValues.displayName.trim(),
                    email: editFormValues.email.trim(),
                    phone: editFormValues.phone.trim() || undefined,
                    role: editFormValues.role,
                    status: editFormValues.status,
                    photoUrl: editFormValues.photoUrl.trim() || undefined,
                  }).unwrap();

                  setEditingUser(null);
                } catch {
                  setEditFormError("Nie udało się zapisać zmian użytkownika.");
                }
              }}
              className="grid w-full max-w-5xl gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">Edytuj użytkownika</h2>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                >
                  Anuluj
                </button>
              </div>

              <input
                value={editFormValues.displayName}
                onChange={(event) =>
                  setEditFormValues((prev) => ({ ...prev, displayName: event.target.value }))
                }
                placeholder="Nazwa użytkownika"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
              />

              <input
                type="email"
                value={editFormValues.email}
                onChange={(event) =>
                  setEditFormValues((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="Email"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
              />

              <input
                type="tel"
                value={editFormValues.phone}
                onChange={(event) =>
                  setEditFormValues((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="Telefon"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
              />

              <select
                value={editFormValues.role}
                onChange={(event) =>
                  setEditFormValues((prev) => ({ ...prev, role: event.target.value as UserRole }))
                }
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
              >
                <option value="admin">Admin</option>
                <option value="instructor">Instructor</option>
              </select>

              <select
                value={editFormValues.status}
                onChange={(event) =>
                  setEditFormValues((prev) => ({ ...prev, status: event.target.value as UserStatus }))
                }
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
              >
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="blocked">Blocked</option>
              </select>

              <input
                type="url"
                value={editFormValues.photoUrl}
                onChange={(event) =>
                  setEditFormValues((prev) => ({ ...prev, photoUrl: event.target.value }))
                }
                placeholder="URL zdjęcia"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
              />

              {editFormError && <p className="text-sm text-red-300">{editFormError}</p>}

              <button
                type="submit"
                disabled={isUpdatingUser}
                className="inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {isUpdatingUser ? "Zapisywanie..." : "Zapisz zmiany"}
              </button>
            </form>
          )}

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
              onEdit={(user) => {
                setEditingUser(user);
                setEditFormError(null);
                setEditFormValues({
                  displayName: user.displayName,
                  email: user.email,
                  phone: user.phone || "",
                  role: user.role,
                  status: user.status,
                  photoUrl: user.photoUrl,
                });
              }}
            />
          )}
        </section>
      </div>
    </main>
  );
}