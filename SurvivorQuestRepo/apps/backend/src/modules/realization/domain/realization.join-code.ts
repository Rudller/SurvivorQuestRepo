import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { readRuntimeSecret } from '../../../shared/lib/runtime-secret';

const JOIN_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const JOIN_CODE_LENGTH = 6;
const STORED_JOIN_CODE_VERSION_PREFIX = 'v2';
const LEGACY_JOIN_CODE_PEPPERS = ['survivorquest-join-code'];

type JoinCodeStore = {
  findExistingByStoredOrLegacy(
    storedCode: string,
    publicCode: string,
    hashedCode: string,
  ): Promise<{ id: string } | null>;
};

export class RealizationJoinCodeService {
  private hashJoinCode(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private getJoinCodePepper() {
    return readRuntimeSecret({
      key: 'JOIN_CODE_PEPPER',
      developmentFallback: 'dev-join-code-pepper-change-me-123456',
    });
  }

  private getJoinCodePepperCandidates() {
    const legacyPepperFromEnv = process.env.JOIN_CODE_LEGACY_PEPPER?.trim();

    return Array.from(
      new Set([
        this.getJoinCodePepper(),
        ...(legacyPepperFromEnv ? [legacyPepperFromEnv] : []),
        ...LEGACY_JOIN_CODE_PEPPERS,
      ]),
    );
  }

  private parseStoredJoinCode(stored: string) {
    const normalized = stored.trim();
    const parts = normalized.split(':');

    if (
      parts.length === 3 &&
      parts[0] === STORED_JOIN_CODE_VERSION_PREFIX &&
      /^\d+$/.test(parts[1]) &&
      /^[a-f0-9]{64}$/i.test(parts[2])
    ) {
      return {
        attempt: Number(parts[1]),
        hash: parts[2].toLowerCase(),
      };
    }

    return null;
  }

  private generateJoinCode(
    realizationId: string,
    attempt: number,
    pepper = this.getJoinCodePepper(),
  ) {
    const seed = `${realizationId}:${attempt}:${pepper}`;
    const hash = this.hashJoinCode(seed);
    const bytes = Buffer.from(hash, 'hex');
    let code = '';

    for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
      code += JOIN_CODE_ALPHABET[bytes[index] % JOIN_CODE_ALPHABET.length];
    }

    return code;
  }

  async createUniqueJoinCode(realizationId: string, store: JoinCodeStore) {
    let attempt = 0;

    while (attempt < 100) {
      const publicCode = this.generateJoinCode(realizationId, attempt);
      const hashedCode = this.hashJoinCode(publicCode);
      const storedCode = `${STORED_JOIN_CODE_VERSION_PREFIX}:${attempt}:${hashedCode}`;

      const existing = await store.findExistingByStoredOrLegacy(
        storedCode,
        publicCode,
        hashedCode,
      );

      if (!existing) {
        return {
          publicCode,
          storedCode,
        };
      }

      attempt += 1;
    }

    throw new BadRequestException('Failed to generate unique join code');
  }

  resolvePublicJoinCode(realizationId: string, storedJoinCode: string) {
    const parsed = this.parseStoredJoinCode(storedJoinCode);
    if (!parsed) {
      return storedJoinCode;
    }

    for (const pepper of this.getJoinCodePepperCandidates()) {
      const publicCode = this.generateJoinCode(
        realizationId,
        parsed.attempt,
        pepper,
      );
      const publicCodeHash = this.hashJoinCode(publicCode);
      if (publicCodeHash === parsed.hash) {
        return publicCode;
      }
    }

    return '------';
  }
}
