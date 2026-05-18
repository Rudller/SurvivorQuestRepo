import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  isCorsOriginAllowed,
  resolveOriginFromHeaders,
} from '../../../common/security/cors-origin';
import { readSessionToken } from '../auth.cookies';
import { AuthService, type AuthUser } from '../auth.service';

const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class AuthenticatedSessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.authService.getUserBySession(
      readSessionToken(request),
    );

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    request.user = user;

    const method = request.method.toUpperCase();
    if (!SAFE_HTTP_METHODS.has(method)) {
      const requestOrigin = resolveOriginFromHeaders(request.headers);
      if (!requestOrigin) {
        if (process.env.NODE_ENV === 'production') {
          throw new ForbiddenException('CSRF validation failed');
        }
      } else if (!isCorsOriginAllowed(requestOrigin)) {
        throw new ForbiddenException('CSRF validation failed');
      }
    }

    return true;
  }
}
