import { Injectable } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getOpaqueTokenCandidates,
  hashOpaqueToken,
} from '../../shared/lib/opaque-token';
import {
  hashPassword,
  isPasswordHash,
  verifyPassword,
} from '../../shared/lib/password';

export type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'instructor';
};

function mapAuthUser(id: string, email: string, role: UserRole): AuthUser {
  return {
    id,
    email,
    role: role === UserRole.ADMIN ? 'admin' : 'instructor',
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        status: UserStatus.ACTIVE,
      },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return null;
    }

    if (user.passwordHash && !isPasswordHash(user.passwordHash)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(password),
        },
      });
    }

    const sessionToken = `sq_${crypto.randomUUID()}`;

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashOpaqueToken(sessionToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: mapAuthUser(user.id, user.email, user.role),
      sessionToken,
    };
  }

  async getUserBySession(sessionToken?: string) {
    const candidates = getOpaqueTokenCandidates(sessionToken);
    if (candidates.length === 0) {
      return null;
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash: { in: candidates },
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return null;
    }

    const rawToken = sessionToken?.trim();
    const looksHashed = /^[a-f0-9]{64}$/i.test(session.refreshTokenHash);
    if (rawToken && !looksHashed) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: {
          refreshTokenHash: hashOpaqueToken(rawToken),
        },
      });
    }

    return mapAuthUser(session.user.id, session.user.email, session.user.role);
  }

  async logout(sessionToken?: string) {
    const candidates = getOpaqueTokenCandidates(sessionToken);
    if (candidates.length === 0) {
      return;
    }

    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: { in: candidates },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
