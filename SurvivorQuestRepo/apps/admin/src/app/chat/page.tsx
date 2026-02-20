"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { useCreateChatMessageMutation, useGetChatMessagesQuery } from "@/features/chat/api/chat.api";
import { AdminSidebar } from "@/shared/components/admin-sidebar";

function isUnauthorized(error: unknown) {
  const err = error as FetchBaseQueryError | undefined;
  return typeof err?.status === "number" && err.status === 401;
}

export default function ChatPage() {
  const router = useRouter();

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [createMessage, { isLoading: isSending }] = useCreateChatMessageMutation();

  const { data: messages, isLoading, isError, error, refetch } = useGetChatMessagesQuery(undefined, {
    skip: !meData,
  });

  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Czat</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Komunikacja dla użytkowników panelu administracyjnego.
            </p>
          </div>

          <form
            className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setFormError(null);

              if (!content.trim()) {
                setFormError("Wpisz wiadomość.");
                return;
              }

              try {
                await createMessage({
                  userName: meData?.user.email ?? "Admin",
                  content: content.trim(),
                }).unwrap();
                setContent("");
              } catch {
                setFormError("Nie udało się wysłać wiadomości.");
              }
            }}
          >
            <h2 className="text-lg font-semibold">Nowa wiadomość</h2>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={3}
              placeholder="Napisz wiadomość do użytkowników..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
            />
            {formError && <p className="text-sm text-red-300">{formError}</p>}
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {isSending ? "Wysyłanie..." : "Wyślij"}
            </button>
          </form>

          {isLoading && <p className="text-zinc-400">Ładowanie wiadomości...</p>}

          {isError && (
            <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <p>Nie udało się pobrać wiadomości.</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-red-100/90">{JSON.stringify(error, null, 2)}</pre>
              <button onClick={() => refetch()} className="mt-2 rounded bg-amber-400 px-3 py-1.5 text-zinc-950">
                Spróbuj ponownie
              </button>
            </div>
          )}

          {!isLoading && !isError && (
            <div className="space-y-2">
              {(messages ?? []).map((message) => (
                <article key={message.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-200">{message.userName}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(message.createdAt).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{message.content}</p>
                </article>
              ))}
              {messages?.length === 0 && <p className="text-zinc-400">Brak wiadomości.</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
