"use client";

import { useState } from "react";
import {
  useCompleteCurrentRealizationTeamTaskMutation,
  useFailCurrentRealizationTeamTaskMutation,
  useGetPendingPhotoReviewsQuery,
} from "../api/current-realization.api";

type CurrentRealizationPhotoReviewsPanelProps = {
  selectedRealizationId?: string;
  canManageTasks?: boolean;
};

export function CurrentRealizationPhotoReviewsPanel({
  selectedRealizationId,
  canManageTasks = false,
}: CurrentRealizationPhotoReviewsPanelProps) {
  const { data: reviews } = useGetPendingPhotoReviewsQuery(
    { realizationId: selectedRealizationId },
    { pollingInterval: 10_000, refetchOnFocus: true, refetchOnReconnect: true, skip: !canManageTasks },
  );
  const [completeTask, { isLoading: isCompleting }] = useCompleteCurrentRealizationTeamTaskMutation();
  const [failTask, { isLoading: isFailing }] = useFailCurrentRealizationTeamTaskMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    teamId: string;
    stationId: string;
    action: "approve" | "reject";
  } | null>(null);

  const isMutating = isCompleting || isFailing;

  if (!canManageTasks) {
    return null;
  }

  async function handleAction(
    teamId: string,
    stationId: string,
    action: "approve" | "reject",
  ) {
    if (action === "reject" && !window.confirm("Odrzucić to zdjęcie? Zadanie zostanie trwale niezaliczone, bez możliwości ponownej próby.")) {
      return;
    }

    setActionError(null);
    setPendingAction({ teamId, stationId, action });
    try {
      const basePayload = { realizationId: selectedRealizationId, teamId, stationId };
      if (action === "approve") {
        await completeTask(basePayload).unwrap();
      } else {
        await failTask(basePayload).unwrap();
      }
    } catch {
      setActionError("Nie udało się zapisać decyzji dotyczącej zdjęcia.");
    } finally {
      setPendingAction(null);
    }
  }

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">
          Zdjęcia czekające na akceptację ({reviews.length})
        </h2>
      </div>

      {actionError ? (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reviews.map((review) => {
          const isPendingForRow =
            pendingAction?.teamId === review.teamId && pendingAction?.stationId === review.stationId;

          return (
            <div
              key={`${review.teamId}-${review.stationId}`}
              className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={review.photoUrl}
                alt={review.stationName}
                className="h-32 w-full rounded-md border border-zinc-700 object-cover"
              />
              <p className="text-xs font-medium text-zinc-100">{review.stationName}</p>
              {review.stationDescription ? (
                <p className="text-xs italic text-amber-200/80">{review.stationDescription}</p>
              ) : null}
              <p className="text-xs text-zinc-400">{review.teamName}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => void handleAction(review.teamId, review.stationId, "approve")}
                  aria-label="Zatwierdź zdjęcie"
                  className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isPendingForRow && pendingAction?.action === "approve" ? "..." : "✓"}
                </button>
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => void handleAction(review.teamId, review.stationId, "reject")}
                  aria-label="Odrzuć zdjęcie"
                  className="flex-1 rounded-md border border-rose-400/40 bg-rose-500/10 px-2 py-1.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isPendingForRow && pendingAction?.action === "reject" ? "..." : "✗"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
