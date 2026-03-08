import { BadRequestException } from '@nestjs/common';

export type LoginDto = {
  email: string;
  password: string;
};

export function parseLoginDto(payload: unknown): LoginDto {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Invalid payload');
  }

  const body = payload as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    throw new BadRequestException('Invalid payload');
  }

  return { email, password };
}
