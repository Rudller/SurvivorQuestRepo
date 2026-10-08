import type { NextFunction, Request, Response } from 'express';
import { SYSTEM_HEALTH_PATHS } from './system.controller';
import type { SystemMetricsService } from './system-metrics.service';

/**
 * Times every HTTP request for the health gauges. A request whose client hung
 * up before the response was written (a tablet that hit its own timeout) is
 * counted as aborted rather than timed.
 */
export function createRequestMetricsMiddleware(metrics: SystemMetricsService) {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.originalUrl.split('?')[0];
    if (SYSTEM_HEALTH_PATHS.includes(path)) {
      next();
      return;
    }

    const startedAt = performance.now();
    res.once('close', () => {
      metrics.recordRequest(
        performance.now() - startedAt,
        res.statusCode,
        !res.writableFinished,
      );
    });
    next();
  };
}
