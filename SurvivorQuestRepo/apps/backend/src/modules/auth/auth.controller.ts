import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

type LoginPayload = {
  email?: string;
  password?: string;
};

function resolveCookieSameSite(): 'lax' | 'strict' | 'none' {
  const raw = process.env.AUTH_COOKIE_SAME_SITE?.toLowerCase();

  if (raw === 'lax' || raw === 'strict' || raw === 'none') {
    return raw;
  }

  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

function resolveCookieSecure() {
  if (process.env.AUTH_COOKIE_SECURE === 'true') {
    return true;
  }

  if (process.env.AUTH_COOKIE_SECURE === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

function readSessionToken(request: Request) {
  const cookies = request.cookies as unknown;
  if (!cookies || typeof cookies !== 'object') {
    return undefined;
  }

  const value = (cookies as Record<string, unknown>).sq_session;
  return typeof value === 'string' ? value : undefined;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() payload: LoginPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      payload.email || '',
      payload.password || '',
    );

    if (!result) {
      throw new UnauthorizedException('Invalid credentials');
    }

    response.cookie('sq_session', result.sessionToken, {
      httpOnly: true,
      sameSite: resolveCookieSameSite(),
      secure: resolveCookieSecure(),
      path: '/',
    });

    return { user: result.user };
  }

  @Get('me')
  async me(@Req() request: Request) {
    const user = await this.authService.getUserBySession(
      readSessionToken(request),
    );

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return { user };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(readSessionToken(request));

    response.cookie('sq_session', '', {
      maxAge: 0,
      path: '/',
      sameSite: resolveCookieSameSite(),
      secure: resolveCookieSecure(),
    });

    return { ok: true };
  }
}
