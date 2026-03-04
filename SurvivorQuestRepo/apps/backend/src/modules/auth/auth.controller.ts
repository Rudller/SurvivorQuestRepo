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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginPayload, @Res({ passthrough: true }) response: Response) {
    const result = this.authService.login(payload.email || '', payload.password || '');

    if (!result) {
      throw new UnauthorizedException('Invalid credentials');
    }

    response.cookie('sq_session', result.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    return { user: result.user };
  }

  @Get('me')
  me(@Req() request: Request) {
    const user = this.authService.getUserBySession(request.cookies?.sq_session);

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return { user };
  }

  @Post('logout')
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.authService.logout(request.cookies?.sq_session);

    response.cookie('sq_session', '', {
      maxAge: 0,
      path: '/',
    });

    return { ok: true };
  }
}
