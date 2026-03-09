"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useDeleteUserMutation, useUpdateUserMutation } from "../api/user.api";
import { createUserSchema, type CreateUserFormValues } from "../schemas/create-user.schema";
import type { User } from "../types/user";
import { UserSidePanel } from "./user-side-panel";

type EditUserFormProps = {
  user: User;
  onClose: () => void;
};

export function EditUserForm({ user, onClose }: EditUserFormProps) {
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: user.displayName,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      status: user.status,
      photoUrl: user.photoUrl,
      password: "",
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    form.clearErrors("root");
    try {
      await updateUser({
        id: user.id,
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        role: values.role,
        status: values.status,
        photoUrl: values.photoUrl?.trim() || undefined,
        password: values.password?.trim() || undefined,
      }).unwrap();
      onClose();
    } catch {
      form.setError("root", {
        type: "server",
        message: "Nie udało się zapisać zmian użytkownika.",
      });
    }
  };

  return (
    <UserSidePanel
      title="Edytuj użytkownika"
      description={`Zmieniasz dane: ${user.email}`}
      onClose={onClose}
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
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
          <span className="text-xs uppercase tracking-wider text-zinc-400">
            Nowe hasło (opcjonalne)
          </span>
          <input
            {...form.register("password")}
            type="password"
            placeholder={user.hasPassword ? "Pozostaw puste bez zmiany" : "Min. 6 znaków"}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80"
          />
        </label>
        {form.formState.errors.password && (
          <p className="text-sm text-red-300">{form.formState.errors.password.message}</p>
        )}

        {form.formState.errors.root?.message && (
          <p className="text-sm text-red-300">{form.formState.errors.root.message}</p>
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
            className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </div>
      </form>

      <section className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <h3 className="text-sm font-semibold text-red-200">Usuń użytkownika</h3>
        <p className="text-xs text-red-200/90">
          Aby usunąć użytkownika, wpisz dokładnie jego email:{" "}
          <span className="font-semibold">{user.email}</span>
        </p>
        <input
          value={deleteConfirmEmail}
          onChange={(event) => {
            setDeleteConfirmEmail(event.target.value);
            setDeleteError(null);
          }}
          placeholder="Wpisz email użytkownika do potwierdzenia"
          className="w-full rounded-lg border border-red-400/40 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-300"
        />
        <button
          type="button"
          disabled={isDeleting || deleteConfirmEmail.trim() !== user.email}
          onClick={async () => {
            setDeleteError(null);

            if (deleteConfirmEmail.trim() !== user.email) {
              setDeleteError("Email użytkownika nie zgadza się z potwierdzeniem.");
              return;
            }

            try {
              await deleteUser({
                id: user.id,
                confirmEmail: deleteConfirmEmail.trim(),
              }).unwrap();
              onClose();
            } catch {
              setDeleteError("Nie udało się usunąć użytkownika.");
            }
          }}
          className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Usuwanie..." : "Usuń użytkownika"}
        </button>
        {deleteError && <p className="text-sm text-red-200">{deleteError}</p>}
      </section>
    </UserSidePanel>
  );
}
