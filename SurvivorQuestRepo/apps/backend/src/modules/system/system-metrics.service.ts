import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import { PrismaService } from '../../prisma/prisma.service';

export const SAMPLE_INTERVAL_MS = 10_000;
const HISTORY_SIZE = 60; // 10 minutes of 10 s samples
const LATENCY_WINDOW_SAMPLES = 6; // p95 over the last minute
const ERROR_WINDOW_SAMPLES = 30; // error totals over the last 5 minutes
const MAX_DURATIONS_PER_SAMPLE = 5_000;
const ACTIVE_DEVICE_WINDOW_MS = 2 * 60_000;
const DB_PING_TIMEOUT_MS = 5_000;

export type SystemMetricsSample = {
  at: string;
  eventLoopLagP99Ms: number;
  eventLoopLagMaxMs: number;
  cpuPercent: number;
  rssMb: number;
  heapUsedMb: number;
  requests: number;
  p95Ms: number | null;
  serverErrors: number;
  throttled: number;
  aborted: number;
  dbPingMs: number | null;
  activeDevices: number | null;
};

export type SystemHealthSnapshot = {
  serverTime: string;
  startedAt: string;
  uptimeSeconds: number;
  sampleIntervalMs: number;
  heapLimitMb: number;
  current: SystemMetricsSample | null;
  window: {
    p95Ms: number | null;
    requestsPerMinute: number;
    serverErrors: number;
    throttled: number;
    aborted: number;
  };
  history: SystemMetricsSample[];
};

type PendingSample = {
  durations: number[];
  requests: number;
  serverErrors: number;
  throttled: number;
  aborted: number;
};

function createPendingSample(): PendingSample {
  return { durations: [], requests: 0, serverErrors: 0, throttled: 0, aborted: 0 };
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function toMb(bytes: number) {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * Process health for the admin panel's gauges.
 *
 * Everything here is collected in memory on a fixed 10 s tick, so reading it
 * costs nothing: the health endpoint hands back the last samples without
 * touching the request path or the database. The only queries are the tick's
 * own `SELECT 1` and one assignment count, regardless of how many panels watch.
 */
@Injectable()
export class SystemMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemMetricsService.name);
  private readonly startedAt = new Date();
  private readonly history: SystemMetricsSample[] = [];
  private readonly recentDurations: number[][] = [];
  private pending = createPendingSample();
  private loopDelay: IntervalHistogram | null = null;
  private lastCpu = process.cpuUsage();
  private lastCpuAt = process.hrtime.bigint();
  private timer: NodeJS.Timeout | null = null;
  private sampling = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.loopDelay = monitorEventLoopDelay({ resolution: 20 });
    this.loopDelay.enable();
    this.timer = setInterval(() => void this.collectSample(), SAMPLE_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.loopDelay?.disable();
  }

  recordRequest(durationMs: number, statusCode: number, aborted: boolean) {
    const pending = this.pending;
    pending.requests += 1;

    if (aborted) {
      pending.aborted += 1;
      return;
    }

    if (statusCode >= 500) {
      pending.serverErrors += 1;
    } else if (statusCode === 429) {
      pending.throttled += 1;
    }

    if (pending.durations.length < MAX_DURATIONS_PER_SAMPLE) {
      pending.durations.push(durationMs);
    }
  }

  async collectSample(now = new Date()) {
    if (this.sampling) {
      return;
    }

    this.sampling = true;
    try {
      const pending = this.pending;
      this.pending = createPendingSample();

      const cpu = process.cpuUsage();
      const cpuAt = process.hrtime.bigint();
      const elapsedMicros = Number(cpuAt - this.lastCpuAt) / 1_000;
      const usedMicros =
        cpu.user - this.lastCpu.user + (cpu.system - this.lastCpu.system);
      this.lastCpu = cpu;
      this.lastCpuAt = cpuAt;

      const loopDelay = this.loopDelay;
      const eventLoopLagP99Ms = loopDelay ? loopDelay.percentile(99) / 1e6 : 0;
      const eventLoopLagMaxMs = loopDelay ? loopDelay.max / 1e6 : 0;
      loopDelay?.reset();

      const memory = process.memoryUsage();
      const [dbPingMs, activeDevices] = await Promise.all([
        this.pingDatabase(),
        this.countActiveDevices(now),
      ]);

      this.recentDurations.push(pending.durations);
      if (this.recentDurations.length > LATENCY_WINDOW_SAMPLES) {
        this.recentDurations.shift();
      }

      const p95 = percentile(pending.durations, 95);
      this.history.push({
        at: now.toISOString(),
        eventLoopLagP99Ms: round(eventLoopLagP99Ms),
        eventLoopLagMaxMs: round(eventLoopLagMaxMs),
        cpuPercent: elapsedMicros > 0 ? round((usedMicros / elapsedMicros) * 100) : 0,
        rssMb: toMb(memory.rss),
        heapUsedMb: toMb(memory.heapUsed),
        requests: pending.requests,
        p95Ms: p95 === null ? null : round(p95),
        serverErrors: pending.serverErrors,
        throttled: pending.throttled,
        aborted: pending.aborted,
        dbPingMs,
        activeDevices,
      });
      if (this.history.length > HISTORY_SIZE) {
        this.history.shift();
      }
    } catch (error) {
      this.logger.warn(
        `Failed to collect metrics sample: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.sampling = false;
    }
  }

  getSnapshot(now = new Date()): SystemHealthSnapshot {
    const errorWindow = this.history.slice(-ERROR_WINDOW_SAMPLES);
    const latencyWindow = this.history.slice(-LATENCY_WINDOW_SAMPLES);
    const windowSeconds = (latencyWindow.length * SAMPLE_INTERVAL_MS) / 1_000;
    const windowRequests = latencyWindow.reduce((sum, sample) => sum + sample.requests, 0);
    const p95 = percentile(this.recentDurations.flat(), 95);

    return {
      serverTime: now.toISOString(),
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      sampleIntervalMs: SAMPLE_INTERVAL_MS,
      heapLimitMb: toMb(getHeapStatistics().heap_size_limit),
      current: this.history.at(-1) ?? null,
      window: {
        p95Ms: p95 === null ? null : round(p95),
        requestsPerMinute:
          windowSeconds > 0 ? Math.round((windowRequests / windowSeconds) * 60) : 0,
        serverErrors: errorWindow.reduce((sum, sample) => sum + sample.serverErrors, 0),
        throttled: errorWindow.reduce((sum, sample) => sum + sample.throttled, 0),
        aborted: errorWindow.reduce((sum, sample) => sum + sample.aborted, 0),
      },
      history: [...this.history],
    };
  }

  private async pingDatabase(): Promise<number | null> {
    const startedAt = performance.now();
    let timeout: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('timeout')), DB_PING_TIMEOUT_MS);
        }),
      ]);
      return round(performance.now() - startedAt);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async countActiveDevices(now: Date): Promise<number | null> {
    // lastSeenAt is refreshed at most once a minute (see requireSession), so
    // the window has to be wider than that to count a polling tablet.
    try {
      return await this.prisma.teamAssignment.count({
        where: { lastSeenAt: { gte: new Date(now.getTime() - ACTIVE_DEVICE_WINDOW_MS) } },
      });
    } catch {
      return null;
    }
  }
}
