import { randomBytes } from 'node:crypto';

export const RANDOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateRandomCode(
  length: number,
  alphabet: string = RANDOM_CODE_ALPHABET,
) {
  const bytes = randomBytes(length);
  let code = '';

  for (let index = 0; index < length; index += 1) {
    code += alphabet[bytes[index] % alphabet.length];
  }

  return code;
}
