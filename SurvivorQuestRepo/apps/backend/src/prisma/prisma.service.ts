import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/survivorquest?schema=public';

function normalizeEnvValue(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || typeof process.env[key] !== 'undefined') {
      continue;
    }

    const value = trimmed.slice(separatorIndex + 1);
    process.env[key] = normalizeEnvValue(value);
  }
}

function loadBackendEnv() {
  const candidates = [
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps/backend/.env.local'),
    resolve(process.cwd(), 'apps/backend/.env'),
  ];

  for (const candidate of candidates) {
    loadEnvFile(candidate);
  }

  if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
    process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
  }
}

loadBackendEnv();

@Injectable()
export class PrismaService extends PrismaClient {}
