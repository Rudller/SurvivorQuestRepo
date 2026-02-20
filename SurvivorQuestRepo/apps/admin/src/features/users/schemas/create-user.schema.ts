import { z } from "zod";

export const createUserSchema = z.object({
    displayName: z.string().trim().min(2, "Podaj nazwę użytkownika"),
    email: z.string().email("Podaj poprawny adres email"),
    phone: z
        .string()
        .trim()
        .regex(/^[0-9+\s-]{6,20}$/, "Podaj poprawny numer telefonu")
        .optional()
        .or(z.literal("")),
    role: z.enum(["admin", "instructor"], {
        error: "Wybierz rolę użytkownika"
    }),
    status: z.enum(["active", "invited", "blocked"], {
        error: "Wybierz status użytkownika"
    }),
    photoUrl: z
        .string()
        .trim()
        .url("Podaj poprawny URL zdjęcia")
        .optional()
        .or(z.literal("")),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;