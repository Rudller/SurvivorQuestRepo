"use client";

import { useRef } from "react";

type StyledMarkdownEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  helperText?: string;
};

function applyWrap(
  textarea: HTMLTextAreaElement,
  value: string,
  before: string,
  after: string,
  onChange: (value: string) => void,
) {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;
  const selected = value.slice(start, end);
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  onChange(next);

  requestAnimationFrame(() => {
    textarea.focus();
    if (selected.length > 0) {
      textarea.setSelectionRange(start + before.length, end + before.length);
      return;
    }
    textarea.setSelectionRange(start + before.length, start + before.length);
  });
}

function applyList(
  textarea: HTMLTextAreaElement,
  value: string,
  mode: "bullet" | "number",
  onChange: (value: string) => void,
) {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;

  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEnd = (() => {
    const found = value.indexOf("\n", end);
    return found === -1 ? value.length : found;
  })();

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const nextLines =
    mode === "bullet"
      ? lines.map((line) => (line.trim().length > 0 ? `- ${line}` : line))
      : lines.map((line, index) => (line.trim().length > 0 ? `${index + 1}. ${line}` : line));

  const replacement = nextLines.join("\n");
  const next = `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`;
  onChange(next);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(lineStart, lineStart + replacement.length);
  });
}

export function StyledMarkdownEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 6,
  helperText,
}: StyledMarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function withTextarea(action: (textarea: HTMLTextAreaElement) => void) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    action(textarea);
  }

  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-zinc-400">{label}</span>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2">
        <button
          type="button"
          onClick={() => withTextarea((textarea) => applyWrap(textarea, value, "**", "**", onChange))}
          className="rounded border border-zinc-600 px-2 py-1 text-xs font-semibold text-zinc-200 hover:border-zinc-400"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => withTextarea((textarea) => applyWrap(textarea, value, "*", "*", onChange))}
          className="rounded border border-zinc-600 px-2 py-1 text-xs italic text-zinc-200 hover:border-zinc-400"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => withTextarea((textarea) => applyList(textarea, value, "bullet", onChange))}
          className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-400"
        >
          • Lista
        </button>
        <button
          type="button"
          onClick={() => withTextarea((textarea) => applyList(textarea, value, "number", onChange))}
          className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-400"
        >
          1. Lista
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-400/80"
      />
      <p className="text-xs text-zinc-500">
        {helperText ||
          "Obsługa formatowania: **pogrubienie**, *kursywa*, - lista wypunktowana, 1. lista numerowana."}
      </p>
    </label>
  );
}
