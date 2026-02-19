export type AuthRole = "admin" | "instructor";

export type AuthUser = {
  id: string;
  email: string;
  role: AuthRole;
};