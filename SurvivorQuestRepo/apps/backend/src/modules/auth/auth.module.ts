import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthenticatedSessionGuard } from './guards/authenticated-session.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthenticatedSessionGuard, RolesGuard],
  exports: [AuthService, AuthenticatedSessionGuard, RolesGuard],
})
export class AuthModule {}
