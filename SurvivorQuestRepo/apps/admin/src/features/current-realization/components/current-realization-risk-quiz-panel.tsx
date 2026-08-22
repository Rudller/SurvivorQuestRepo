"use client";

import { RiskQuizManager } from "@/features/risk-quiz/components/risk-quiz-manager";

type CurrentRealizationRiskQuizPanelProps = {
  realizationId: string;
  realizationName: string;
};

export function CurrentRealizationRiskQuizPanel({
  realizationId,
  realizationName,
}: CurrentRealizationRiskQuizPanelProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-100">Ryzykanci</h2>
      <RiskQuizManager
        realizationId={realizationId}
        realizationName={realizationName}
      />
    </div>
  );
}
