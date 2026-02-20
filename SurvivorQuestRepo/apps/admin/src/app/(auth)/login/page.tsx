import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-6">
      <div className="login-glow-left pointer-events-none absolute -left-28 -top-20 h-72 w-72 rounded-full bg-amber-500/30 blur-3xl" />
      <div className="login-glow-right pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-md gap-4">
          <div className="space-y-1 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">SurvivorQuest Panel</h1>
            <p className="text-sm text-zinc-300">Zaloguj się, aby zarządzać użytkownikami i dostępem.</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}