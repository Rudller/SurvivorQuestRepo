import { Injectable, NotFoundException } from '@nestjs/common';
import {
  UserRole as PrismaUserRole,
  UserStatus as PrismaUserStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.mapUser(user));
  }

  async create(input: CreateUserInput) {
    const safeEmail = input.email.trim();
    const safeDisplayName = input.displayName.trim();

    const created = await this.prisma.user.create({
      data: {
        displayName: safeDisplayName,
        email: safeEmail,
        phone: input.phone?.trim() || null,
        role: this.toPrismaRole(input.role),
        status: this.toPrismaStatus(input.status),
        photoUrl:
          input.photoUrl?.trim() ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(safeEmail)}`,
      },
    });

    return this.mapUser(created);
  }

  async update(input: UpdateUserInput) {
    const current = await this.prisma.user.findUnique({
      where: { id: input.id },
    });

    if (!current) {
      throw new NotFoundException('User not found');
    }

    const nextEmail = input.email?.trim() || current.email;
    const updated = await this.prisma.user.update({
      where: { id: input.id },
      data: {
        displayName: input.displayName?.trim() || current.displayName,
        email: nextEmail,
        phone: input.phone?.trim() || null,
        role: input.role ? this.toPrismaRole(input.role) : current.role,
        status: input.status
          ? this.toPrismaStatus(input.status)
          : current.status,
        photoUrl:
          input.photoUrl?.trim() ||
          current.photoUrl ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(nextEmail)}`,
      },
    });

    return this.mapUser(updated);
  }

  private mapUser(user: {
    id: string;
    displayName: string;
    email: string;
    phone: string | null;
    role: PrismaUserRole;
    status: PrismaUserStatus;
    photoUrl: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserRecord {
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role === PrismaUserRole.ADMIN ? 'admin' : 'instructor',
      status: this.fromPrismaStatus(user.status),
      photoUrl:
        user.photoUrl ||
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.email)}`,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private toPrismaRole(role: UserRole) {
    return role === 'admin' ? PrismaUserRole.ADMIN : PrismaUserRole.INSTRUCTOR;
  }

  private toPrismaStatus(status: UserStatus) {
    if (status === 'active') return PrismaUserStatus.ACTIVE;
    if (status === 'blocked') return PrismaUserStatus.BLOCKED;
    return PrismaUserStatus.INVITED;
  }

  private fromPrismaStatus(status: PrismaUserStatus): UserStatus {
    if (status === PrismaUserStatus.ACTIVE) return 'active';
    if (status === PrismaUserStatus.BLOCKED) return 'blocked';
    return 'invited';
  }
}
