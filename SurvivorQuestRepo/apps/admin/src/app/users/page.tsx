"use client";

import { useGetUsersQuery } from "@/features/users/api/user.api";
import { CreateUserForm } from "@/features/users/components/create-user-form";

export default function UsersPage() {
    const { data, isLoading, isError, error, refetch } = useGetUsersQuery();

    return (
        <main className="p-8">
            <h1 className="text-2xl font-semibold">
                Użytkownicy
            </h1>

            <CreateUserForm />

            {isLoading && (
                <p className="mt-4 text-zinc-600">
                    Ładowanie użytkowników...
                </p>
            )}

            {isError && (
                <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <p>Wystąpił błąd podczas ładowania użytkowników.</p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">
                        {JSON.stringify(error, null, 2)}
                    </pre>
                    <button
                        onClick={() => refetch()}
                        className="mt-3 rounded bg-black px-3 py-1.5 text-white hover:opacity-90"
                    >
                        Spróbuj ponownie
                    </button>
                </div>
            )}

            {!isLoading && !isError && (
                <ul className="mt-4 list-disc pl-5">
                    {(data ?? []).map((u) => (
                        <li key={u.id}>
                            {u.email} ({u.role})
                        </li>
                    ))}
                </ul>
            )}
        </main>
    )
}