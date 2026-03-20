import { BadRequestException } from '@nestjs/common';
import type {
  CreateUserInput,
  DeleteUserInput,
  UpdateUserInput,
  UserRole,
  UserStatus,
} from '../users.service';

const USER_ROLES: UserRole[] = ['admin', 'instructor'];
const USER_STATUSES: UserStatus[] = ['active', 'invited', 'blocked'];
const MIN_PASSWORD_LENGTH = 8;

function ensureTrimmedString(value: unknown, required = true) {
  if (typeof value !== 'string') {
    if (required) {
      throw new BadRequestException('Invalid payload');
    }

    return undefined;
  }

  const normalized = value.trim();
  if (!normalized && required) {
    throw new BadRequestException('Invalid payload');
  }

  return normalized || undefined;
}

function ensureRole(value: unknown, required = true): UserRole | undefined {
  if (typeof value !== 'string') {
    if (required) throw new BadRequestException('Invalid payload');
    return undefined;
  }

  if (!USER_ROLES.includes(value as UserRole)) {
    throw new BadRequestException('Invalid payload');
  }

  return value as UserRole;
}

function ensureStatus(value: unknown, required = true): UserStatus | undefined {
  if (typeof value !== 'string') {
    if (required) throw new BadRequestException('Invalid payload');
    return undefined;
  }

  if (!USER_STATUSES.includes(value as UserStatus)) {
    throw new BadRequestException('Invalid payload');
  }

  return value as UserStatus;
}

function ensurePassword(value: unknown, required = false) {
  const normalized = ensureTrimmedString(value, required);
  if (!normalized) {
    return undefined;
  }

  if (normalized.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    );
  }

  return normalized;
}

export function parseCreateUserDto(payload: unknown): CreateUserInput {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;

  return {
    displayName: ensureTrimmedString(body.displayName)!,
    email: ensureTrimmedString(body.email)!,
    phone: ensureTrimmedString(body.phone, false),
    role: ensureRole(body.role)!,
    status: ensureStatus(body.status)!,
    photoUrl: ensureTrimmedString(body.photoUrl, false),
    password: ensurePassword(body.password, false),
  };
}

export function parseUpdateUserDto(payload: unknown): UpdateUserInput {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;
  const id = ensureTrimmedString(body.id);
  if (!id) {
    throw new BadRequestException('User id is required');
  }

  return {
    id,
    displayName: ensureTrimmedString(body.displayName, false),
    email: ensureTrimmedString(body.email, false),
    phone: ensureTrimmedString(body.phone, false),
    role: ensureRole(body.role, false),
    status: ensureStatus(body.status, false),
    photoUrl: ensureTrimmedString(body.photoUrl, false),
    password: ensurePassword(body.password, false),
  };
}

export function parseDeleteUserDto(payload: unknown): DeleteUserInput {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;
  const id = ensureTrimmedString(body.id);
  const confirmEmail = ensureTrimmedString(body.confirmEmail);
  if (!id || !confirmEmail) {
    throw new BadRequestException('User id and confirmEmail are required');
  }

  return {
    id,
    confirmEmail,
  };
}
