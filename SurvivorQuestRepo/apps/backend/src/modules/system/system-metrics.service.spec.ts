import type { PrismaService } from '../../prisma/prisma.service';
import { SystemMetricsService, percentile } from './system-metrics.service';

function createService(overrides: { count?: jest.Mock; queryRaw?: jest.Mock } = {}) {
  const prisma = {
    $queryRaw: overrides.queryRaw ?? jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    teamAssignment: { count: overrides.count ?? jest.fn().mockResolvedValue(7) },
  } as unknown as PrismaService;
  return new SystemMetricsService(prisma);
}

describe('percentile', () => {
  it('returns null for no values and the nearest rank otherwise', () => {
    expect(percentile([], 95)).toBeNull();
    expect(percentile([5], 95)).toBe(5);
    const values = Array.from({ length: 100 }, (_, index) => 100 - index);
    expect(percentile(values, 95)).toBe(95);
    expect(percentile(values, 50)).toBe(50);
  });
});

describe('SystemMetricsService', () => {
  it('folds recorded requests into a sample and resets the counters', async () => {
    const service = createService();
    service.recordRequest(10, 200, false);
    service.recordRequest(30, 500, false);
    service.recordRequest(20, 429, false);
    service.recordRequest(7_000, 0, true);

    await service.collectSample(new Date('2026-10-08T12:00:00Z'));
    await service.collectSample(new Date('2026-10-08T12:00:10Z'));

    const snapshot = service.getSnapshot();
    expect(snapshot.history).toHaveLength(2);
    expect(snapshot.history[0]).toMatchObject({
      requests: 4,
      serverErrors: 1,
      throttled: 1,
      aborted: 1,
      p95Ms: 30,
      activeDevices: 7,
    });
    expect(snapshot.history[0].dbPingMs).not.toBeNull();
    expect(snapshot.current).toMatchObject({ requests: 0, p95Ms: null });
    expect(snapshot.window).toMatchObject({
      p95Ms: 30,
      requestsPerMinute: 12,
      serverErrors: 1,
      throttled: 1,
      aborted: 1,
    });
  });

  it('reports a failing database as null instead of throwing', async () => {
    const service = createService({
      queryRaw: jest.fn().mockRejectedValue(new Error('down')),
      count: jest.fn().mockRejectedValue(new Error('down')),
    });

    await service.collectSample();

    expect(service.getSnapshot().current).toMatchObject({
      dbPingMs: null,
      activeDevices: null,
    });
  });

  it('keeps ten minutes of history', async () => {
    const service = createService();
    for (let index = 0; index < 70; index += 1) {
      await service.collectSample(new Date(Date.UTC(2026, 9, 8, 12, 0, index * 10)));
    }

    const { history } = service.getSnapshot();
    expect(history).toHaveLength(60);
    expect(history[0].at).toBe('2026-10-08T12:01:40.000Z');
  });
});
