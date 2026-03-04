import { Injectable, NotFoundException } from '@nestjs/common';

export type UserRole = 'admin' | 'instructor';
export type UserStatus = 'active' | 'invited' | 'blocked';

export type UserRecord = {
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
};

export type CreateUserInput = {
  displayName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  photoUrl?: string;
};

export type UpdateUserInput = {
  id: string;
  displayName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  photoUrl?: string;
};

@Injectable()
export class UsersService {
  private users: UserRecord[] = [
    {
      id: '1',
      displayName: 'Admin',
      email: 'admin@survivorquest.app',
      phone: '+48 500 600 700',
      role: 'admin',
      status: 'active',
      photoUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Admin',
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  findAll() {
    return this.users;
  }

  create(input: CreateUserInput) {
    const now = new Date().toISOString();
    const safeEmail = input.email.trim();
    const safeDisplayName = input.displayName.trim();

    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      displayName: safeDisplayName,
      email: safeEmail,
      phone: input.phone?.trim() || undefined,
      role: input.role,
      status: input.status,
      photoUrl:
        input.photoUrl?.trim() || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(safeEmail)}`,
      createdAt: now,
      updatedAt: now,
    };

    this.users = [newUser, ...this.users];
    return newUser;
  }

  update(input: UpdateUserInput) {
    const index = this.users.findIndex((user) => user.id === input.id);

    if (index < 0) {
      throw new NotFoundException('User not found');
    }

    const current = this.users[index];
    const updated: UserRecord = {
      ...current,
      displayName: input.displayName?.trim() || current.displayName,
      email: input.email?.trim() || current.email,
      phone: input.phone?.trim() || undefined,
      role: input.role || current.role,
      status: input.status || current.status,
      photoUrl:
        input.photoUrl?.trim() ||
        current.photoUrl ||
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(input.email || current.email)}`,
      updatedAt: new Date().toISOString(),
    };

    this.users[index] = updated;
    return updated;
  }
}
