"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useCreateUserMutation } from "../api/user.api";
import {
  createUserWithPasswordConfirmationSchema,
  type CreateUserWithPasswordConfirmationFormValues,
} from "../schemas/create-user.schema";
import { UserSidePanel } from "./user-side-panel";

type CreateUserFormProps = {
  onClose: () => void;
};

export function CreateUserForm({ onClose }: CreateUserFormProps) {
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const form = useForm<CreateUserWithPasswordConfirmationFormValues>({
    resolver: zodResolver(createUserWithPasswordConfirmationSchema),
    defaultValues: {
      displayName: "",
      email: "",
      phone: "",
      role: "instructor",
      status: "invited",
      photoUrl: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: CreateUserWithPasswordConfirmationFormValues) => {
    form.clearErrors("root");
    try {
      await createUser({
        displayName: values.displayName,
        email: values.email,
        phone: values.phone,
        role: values.role,
        status: values.status,
        photoUrl: values.photoUrl,
        password: values.password?.trim() || undefined,
      }).unwrap();
      onClose();
      form.reset({
        displayName: "",
        email: "",
        phone: "",
        role: "instructor",
        status: "invited",
        photoUrl: "",
        password: "",
        confirmPassword: "",
      });
      setIsPasswordVisible(false);
    } catch {
      form.setError("root", {
        type: "server",
        message: "Nie udało się utworzyć użytkownika.",
      });
    }
  };

  return (
    <UserSidePanel title="Utwórz użytkownika" description="Dodaj nowego użytkownika panelu." onClose={onClose}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="sq-form space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
      >
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Nazwa użytkownika</span>
          <input
            {...form.register("displayName")}
            type="text"
            placeholder="Nazwa użytkownika"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
          />
        </label>
        {form.formState.errors.displayName && (
          <p className="text-sm text-red-300">{form.formState.errors.displayName.message}</p>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Email</span>
          <input
            {...form.register("email")}
            type="email"
            placeholder="email@domena.pl"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
          />
        </label>
        {form.formState.errors.email && (
          <p className="text-sm text-red-300">{form.formState.errors.email.message}</p>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Telefon (opcjonalny)</span>
          <input
            {...form.register("phone")}
            type="tel"
            placeholder="+48 500 600 700"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
          />
        </label>
        {form.formState.errors.phone && (
          <p className="text-sm text-red-300">{form.formState.errors.phone.message}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Rola</span>
            <select
              {...form.register("role")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
            >
              <option value="admin">Admin</option>
              <option value="instructor">Instructor</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Status</span>
            <select
              {...form.register("status")}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
            >
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
        </div>
        {(form.formState.errors.role || form.formState.errors.status) && (
          <p className="text-sm text-red-300">
            {form.formState.errors.role?.message ?? form.formState.errors.status?.message}
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">URL zdjęcia (opcjonalny)</span>
          <input
            {...form.register("photoUrl")}
            type="url"
            placeholder="https://..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
          />
        </label>
        {form.formState.errors.photoUrl && (
          <p className="text-sm text-red-300">{form.formState.errors.photoUrl.message}</p>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Hasło (opcjonalne)</span>
          <div className="relative">
            <input
              {...form.register("password")}
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Min. 6 znaków"
              disabled={isLoading}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 pr-20 text-zinc-100 outline-none transition focus:border-amber-400/80"
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((prev) => !prev)}
              disabled={isLoading}
              className="sq-button absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium transition hover:bg-zinc-800 hover:text-amber-200"
              aria-label={isPasswordVisible ? "Ukryj hasło" : "Pokaż hasło"}
              aria-pressed={isPasswordVisible}
            >
              {isPasswordVisible ? "Ukryj" : "Pokaż"}
            </button>
          </div>
        </label>
        {form.formState.errors.password && (
          <p className="text-sm text-red-300">{form.formState.errors.password.message}</p>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Potwierdź hasło</span>
          <input
            {...form.register("confirmPassword")}
            type={isPasswordVisible ? "text" : "password"}
            placeholder="Wpisz hasło ponownie"
            disabled={isLoading}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
          />
        </label>
        {form.formState.errors.confirmPassword && (
          <p className="text-sm text-red-300">{form.formState.errors.confirmPassword.message}</p>
        )}

        {form.formState.errors.root?.message && (
          <p className="sq-error-banner">{form.formState.errors.root.message}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="sq-button rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300"
          >
            {isLoading ? "Tworzenie..." : "Utwórz użytkownika"}
          </button>
        </div>
      </form>
    </UserSidePanel>
  );
}
