"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMeQuery, useLogoutMutation } from "@/features/auth/api/auth.api";
import { isUnauthorizedError } from "@/features/auth/auth-error";
import { DashboardCalendar } from "@/features/dashboard/components/dashboard-calendar";
import { AdminShell } from "@/shared/components/admin-shell";

export default function CalendarPage() {
  const router = useRouter();

  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMeQuery();

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

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
      isLoggingOut={isLoggingOut}
      onLogout={async () => {
        await logout().unwrap();
        router.replace("/login");
      }}
      contentClassName="space-y-6 p-4 sm:p-6 lg:p-8"
    >
      <h1 className="text-xl font-semibold tracking-tight">Kalendarz realizacji</h1>
      <DashboardCalendar />
    </AdminShell>
  );
}


