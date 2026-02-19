import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-semibold">Logowanie</h1>
      <LoginForm />
    </main>
  );
}