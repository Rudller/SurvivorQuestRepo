export type UserRole = "admin" | "instructor";

export type User = {
    id: string;
    email: string;
    role: UserRole;
    createdAt: string;
}