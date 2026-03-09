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
    password: z
        .string()
        .trim()
        .min(6, "Hasło musi mieć min. 6 znaków")
        .optional()
        .or(z.literal("")),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const createUserWithPasswordConfirmationSchema = createUserSchema
  .extend({
    confirmPassword: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((values, context) => {
    const password = values.password?.trim() ?? "";
    const confirmPassword = values.confirmPassword?.trim() ?? "";

    if (password && !confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Potwierdź hasło",
      });
      return;
    }

    if (!password && confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Najpierw podaj hasło",
      });
      return;
    }

    if (password && confirmPassword && password !== confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Hasła nie są takie same",
      });
    }
  });

export type CreateUserWithPasswordConfirmationFormValues = z.infer<
  typeof createUserWithPasswordConfirmationSchema
>;
