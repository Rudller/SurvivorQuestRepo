import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthenticatedSessionGuard } from '../auth/guards/authenticated-session.guard';
import { AdminOrInstructor } from '../auth/guards/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SystemMetricsService } from './system-metrics.service';

export const SYSTEM_HEALTH_PATHS = ['/system/health', '/api/system/health'];

@Controller(['system', 'api/system'])
@AdminOrInstructor()
@UseGuards(AuthenticatedSessionGuard, RolesGuard)
export class SystemController {
  constructor(private readonly systemMetricsService: SystemMetricsService) {}

  // Polled by the admin panel every 10 s; it must keep answering while the
  // venue's tablets are using up the shared per-address budget.
  @Get('health')
  @SkipThrottle({ short: true, long: true, venue: true })
  getHealth() {
    return this.systemMetricsService.getSnapshot();
  }
}
