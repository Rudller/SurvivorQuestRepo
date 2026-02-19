import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Podaj poprawny email"),
  password: z.string().min(6, "Hasło musi mieć min. 6 znaków"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;