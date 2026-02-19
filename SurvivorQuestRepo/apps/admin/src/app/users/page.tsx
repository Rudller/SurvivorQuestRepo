"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useGetUsersQuery } from "@/features/users/api/user.api";
import { CreateUserForm } from "@/features/users/components/create-user-form";
import { UsersTable } from "@/features/users/components/users-table";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function UsersPage() {
  const router = useRouter();

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
    <main className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Użytkownicy</h1>
        <button
          onClick={async () => {
            await logout().unwrap();
            router.replace("/login");
          }}
          disabled={isLoggingOut}
          className="rounded border px-3 py-1.5"
        >
          {isLoggingOut ? "Wylogowywanie..." : "Wyloguj"}
        </button>
      </div>

      <p className="mb-4 text-sm text-zinc-600">
        Zalogowany: {meData?.user.email}
      </p>

      <CreateUserForm />

      {isUsersLoading && <p className="mt-4 text-zinc-600">Ładowanie użytkowników...</p>}

      {isUsersError && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>Nie udało się pobrać użytkowników.</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs">
            {JSON.stringify(usersError, null, 2)}
          </pre>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded bg-black px-3 py-1.5 text-white"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {!isUsersLoading && !isUsersError && <UsersTable data={users ?? []} />}
    </main>
  );
}