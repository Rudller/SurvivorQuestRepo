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
            email: "",
            role: "instructor",
        },
    })

    const onSubmit = async (values: CreateUserFormValues) => {
        try {
            await createUser(values).unwrap();
            form.reset({ email: "", role: "instructor" });
        } catch (error) {
            console.error("Błąd podczas tworzenia użytkownika:", error);
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} 
        className="mb-6 grid max-w-md gap-3 rounded border p-4"
        >
            <h2 className="text-lg font-semibold">Dodaj użytkownika</h2>

            <input 
            {...form.register("email")}
            type="email" 
            placeholder="email@domena.pl"
            className="rounded border px-3 py-2"
            />
            {form.formState.errors.email && (
                <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
            )}
            <select 
            {...form.register("role")}
            className="rounded border px-3 py-2"
            >
                <option value="admin">Admin</option>
                <option value="instructor">Instructor</option>
            </select>
            {form.formState.errors.role && (
                <p className="text-sm text-red-600">{form.formState.errors.role.message}</p>
            )}
            <button
            type="submit"
            disabled={isLoading}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-60"
            >
                {isLoading ? "Dodawanie..." : "Utwórz użytkownika"}
            </button>
        </form>
    )
}