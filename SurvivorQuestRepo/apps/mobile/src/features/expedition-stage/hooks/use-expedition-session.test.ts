import type { ExpeditionSessionState } from "../model/types";
import {
  getMobileApiErrorCode,
  getMobileApiErrorStatusCode,
  isSessionTokenInvalidError,
  MobileApiHttpError,
} from "../api/mobile-session.api";
import { applyCompletedTaskState, isRetriableNetworkError, runRequestWithRetry } from "./use-expedition-session";

function createSessionState(): ExpeditionSessionState {
  return {
    realization: {
      id: "realization-1",
      companyName: "Test Company",
      contactPerson: "",
      availableLanguages: [],
      instructors: [],
      status: "in-progress",
      locationRequired: false,
      showLeaderboard: true,
      showLeaderboardDuringGame: true,
      showLeaderboardOnFinish: true,
      teamStationNumberingEnabled: true,
      scheduledAt: "2026-05-10T00:00:00.000Z",
      durationMinutes: 120,
      stations: [
        {
          id: "station-1",
          name: "Station 1",
          type: "time",
          description: "desc",
          imageUrl: "https://example.com/img.png",
          points: 200,
          timeLimitSeconds: 100,
        },
      ],
    },
    team: {
      id: "team-1",
      slotNumber: 1,
      name: "Team",
      color: null,
      badgeKey: null,
      points: 0,
      lastLocation: null,
    },
    tasks: [
      {
        stationId: "station-1",
        status: "in-progress",
        pointsAwarded: 0,
        startedAt: "2026-05-10T00:00:00.000Z",
        finishedAt: null,
      },
    ],
    endState: {
      isEnded: false,
      reason: null,
      endedAt: null,
    },
    leaderboard: {
      updatedAt: "2026-05-10T00:00:00.000Z",
      entries: [],
    },
    meta: {
      sessionExpiresAt: "2026-05-10T03:00:00.000Z",
      eventLogCount: 0,
    },
  };
}

describe("applyCompletedTaskState", () => {
  it("is idempotent when task is already completed", () => {
    const initialState = createSessionState();
    const finishedAt = "2026-05-10T00:00:10.000Z";

    const firstCompletion = applyCompletedTaskState({
      current: initialState,
      stationId: "station-1",
      startedAt: initialState.tasks[0]?.startedAt ?? undefined,
      finishedAt,
      requireExistingTask: true,
    });

    expect(firstCompletion).not.toBe(initialState);
    expect(firstCompletion.tasks[0]?.status).toBe("done");
    expect(firstCompletion.team.points).toBe(180);
    expect(firstCompletion.meta.eventLogCount).toBe(1);

    const secondCompletion = applyCompletedTaskState({
      current: firstCompletion,
      stationId: "station-1",
      startedAt: initialState.tasks[0]?.startedAt ?? undefined,
      finishedAt: "2026-05-10T00:00:20.000Z",
      requireExistingTask: true,
    });

    expect(secondCompletion).toBe(firstCompletion);
    expect(secondCompletion.team.points).toBe(180);
    expect(secondCompletion.meta.eventLogCount).toBe(1);
  });
});

describe("network retry helpers", () => {
  it("retries once after transient network error", async () => {
    const request = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValue("ok");

    const result = await runRequestWithRetry({
      request,
      timeoutMs: 100,
      timeoutMessage: "timeout",
      retryDelaysMs: [1],
    });

    expect(result).toBe("ok");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retriable API errors", async () => {
    const request = jest.fn<Promise<string>, [AbortSignal]>().mockRejectedValue(new Error("HTTP 400"));

    await expect(
      runRequestWithRetry({
        request,
        timeoutMs: 100,
        timeoutMessage: "timeout",
        retryDelaysMs: [1, 1],
      }),
    ).rejects.toThrow("HTTP 400");

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("treats timeout as retriable and succeeds on next attempt", async () => {
    const request = jest.fn<Promise<string>, [AbortSignal]>(() => {
      if (request.mock.calls.length === 1) {
        return new Promise<string>((resolve) => {
          setTimeout(() => {
            resolve("late");
          }, 20);
        });
      }
      return Promise.resolve("ok");
    });

    const result = await runRequestWithRetry({
      request,
      timeoutMs: 5,
      timeoutMessage: "timed out",
      retryDelaysMs: [1],
    });

    expect(result).toBe("ok");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("aborts a timed out attempt before retrying", async () => {
    const request = jest.fn<Promise<string>, [AbortSignal]>((signal) => {
      if (request.mock.calls.length === 1) {
        return new Promise<string>((resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        });
      }

      return Promise.resolve("ok");
    });

    const result = await runRequestWithRetry({
      request,
      timeoutMs: 5,
      timeoutMessage: "timed out",
      retryDelaysMs: [1],
    });

    expect(result).toBe("ok");
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]?.[0].aborted).toBe(true);
  });

  it("does not retry when retry delays are empty", async () => {
    const request = jest.fn<Promise<string>, [AbortSignal]>().mockRejectedValue(new Error("timed out"));

    await expect(
      runRequestWithRetry({
        request,
        timeoutMs: 100,
        timeoutMessage: "timed out",
        retryDelaysMs: [],
      }),
    ).rejects.toThrow("timed out");

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("detects retriable network messages", () => {
    expect(isRetriableNetworkError(new Error("Failed to fetch"))).toBe(true);
    expect(isRetriableNetworkError(new Error("HTTP 503"))).toBe(true);
    expect(isRetriableNetworkError(new Error("HTTP 400"))).toBe(false);
  });

  it("treats HTTP 403 as an invalid mobile session", () => {
    expect(isSessionTokenInvalidError(new Error("HTTP 403"))).toBe(true);
  });

  it("reads structured mobile API error status and code", () => {
    const error = new MobileApiHttpError({
      statusCode: 409,
      code: "TASK_ALREADY_COMPLETED",
      message: "Task already completed",
      responseBody: { statusCode: 409 },
    });

    expect(getMobileApiErrorStatusCode(error)).toBe(409);
    expect(getMobileApiErrorCode(error)).toBe("TASK_ALREADY_COMPLETED");
  });

  it("treats structured 403 errors as invalid mobile sessions", () => {
    const error = new MobileApiHttpError({
      statusCode: 403,
      code: "FORBIDDEN",
      message: "Forbidden",
      responseBody: { statusCode: 403 },
    });

    expect(isSessionTokenInvalidError(error)).toBe(true);
  });
});
