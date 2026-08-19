"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { isUnauthorizedError } from "@/features/auth/auth-error";
import { AdminShell } from "@/shared/components/admin-shell";
import { RiskSchemeLibrary } from "@/features/risk-quiz/components/risk-scheme-library";

export default function RiskQuizPage() {
  const router = useRouter();

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const canManageRiskQuiz = meData?.user.role === "admin";

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
    <AdminShell
      userEmail={meData?.user.email}
      userRole={meData?.user.role}
      isLoggingOut={isLoggingOut}
      onLogout={async () => {
        await logout().unwrap();
        router.replace("/login");
      }}
    >
      {!canManageRiskQuiz ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
          <h1 className="text-xl font-semibold text-zinc-100">Brak dostępu</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Zarządzanie szablonami Ryzykantów jest dostępne tylko dla administratorów.
          </p>
        </div>
      ) : (
        <RiskSchemeLibrary />
      )}
    </AdminShell>
  );
}
