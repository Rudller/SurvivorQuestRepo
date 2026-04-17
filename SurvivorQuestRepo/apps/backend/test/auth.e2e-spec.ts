import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserRole, UserStatus } from '@prisma/client';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPassword, verifyPassword } from '../src/shared/lib/password';

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
};

type StoredSession = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

function readCookieValue(rawCookie: string, name: string) {
  const match = rawCookie.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1];
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let users: StoredUser[];
  let sessions: StoredSession[];

  beforeEach(async () => {
    users = [
      {
        id: 'admin-1',
        email: 'admin@test.pl',
        passwordHash: await hashPassword('sekret123'),
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    ];
    sessions = [];

    const prismaMock = {
      user: {
        findFirst: jest.fn(
          ({
            where,
          }: {
            where: { email: string; status?: UserStatus };
          }) => {
            return (
              users.find(
                (user) =>
                  user.email === where.email &&
                  (!where.status || user.status === where.status),
              ) ?? null
            );
          },
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: { passwordHash?: string };
          }) => {
            const user = users.find((entry) => entry.id === where.id);
            if (!user) {
              throw new Error(`User ${where.id} not found`);
            }

            Object.assign(user, data);
            return user;
          },
        ),
      },
      authSession: {
        create: jest.fn(
          ({ data }: { data: Omit<StoredSession, 'id' | 'revokedAt'> }) => {
            const session: StoredSession = {
              id: `session-${sessions.length + 1}`,
              revokedAt: null,
              ...data,
            };
            sessions.push(session);
            return session;
          },
        ),
        findFirst: jest.fn(
          ({
            where,
            include,
          }: {
            where: {
              refreshTokenHash: { in: string[] };
              revokedAt: null;
              expiresAt: { gt: Date };
            };
            include?: { user?: boolean };
          }) => {
            const session = sessions.find((entry) => {
              return (
                where.refreshTokenHash.in.includes(entry.refreshTokenHash) &&
                entry.revokedAt === where.revokedAt &&
                entry.expiresAt > where.expiresAt.gt
              );
            });

            if (!session) {
              return null;
            }

            if (!include?.user) {
              return session;
            }

            const user = users.find((entry) => entry.id === session.userId);
            if (!user) {
              return null;
            }

            return {
              ...session,
              user,
            };
          },
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: { refreshTokenHash?: string };
          }) => {
            const session = sessions.find((entry) => entry.id === where.id);
            if (!session) {
              throw new Error(`Session ${where.id} not found`);
            }

            Object.assign(session, data);
            return session;
          },
        ),
        updateMany: jest.fn(
          ({
            where,
            data,
          }: {
            where: { refreshTokenHash: { in: string[] }; revokedAt: null };
            data: { revokedAt: Date };
          }) => {
            let count = 0;
            for (const session of sessions) {
              if (
                where.refreshTokenHash.in.includes(session.refreshTokenHash) &&
                session.revokedAt === where.revokedAt
              ) {
                session.revokedAt = data.revokedAt;
                count += 1;
              }
            }

            return { count };
          },
        ),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('stores a hashed session token and resolves /auth/me from the cookie token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.pl', password: 'sekret123' })
      .expect(201);

    expect(loginResponse.body).toEqual({
      user: {
        id: 'admin-1',
        email: 'admin@test.pl',
        role: 'admin',
      },
    });

    const rawCookie = loginResponse.headers['set-cookie']?.[0];
    expect(rawCookie).toBeDefined();

    const rawToken = readCookieValue(rawCookie, 'sq_session');
    expect(rawToken).toBeDefined();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].refreshTokenHash).not.toBe(rawToken);
    expect(sessions[0].refreshTokenHash).toHaveLength(64);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', rawCookie)
      .expect(200)
      .expect({
        user: {
          id: 'admin-1',
          email: 'admin@test.pl',
          role: 'admin',
        },
      });
  });

  it('migrates a legacy plaintext password to a hash on successful login', async () => {
    users[0].passwordHash = 'legacy123';

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.pl', password: 'legacy123' })
      .expect(201);

    expect(users[0].passwordHash).not.toBe('legacy123');
    expect(users[0].passwordHash.startsWith('scrypt$')).toBe(true);
    await expect(
      verifyPassword('legacy123', users[0].passwordHash),
    ).resolves.toBe(true);
  });

  it('accepts legacy plaintext session records and migrates them to a hash on read', async () => {
    sessions.push({
      id: 'session-legacy',
      userId: 'admin-1',
      refreshTokenHash: 'sq_legacy_token',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', 'sq_session=sq_legacy_token')
      .expect(200)
      .expect({
        user: {
          id: 'admin-1',
          email: 'admin@test.pl',
          role: 'admin',
        },
      });

    expect(sessions[0].refreshTokenHash).not.toBe('sq_legacy_token');
    expect(sessions[0].refreshTokenHash).toHaveLength(64);
  });

  it('rejects blocked accounts even with a valid password', async () => {
    users[0].status = UserStatus.BLOCKED;

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.pl', password: 'sekret123' })
      .expect(401);

    expect(sessions).toHaveLength(0);
  });
});
