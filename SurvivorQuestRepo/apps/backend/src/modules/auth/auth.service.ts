import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'instructor';
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        passwordHash: password,
      },
    });

    if (!user) {
      return null;
    }

    const sessionToken = `sq_${crypto.randomUUID()}`;

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: this.mapAuthUser(user.id, user.email, user.role),
      sessionToken,
    };
  }

  async getUserBySession(sessionToken?: string) {
    if (!sessionToken) {
      return null;
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash: sessionToken,
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

    return this.mapAuthUser(
      session.user.id,
      session.user.email,
      session.user.role,
    );
  }

  async logout(sessionToken?: string) {
    if (!sessionToken) {
      return;
    }

    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: sessionToken,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private mapAuthUser(id: string, email: string, role: UserRole): AuthUser {
    return {
      id,
      email,
      role: role === UserRole.ADMIN ? 'admin' : 'instructor',
    };
  }
}
