"use client";

import { useState } from "react";
import {
  useCompleteCurrentRealizationTeamTaskMutation,
  useFailCurrentRealizationTeamTaskMutation,
  useGetPendingPhotoReviewsQuery,
} from "../api/current-realization.api";
import {
  useCompleteRiskCardMutation,
  useFailRiskCardMutation,
} from "@/features/risk-quiz/api/risk-quiz.api";
import { resolveApiErrorMessage } from "@/shared/lib/api-error";

type CurrentRealizationPhotoReviewsPanelProps = {
  selectedRealizationId?: string;
  canManageTasks?: boolean;
  // Ryzykanci score a card through RiskAttempt, not TeamTaskProgress, so the
  // verdict has to travel to the deck's own endpoints — the same ones the
  // team-tasks board already uses for Zalicz/Niezalicz there.
  isRiskQuizRealization?: boolean;
  // Concrete realization id for those endpoints: selectedRealizationId is
  // undefined whenever the page is showing "the current realization", which
  // the classic task endpoints understand and the deck ones do not.
  riskRealizationId?: string;
};

export function CurrentRealizationPhotoReviewsPanel({
  selectedRealizationId,
  canManageTasks = false,
  isRiskQuizRealization = false,
  riskRealizationId,
}: CurrentRealizationPhotoReviewsPanelProps) {
  const { data: reviews } = useGetPendingPhotoReviewsQuery(
    { realizationId: selectedRealizationId },
    { pollingInterval: 10_000, refetchOnFocus: true, refetchOnReconnect: true, skip: !canManageTasks },
  );
  const [completeTask, { isLoading: isCompleting }] = useCompleteCurrentRealizationTeamTaskMutation();
  const [failTask, { isLoading: isFailing }] = useFailCurrentRealizationTeamTaskMutation();
  const [completeRiskCard, { isLoading: isCompletingRiskCard }] = useCompleteRiskCardMutation();
  const [failRiskCard, { isLoading: isFailingRiskCard }] = useFailRiskCardMutation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    teamId: string;
    stationId: string;
    action: "approve" | "reject";
  } | null>(null);

  const isMutating = isCompleting || isFailing || isCompletingRiskCard || isFailingRiskCard;

  if (!canManageTasks) {
    return null;
  }

  async function handleAction(
    teamId: string,
    stationId: string,
    action: "approve" | "reject",
  ) {
    if (action === "reject" && !window.confirm("Odrzucić to zgłoszenie? Zadanie zostanie trwale niezaliczone, bez możliwości ponownej próby.")) {
      return;
    }

    setActionError(null);
    setPendingAction({ teamId, stationId, action });
    try {
      const basePayload = { realizationId: selectedRealizationId, teamId, stationId };
      if (isRiskQuizRealization) {
        const realizationId = riskRealizationId ?? selectedRealizationId;
        if (!realizationId) {
          throw new Error("Brak realizacji");
        }
        const riskPayload = { realizationId, teamId, stationId };
        if (action === "approve") {
          await completeRiskCard(riskPayload).unwrap();
        } else {
          await failRiskCard(riskPayload).unwrap();
        }
      } else if (action === "approve") {
        await completeTask(basePayload).unwrap();
      } else {
        await failTask({ ...basePayload, reason: "photo_rejected_by_admin" }).unwrap();
      }
    } catch (error) {
      // Show what actually failed: the blanket message hid a missing
      // realization id here for a whole test round.
      setActionError(
        resolveApiErrorMessage(error) ?? "Nie udało się zapisać decyzji dotyczącej zgłoszenia.",
      );
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
          Zgłoszenia czekające na akceptację ({reviews.length})
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
              {review.kind === "text" ? (
                <div className="space-y-2 rounded-md border border-zinc-700 bg-zinc-900/60 p-2">
                  {review.question ? (
                    <p className="text-xs font-medium text-amber-200/90">{review.question}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words text-xs text-zinc-100">
                    {review.answerText}
                  </p>
                  {review.answerKeys.length > 0 ? (
                    <div className="border-t border-zinc-800 pt-2">
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        Klucz odpowiedzi
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 text-[11px] text-zinc-400">
                        {review.answerKeys.map((key) => (
                          <li key={key}>{key}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={review.photoUrl}
                  alt={review.stationName}
                  className="h-32 w-full rounded-md border border-zinc-700 object-cover"
                />
              )}
              <p className="text-xs font-medium text-zinc-100">{review.stationName}</p>
              {review.kind === "photo" && review.stationDescription ? (
                <p className="text-xs italic text-amber-200/80">{review.stationDescription}</p>
              ) : null}
              <p className="text-xs text-zinc-400">{review.teamName}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => void handleAction(review.teamId, review.stationId, "approve")}
                  aria-label="Zatwierdź zgłoszenie"
                  className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isPendingForRow && pendingAction?.action === "approve" ? "..." : "✓"}
                </button>
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => void handleAction(review.teamId, review.stationId, "reject")}
                  aria-label="Odrzuć zgłoszenie"
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
