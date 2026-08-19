"use client";

import Link from "next/link";
import { RiskCardsQrPanel } from "./risk-cards-qr-panel";

type RiskQuizManagerProps = {
  realizationId: string;
  realizationName: string;
};

export function RiskQuizManager({ realizationId, realizationName }: RiskQuizManagerProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="text-sm text-amber-100">
          Ekran-prompter (na projektor) pokazuje na żywo sumę punktów lub tabelę drużyn.
        </p>
        <Link
          href={`/risk-quiz/${realizationId}/prompter`}
          target="_blank"
          className="shrink-0 rounded-lg border border-amber-400/60 px-3 py-1.5 text-xs font-medium text-amber-200 transition hover:bg-amber-400/20"
        >
          Otwórz prompter
        </Link>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-200">Karty QR do wydruku</h3>
        <RiskCardsQrPanel realizationId={realizationId} realizationName={realizationName} />
      </section>
    </div>
  );
}
