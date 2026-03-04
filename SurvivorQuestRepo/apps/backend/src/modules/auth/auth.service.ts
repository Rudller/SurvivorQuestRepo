import { Injectable } from '@nestjs/common';

type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'instructor';
};

@Injectable()
export class AuthService {
  private readonly activeSessions = new Set<string>();

  login(email: string, password: string) {
    if (email !== 'test@mail.com' || password !== 'hasło123') {
      return null;
    }

    const sessionToken = `sq_${crypto.randomUUID()}`;
    this.activeSessions.add(sessionToken);

    const user: AuthUser = {
      id: '1',
      email,
      role: 'admin',
    };

    return { user, sessionToken };
  }

  getUserBySession(sessionToken?: string) {
    if (!sessionToken || !this.activeSessions.has(sessionToken)) {
      return null;
    }

    return {
      id: '1',
      email: 'test@mail.com',
      role: 'admin' as const,
    };
  }

  logout(sessionToken?: string) {
    if (sessionToken) {
      this.activeSessions.delete(sessionToken);
    }
  }
}
