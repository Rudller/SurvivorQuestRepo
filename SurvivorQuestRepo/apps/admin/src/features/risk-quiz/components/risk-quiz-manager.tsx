"use client";

import Link from "next/link";

type RiskQuizManagerProps = {
  realizationId: string;
  realizationName: string;
};

export function RiskQuizManager({ realizationId }: RiskQuizManagerProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
      <p className="text-sm text-amber-100">
        Ekran-prompter (na projektor) pokazuje na żywo sumę punktów lub tabelę
        drużyn.
      </p>
      <Link
        href={`/risk-quiz/${realizationId}/prompter`}
        target="_blank"
        className="shrink-0 rounded-lg border border-amber-400/60 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-400/20"
      >
        Otwórz prompter
      </Link>
    </div>
  );
}
