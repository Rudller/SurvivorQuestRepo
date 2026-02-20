"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useLoginMutation } from "@/features/auth/api/auth.api";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/login.schema";

export function LoginForm() {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [login, { isLoading }] = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "test@mail.com",
      password: "hasło123",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    form.clearErrors("root");
    setIsLoginSuccess(false);
    setIsLeaving(false);

    try {
      await login(values).unwrap();
      setIsLoginSuccess(true);
      setIsPasswordVisible(false);
      setIsLeaving(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      router.push("/");
    } catch {
      setIsLoginSuccess(false);
      setIsLeaving(false);
      form.setError("root", {
        type: "server",
        message: "Błędny email lub hasło",
      });
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={`space-y-4 rounded-2xl border border-zinc-700/60 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur transition ${isLeaving ? "login-form-exit" : ""}`}
    >
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-200">
          Email
        </label>
        <input
          {...form.register("email")}
          id="email"
          type="email"
          autoFocus
          disabled={isLoading || isLoginSuccess}
          autoComplete="email"
          placeholder="test@mail.com"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/40"
        />
      </div>
      {form.formState.errors.email && (
        <p className="text-sm text-red-400">
          {form.formState.errors.email.message}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-zinc-200">
          Hasło
        </label>
        <div className="relative">
          <input
            {...form.register("password")}
            id="password"
            type={isPasswordVisible ? "text" : "password"}
            disabled={isLoading || isLoginSuccess}
            autoComplete="current-password"
            placeholder="hasło123"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 pr-20 text-zinc-100 outline-none transition focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/40"
          />
          <button
            type="button"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            disabled={isLoading || isLoginSuccess}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium transition hover:bg-zinc-800 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isPasswordVisible ? "Ukryj hasło" : "Pokaż hasło"}
            aria-pressed={isPasswordVisible}
          >
            {isPasswordVisible ? "Ukryj" : "Pokaż"}
          </button>
        </div>
      </div>
      {form.formState.errors.password && (
        <p className="text-sm text-red-400">
          {form.formState.errors.password.message}
        </p>
      )}

      {form.formState.errors.root?.message && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {form.formState.errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading || isLoginSuccess}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
          isLoginSuccess
            ? "login-success-pulse bg-emerald-500 text-white"
            : "bg-amber-400 text-zinc-950 hover:bg-amber-300"
        }`}
      >
        {isLoading && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900/30 border-t-zinc-900"
            aria-hidden="true"
          />
        )}
        {isLoginSuccess ? (
          <>
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-xs font-bold"
              aria-hidden="true"
            >
              ✓
            </span>
            <span>Zalogowano</span>
          </>
        ) : isLoading ? (
          "Logowanie..."
        ) : (
          "Zaloguj"
        )}
      </button>

      <p className="text-center text-xs text-zinc-400">
        Dostęp wyłącznie dla administratorów i osób zarządzających użytkownikami. Nie udostępniaj swoich danych logowania.
      </p>
    </form>
  );
}