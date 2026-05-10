import { createContext, useContext, type PropsWithChildren } from "react";
import type { OnboardingSession } from "../../onboarding/model/types";
import type { ExpeditionSessionEndReason, ExpeditionSessionState } from "../model/types";
import type { StationTestViewModel } from "../components/station-overlays";
import type { ExpeditionStageOverlayFlow } from "./hooks/use-expedition-stage-overlay-flow";
import type { ExpeditionStageQrFlow } from "./hooks/use-expedition-stage-qr-flow";

export type ExpeditionStageSessionContextValue = {
  session: OnboardingSession;
  sessionState: ExpeditionSessionState;
  isSessionEnded: boolean;
  sessionEndReason: ExpeditionSessionEndReason | null;
  sessionEndedAt: string | null;
};

export type ExpeditionStageOverlayContextValue = {
  stationTestEntries: StationTestViewModel[];
  overlayFlow: ExpeditionStageOverlayFlow;
  qrFlow: ExpeditionStageQrFlow;
};

const ExpeditionStageSessionContext = createContext<ExpeditionStageSessionContextValue | null>(null);
const ExpeditionStageOverlayContext = createContext<ExpeditionStageOverlayContextValue | null>(null);

type ExpeditionStageSessionProviderProps = PropsWithChildren<{
  value: ExpeditionStageSessionContextValue;
}>;

type ExpeditionStageOverlayProviderProps = PropsWithChildren<{
  value: ExpeditionStageOverlayContextValue;
}>;

export function ExpeditionStageSessionProvider({ value, children }: ExpeditionStageSessionProviderProps) {
  return <ExpeditionStageSessionContext.Provider value={value}>{children}</ExpeditionStageSessionContext.Provider>;
}

export function ExpeditionStageOverlayProvider({ value, children }: ExpeditionStageOverlayProviderProps) {
  return <ExpeditionStageOverlayContext.Provider value={value}>{children}</ExpeditionStageOverlayContext.Provider>;
}

export function useExpeditionStageSessionContext() {
  const context = useContext(ExpeditionStageSessionContext);
  if (!context) {
    throw new Error("useExpeditionStageSessionContext must be used within ExpeditionStageSessionProvider.");
  }

  return context;
}

export function useExpeditionStageOverlayContext() {
  const context = useContext(ExpeditionStageOverlayContext);
  if (!context) {
    throw new Error("useExpeditionStageOverlayContext must be used within ExpeditionStageOverlayProvider.");
  }

  return context;
}
