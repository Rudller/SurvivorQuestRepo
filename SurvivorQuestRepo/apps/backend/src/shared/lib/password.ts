import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(nodeScrypt);
const HASH_PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

function encode(value: Buffer) {
  return value.toString('base64url');
}

function decode(value: string) {
  return Buffer.from(value, 'base64url');
}

export function isPasswordHash(value?: string | null) {
  return typeof value === 'string' && value.startsWith(`${HASH_PREFIX}$`);
}

export async function hashPassword(password: string) {
  const trimmed = password.trim();
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = (await scrypt(trimmed, salt, KEY_LENGTH)) as Buffer;

  return `${HASH_PREFIX}$${encode(salt)}$${encode(derivedKey)}`;
}

export async function verifyPassword(
  password: string,
  storedValue?: string | null,
) {
  if (!storedValue) {
    return false;
  }

  if (!isPasswordHash(storedValue)) {
    return storedValue === password;
  }

  const [, encodedSalt, encodedHash] = storedValue.split('$');
  if (!encodedSalt || !encodedHash) {
    return false;
  }

  const salt = decode(encodedSalt);
  const storedHash = decode(encodedHash);
  const derivedKey = (await scrypt(
    password,
    salt,
    storedHash.length,
  )) as Buffer;

  if (storedHash.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedHash, derivedKey);
}
