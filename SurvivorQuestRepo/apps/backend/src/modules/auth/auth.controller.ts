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
import { parseLoginDto } from './dto/auth.dto';
import {
  readSessionToken,
  resolveCookieSameSite,
  resolveCookieSecure,
} from './auth.cookies';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() payload: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    const dto = parseLoginDto(payload);
    const result = await this.authService.login(dto.email, dto.password);

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
