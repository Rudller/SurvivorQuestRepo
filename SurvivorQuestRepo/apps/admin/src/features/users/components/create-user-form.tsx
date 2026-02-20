"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useCreateUserMutation } from "../api/user.api";
import { createUserSchema, type CreateUserFormValues } from "../schemas/create-user.schema";

export function CreateUserForm() {
    const [createUser, { isLoading }] = useCreateUserMutation();

    const form = useForm<CreateUserFormValues>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            displayName: "",
            email: "",
            phone: "",
            role: "instructor",
            status: "invited",
            photoUrl: "",
        },
    });

    const onSubmit = async (values: CreateUserFormValues) => {
        try {
            await createUser(values).unwrap();
            form.reset({ displayName: "", email: "", phone: "", role: "instructor", status: "invited", photoUrl: "" });
        } catch (error) {
            console.error("Błąd podczas tworzenia użytkownika:", error);
        }
    };

    return (
        <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mb-2 grid w-full max-w-5xl gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5"
        >
            <h2 className="text-lg font-semibold text-zinc-100">Dodaj użytkownika</h2>

            <input
                {...form.register("displayName")}
                type="text"
                placeholder="Nazwa użytkownika"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/30"
            />
            {form.formState.errors.displayName && (
                <p className="text-sm text-red-300">{form.formState.errors.displayName.message}</p>
            )}

            <input
                {...form.register("email")}
                type="email"
                placeholder="email@domena.pl"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/30"
            />
            {form.formState.errors.email && (
                <p className="text-sm text-red-300">{form.formState.errors.email.message}</p>
            )}

            <input
                {...form.register("phone")}
                type="tel"
                placeholder="Telefon (opcjonalny)"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/30"
            />
            {form.formState.errors.phone && (
                <p className="text-sm text-red-300">{form.formState.errors.phone.message}</p>
            )}

            <select
                {...form.register("role")}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/30"
            >
                <option value="admin">Admin</option>
                <option value="instructor">Instructor</option>
            </select>
            {form.formState.errors.role && (
                <p className="text-sm text-red-300">{form.formState.errors.role.message}</p>
            )}

            <select
                {...form.register("status")}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/30"
            >
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="blocked">Blocked</option>
            </select>
            {form.formState.errors.status && (
                <p className="text-sm text-red-300">{form.formState.errors.status.message}</p>
            )}

            <input
                {...form.register("photoUrl")}
                type="url"
                placeholder="https://... (opcjonalne zdjęcie)"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/30"
            />
            {form.formState.errors.photoUrl && (
                <p className="text-sm text-red-300">{form.formState.errors.photoUrl.message}</p>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="inline-flex w-fit items-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isLoading ? "Dodawanie..." : "Utwórz użytkownika"}
            </button>
        </form>
    );
}