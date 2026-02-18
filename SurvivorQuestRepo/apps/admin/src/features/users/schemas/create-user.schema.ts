import { z } from "zod";

export const createUserSchema = z.object({
    email: z.string().email("Podaj poprawny adres email"),
    role: z.enum(["admin", "instructor"], {
        error: "Wybierz rolę użytkownika"
    })
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;