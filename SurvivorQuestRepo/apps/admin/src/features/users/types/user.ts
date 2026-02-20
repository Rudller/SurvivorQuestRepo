export type UserRole = "admin" | "instructor";
export type UserStatus = "active" | "invited" | "blocked";

export type User = {
    id: string;
    displayName: string;
    email: string;
    phone?: string;
    role: UserRole;
    status: UserStatus;
    photoUrl: string;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}