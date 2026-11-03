import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { StationTestViewModel } from "../types";
import { createStation } from "./station-smoke.fixtures";
import { usePhotoTaskCapture } from "./photo-task-station-panel";

type PhotoTaskCaptureProps = {
  station: StationTestViewModel;
};

describe("usePhotoTaskCapture", () => {
  it("clears the previous photo when another photo station opens", async () => {
    const firstStation = createStation({ stationId: "photo-1", stationType: "photo-task", status: "todo" });
    const secondStation = createStation({ stationId: "photo-2", stationType: "photo-task", status: "todo" });
    const submitPhoto = jest.fn().mockResolvedValue(null);
    const showPendingReviewPopup = jest.fn();
    const { result, rerender } = await renderHook<ReturnType<typeof usePhotoTaskCapture>, PhotoTaskCaptureProps>(
      ({ station }) => usePhotoTaskCapture(station, submitPhoto, showPendingReviewPopup),
      { initialProps: { station: firstStation } },
    );

    await act(async () => {
      result.current.handleConfirmedCapture("file:///photo-1.jpg");
    });

    await waitFor(() => {
      expect(result.current.previewUri).toBe("file:///photo-1.jpg");
      expect(result.current.hasPendingSubmission).toBe(true);
      expect(showPendingReviewPopup).toHaveBeenCalledTimes(1);
    });

    await rerender({ station: secondStation });

    await waitFor(() => {
      expect(result.current.previewUri).toBeNull();
      expect(result.current.hasPendingSubmission).toBe(false);
      expect(result.current.isCaptureActive).toBe(false);
      expect(result.current.uploadError).toBeNull();
    });
  });

  it("opens the camera right away for every card when autoOpenCapture is set (Ryzykanci)", async () => {
    const firstStation = createStation({ stationId: "photo-1", stationType: "photo-task", status: "todo" });
    const secondStation = createStation({ stationId: "photo-2", stationType: "photo-task", status: "todo" });
    const { result, rerender } = await renderHook<ReturnType<typeof usePhotoTaskCapture>, PhotoTaskCaptureProps>(
      ({ station }) => usePhotoTaskCapture(station, jest.fn().mockResolvedValue(null), jest.fn(), {
        autoOpenCapture: true,
      }),
      { initialProps: { station: firstStation } },
    );

    expect(result.current.isCaptureActive).toBe(true);

    await act(async () => {
      result.current.closeCapture();
    });
    expect(result.current.isCaptureActive).toBe(false);

    await rerender({ station: secondStation });

    await waitFor(() => {
      expect(result.current.isCaptureActive).toBe(true);
    });
  });

  it("tells the team to scan the QR code again when the photo is rejected while the panel is open", async () => {
    const waiting = createStation({ stationId: "photo-1", stationType: "photo-task", status: "in-progress" });
    const { result, rerender } = await renderHook<ReturnType<typeof usePhotoTaskCapture>, PhotoTaskCaptureProps>(
      ({ station }) => usePhotoTaskCapture(station, jest.fn().mockResolvedValue(null), jest.fn()),
      { initialProps: { station: waiting } },
    );

    expect(result.current.hasPendingSubmission).toBe(true);

    // Organizator odrzucił: zadanie wraca do todo z nowym znacznikiem.
    const rejectedAt = new Date(Date.now() + 1_000).toISOString();
    await rerender({ station: { ...waiting, status: "todo", rejectedAt } });

    await waitFor(() => {
      expect(result.current.isRejectedForRetry).toBe(true);
      expect(result.current.hasPendingSubmission).toBe(false);
      expect(result.current.canCapture).toBe(false);
    });
  });

  it("keeps the camera available when a rejection from before the scan arrives late", async () => {
    // Drużyna zeskanowała kod, zanim tablet odpytał o odrzucenie: panel widzi
    // jeszcze stare „czeka na ocenę”, a odrzucenie przychodzi później.
    const stale = createStation({ stationId: "photo-1", stationType: "photo-task", status: "in-progress" });
    const { result, rerender } = await renderHook<ReturnType<typeof usePhotoTaskCapture>, PhotoTaskCaptureProps>(
      ({ station }) => usePhotoTaskCapture(station, jest.fn().mockResolvedValue(null), jest.fn()),
      { initialProps: { station: stale } },
    );

    const rejectedAt = new Date(Date.now() - 5_000).toISOString();
    await rerender({ station: { ...stale, status: "todo", rejectedAt } });

    await waitFor(() => {
      expect(result.current.isRejectedForRetry).toBe(false);
      expect(result.current.hasPendingSubmission).toBe(false);
      expect(result.current.canCapture).toBe(true);
    });
  });

  it("lets the team take a new photo when the station is opened again after a rejection", async () => {
    const reopened = createStation({
      stationId: "photo-1",
      stationType: "photo-task",
      status: "todo",
      rejectedAt: "2026-10-16T12:00:00.000Z",
    });
    const { result } = await renderHook<ReturnType<typeof usePhotoTaskCapture>, PhotoTaskCaptureProps>(
      ({ station }) => usePhotoTaskCapture(station, jest.fn().mockResolvedValue(null), jest.fn()),
      { initialProps: { station: reopened } },
    );

    expect(result.current.isRejectedForRetry).toBe(false);
    expect(result.current.canCapture).toBe(true);
  });

  it("keeps the camera closed for a station that can no longer be captured", async () => {
    const doneStation = createStation({ stationId: "photo-done", stationType: "photo-task", status: "done" });
    const { result } = await renderHook<ReturnType<typeof usePhotoTaskCapture>, PhotoTaskCaptureProps>(
      ({ station }) => usePhotoTaskCapture(station, jest.fn().mockResolvedValue(null), jest.fn(), {
        autoOpenCapture: true,
      }),
      { initialProps: { station: doneStation } },
    );

    expect(result.current.isCaptureActive).toBe(false);
    expect(result.current.canCapture).toBe(false);
  });
});
