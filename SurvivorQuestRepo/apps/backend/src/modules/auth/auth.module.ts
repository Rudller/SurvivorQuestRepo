import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminSessionGuard } from './guards/admin-session.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AdminSessionGuard],
  exports: [AuthService, AdminSessionGuard],
})
export class AuthModule {}
