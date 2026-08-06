"use client";

import { useState } from "react";
import { MOBILE_THEME } from "../mobile-preview-theme";
import type { StationPreviewProps } from "../types";
import { toPuzzleView } from "../types";
import { resolveMemoryDeck } from "../puzzle-helpers";

// Mirrors apps/mobile/.../station-panels/memory-station-panel.tsx
export function MemoryPreview(props: StationPreviewProps) {
  const deck = resolveMemoryDeck(toPuzzleView(props));
  const [revealed, setRevealed] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());

  const totalPairs = deck.length / 2;
  const matchedPairs = matched.size / 2;

  function pressCard(id: string, symbol: string) {
    if (matched.has(id) || revealed.includes(id)) {
      return;
    }
    if (revealed.length === 2) {
      setRevealed([id]);
      return;
    }
    const next = [...revealed, id];
    setRevealed(next);
    if (next.length === 2) {
      const [firstId] = next;
      const firstSymbol = deck.find((card) => card.id === firstId)?.symbol;
      if (firstSymbol === symbol) {
        setMatched((prev) => new Set(prev).add(firstId).add(id));
        setTimeout(() => setRevealed([]), 400);
      } else {
        setTimeout(() => setRevealed([]), 700);
      }
    }
  }

  return (
    <div className="mt-1">
      <p className="text-center" style={{ color: MOBILE_THEME.textMuted, fontSize: 10 }}>
        Pary: {matchedPairs}/{totalPairs}
      </p>
      <div className="mt-2 grid grid-cols-6 gap-1.5">
        {deck.map((card) => {
          const isMatched = matched.has(card.id);
          const isRevealed = isMatched || revealed.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => pressCard(card.id, card.symbol)}
              className="flex aspect-square items-center justify-center rounded-lg border text-lg transition active:opacity-90"
              style={{
                borderColor: isMatched ? "rgba(52,211,153,0.8)" : MOBILE_THEME.border,
                backgroundColor: isMatched ? "rgba(34,197,94,0.2)" : isRevealed ? "rgba(59,130,246,0.2)" : MOBILE_THEME.panelStrong,
              }}
            >
              {isRevealed ? card.symbol : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
