import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SystemController } from './system.controller';
import { SystemMetricsService } from './system-metrics.service';

@Module({
  imports: [AuthModule],
  controllers: [SystemController],
  providers: [SystemMetricsService],
  exports: [SystemMetricsService],
})
export class SystemModule {}
