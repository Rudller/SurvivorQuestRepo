"use client";

import { useState } from "react";
import {
  useGetRiskChatQuery,
  useSendRiskChatMessageMutation,
  type RiskChatMessage,
} from "@/features/risk-quiz/api/risk-quiz.api";
import { resolveApiErrorMessage } from "@/shared/lib/api-error";
import { resolveTeamColorHex } from "@/shared/lib/team-colors";

// Matches RISK_CHAT_MESSAGE_MAX_LENGTH on the backend.
const MAX_LENGTH = 500;

type CurrentRealizationRiskChatPanelProps = {
  realizationId: string;
};

function formatTime(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

export function CurrentRealizationRiskChatPanel({
  realizationId,
}: CurrentRealizationRiskChatPanelProps) {
  // Same cadence as the photo review queue next door — the room is a shared
  // poll, not a live socket, so there is nothing faster to be had here.
  const { data: chat } = useGetRiskChatQuery(
    { realizationId },
    { pollingInterval: 5_000, refetchOnFocus: true, refetchOnReconnect: true },
  );
  const [sendMessage, { isLoading: isSending }] = useSendRiskChatMessageMutation();
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSend() {
    const content = draft.trim();
    if (!content || isSending) {
      return;
    }

    setSendError(null);
    try {
      await sendMessage({ realizationId, content }).unwrap();
      setDraft("");
    } catch (error) {
      setSendError(
        resolveApiErrorMessage(error) ?? "Nie udało się wysłać wiadomości.",
      );
    }
  }

  if (chat && !chat.enabled) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h2 className="mb-2 text-sm font-semibold text-zinc-100">Czat</h2>
        <p className="text-xs text-zinc-500">
          Czat jest wyłączony dla tej realizacji. Włączysz go w ustawieniach realizacji.
        </p>
      </div>
    );
  }

  const messages = chat?.messages ?? [];

  return (
    <div className="flex h-96 flex-col rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">Czat</h2>
        {chat && !chat.canPost ? (
          <span className="text-[11px] text-zinc-500">
            Drużyny mogą tylko czytać
          </span>
        ) : null}
      </div>

      <div className="mb-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-zinc-500">Jeszcze nikt nic nie napisał.</p>
        ) : null}
        {messages.map((message) => (
          <ChatRow key={message.id} message={message} />
        ))}
      </div>

      {sendError ? (
        <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">
          {sendError}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          value={draft}
          maxLength={MAX_LENGTH}
          onChange={(event) => {
            setDraft(event.target.value);
            setSendError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void handleSend();
            }
          }}
          placeholder="Ogłoszenie do wszystkich drużyn"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={isSending || !draft.trim()}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSending ? "Wysyłanie..." : "Wyślij"}
        </button>
      </div>
    </div>
  );
}

function ChatRow({ message }: { message: RiskChatMessage }) {
  // System lines are the room narrating itself — centred and muted so they never
  // read as something a person said.
  if (message.authorKind === "SYSTEM") {
    return (
      <p className="text-center text-[11px] italic text-zinc-500">{message.content}</p>
    );
  }

  const isGameMaster = message.authorKind === "GAME_MASTER";

  return (
    <div className="text-xs">
      <span
        className={isGameMaster ? "font-semibold text-amber-300" : "font-semibold"}
        // teamColor is a palette key ("amber"), never a CSS colour — the same
        // lookup the teams map uses turns it into the hex the tablet paints the
        // team banner with.
        style={isGameMaster ? undefined : { color: resolveTeamColorHex(message.teamColor, "#a1a1aa") }}
      >
        {message.authorName}
      </span>
      <span className="ml-2 text-[10px] text-zinc-600">{formatTime(message.createdAt)}</span>
      <p className="whitespace-pre-wrap break-words text-zinc-100">{message.content}</p>
    </div>
  );
}
