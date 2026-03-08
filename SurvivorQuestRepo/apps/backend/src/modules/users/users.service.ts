import { Injectable, NotFoundException } from '@nestjs/common';
import {
  UserRole as PrismaUserRole,
  UserStatus as PrismaUserStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../shared/lib/password';

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
  hasPassword: boolean;
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
  password?: string;
};

export type UpdateUserInput = {
  id: string;
  displayName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  photoUrl?: string;
  password?: string;
};

function toPrismaUserRole(role: UserRole) {
  return role === 'admin' ? PrismaUserRole.ADMIN : PrismaUserRole.INSTRUCTOR;
}

function toPrismaUserStatus(status: UserStatus) {
  if (status === 'active') return PrismaUserStatus.ACTIVE;
  if (status === 'blocked') return PrismaUserStatus.BLOCKED;
  return PrismaUserStatus.INVITED;
}

function fromPrismaUserStatus(status: PrismaUserStatus): UserStatus {
  if (status === PrismaUserStatus.ACTIVE) return 'active';
  if (status === PrismaUserStatus.BLOCKED) return 'blocked';
  return 'invited';
}

function mapUser(input: {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  role: PrismaUserRole;
  status: PrismaUserStatus;
  photoUrl: string | null;
  passwordHash: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserRecord {
  return {
    id: input.id,
    displayName: input.displayName,
    email: input.email,
    phone: input.phone || undefined,
    role: input.role === PrismaUserRole.ADMIN ? 'admin' : 'instructor',
    status: fromPrismaUserStatus(input.status),
    photoUrl:
      input.photoUrl ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(input.email)}`,
    hasPassword: Boolean(input.passwordHash),
    lastLoginAt: input.lastLoginAt?.toISOString(),
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => mapUser(user));
  }

  async create(input: CreateUserInput) {
    const safeEmail = input.email.trim();
    const safeDisplayName = input.displayName.trim();
    const passwordHash = input.password?.trim()
      ? await hashPassword(input.password)
      : null;

    const created = await this.prisma.user.create({
      data: {
        displayName: safeDisplayName,
        email: safeEmail,
        phone: input.phone?.trim() || null,
        role: toPrismaUserRole(input.role),
        status: toPrismaUserStatus(input.status),
        photoUrl:
          input.photoUrl?.trim() ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(safeEmail)}`,
        passwordHash,
      },
    });

    return mapUser(created);
  }

  async update(input: UpdateUserInput) {
    const current = await this.prisma.user.findUnique({
      where: { id: input.id },
    });

    if (!current) {
      throw new NotFoundException('User not found');
    }

    const nextEmail = input.email?.trim() || current.email;
    const nextPasswordHash =
      typeof input.password === 'string'
        ? input.password.trim()
          ? await hashPassword(input.password)
          : null
        : current.passwordHash;
    const updated = await this.prisma.user.update({
      where: { id: input.id },
      data: {
        displayName: input.displayName?.trim() || current.displayName,
        email: nextEmail,
        phone: input.phone?.trim() || null,
        role: input.role ? toPrismaUserRole(input.role) : current.role,
        status: input.status
          ? toPrismaUserStatus(input.status)
          : current.status,
        photoUrl:
          input.photoUrl?.trim() ||
          current.photoUrl ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(nextEmail)}`,
        passwordHash: nextPasswordHash,
      },
    });

    return mapUser(updated);
  }
}
