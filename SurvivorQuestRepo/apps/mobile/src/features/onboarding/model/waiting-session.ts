import type { OnboardingSession } from "./types";

// The waiting screen renders the intro text captured when the device joined,
// but an instructor often keeps editing that text while teams are already
// holding on the tablet — and every start poll carries the live copy of it
// (see the state payload in apps/backend/src/modules/mobile/mobile.service.ts).
//
// Returns null when there is nothing to apply. That matters: the caller writes
// the session into state, which restarts the polling effect, so answering with
// a fresh object on every unchanged poll would turn the 3s cycle into a spin.
export function applyLiveIntroText(
  session: OnboardingSession,
  liveIntroText: string | undefined,
): OnboardingSession | null {
  // Undefined means the poll simply didn't carry the field — not that the
  // admin cleared it. An empty string does mean cleared, and is applied.
  if (typeof liveIntroText !== "string") return null;
  if (!session.realization) return null;
  if ((session.realization.introText ?? "") === liveIntroText) return null;

  return {
    ...session,
    realization: { ...session.realization, introText: liveIntroText },
  };
}
