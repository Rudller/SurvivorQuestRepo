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

export type SystemHealth = {
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
