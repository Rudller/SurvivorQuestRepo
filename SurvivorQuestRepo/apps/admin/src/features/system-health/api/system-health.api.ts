import { baseApi } from "@/shared/api/base-api";
import { buildApiPath } from "@/shared/api/api-path";
import type { SystemHealth, SystemMetricsSample } from "../types/system-health";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeSample(raw: unknown): SystemMetricsSample {
  const source = asRecord(raw);
  return {
    at: asString(source.at),
    eventLoopLagP99Ms: asNumber(source.eventLoopLagP99Ms),
    eventLoopLagMaxMs: asNumber(source.eventLoopLagMaxMs),
    cpuPercent: asNumber(source.cpuPercent),
    rssMb: asNumber(source.rssMb),
    heapUsedMb: asNumber(source.heapUsedMb),
    requests: asNumber(source.requests),
    p95Ms: asNullableNumber(source.p95Ms),
    serverErrors: asNumber(source.serverErrors),
    throttled: asNumber(source.throttled),
    aborted: asNumber(source.aborted),
    dbPingMs: asNullableNumber(source.dbPingMs),
    activeDevices: asNullableNumber(source.activeDevices),
  };
}

function normalizeSystemHealth(raw: unknown): SystemHealth {
  const source = asRecord(raw);
  const window = asRecord(source.window);
  return {
    serverTime: asString(source.serverTime),
    startedAt: asString(source.startedAt),
    uptimeSeconds: asNumber(source.uptimeSeconds),
    sampleIntervalMs: asNumber(source.sampleIntervalMs, 10_000),
    heapLimitMb: asNumber(source.heapLimitMb),
    current: source.current ? normalizeSample(source.current) : null,
    window: {
      p95Ms: asNullableNumber(window.p95Ms),
      requestsPerMinute: asNumber(window.requestsPerMinute),
      serverErrors: asNumber(window.serverErrors),
      throttled: asNumber(window.throttled),
      aborted: asNumber(window.aborted),
    },
    history: Array.isArray(source.history) ? source.history.map(normalizeSample) : [],
  };
}

export const systemHealthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSystemHealth: build.query<SystemHealth, void>({
      // A choked backend never answers; without a timeout the poll would hang
      // on that one request and the gauges would freeze on the last good values.
      query: () => ({ url: buildApiPath("/system/health"), timeout: 8_000 }),
      transformResponse: (response: unknown) => normalizeSystemHealth(response),
    }),
  }),
});

export const { useGetSystemHealthQuery } = systemHealthApi;
