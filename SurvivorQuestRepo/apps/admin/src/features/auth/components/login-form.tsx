"use client";

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
  const [login, { isLoading }] = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values).unwrap();
      router.push("/users");
    } catch {
      form.setError("root", {
        type: "server",
        message: "Błędny email lub hasło",
      });
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid max-w-md gap-3 rounded border p-4"
    >
      <input
        {...form.register("email")}
        type="email"
        placeholder="admin@survivorquest.app"
        className="rounded border px-3 py-2"
      />
      {form.formState.errors.email && (
        <p className="text-sm text-red-600">
          {form.formState.errors.email.message}
        </p>
      )}

      <input
        {...form.register("password")}
        type="password"
        placeholder="admin123"
        className="rounded border px-3 py-2"
      />
      {form.formState.errors.password && (
        <p className="text-sm text-red-600">
          {form.formState.errors.password.message}
        </p>
      )}

      {form.formState.errors.root?.message && (
        <p className="text-sm text-red-600">
          {form.formState.errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-60"
      >
        {isLoading ? "Logowanie..." : "Zaloguj"}
      </button>
    </form>
  );
}