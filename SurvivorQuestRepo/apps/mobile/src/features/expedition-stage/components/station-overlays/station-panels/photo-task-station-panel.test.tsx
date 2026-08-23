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
});
