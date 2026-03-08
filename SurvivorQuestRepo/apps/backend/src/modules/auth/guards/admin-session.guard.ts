import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { readSessionToken } from '../auth.cookies';
import { AuthService } from '../auth.service';

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const user = await this.authService.getUserBySession(
      readSessionToken(request),
    );

    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('Unauthorized');
    }

    return true;
  }
}
