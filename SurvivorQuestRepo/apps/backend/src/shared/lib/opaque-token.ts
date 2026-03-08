import { createHash } from 'node:crypto';

export function hashOpaqueToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getOpaqueTokenCandidates(token?: string) {
  const normalized = token?.trim();
  if (!normalized) {
    return [] as string[];
  }

  const hashed = hashOpaqueToken(normalized);
  return hashed === normalized ? [normalized] : [hashed, normalized];
}
