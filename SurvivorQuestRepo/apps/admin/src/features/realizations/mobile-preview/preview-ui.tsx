import type { ReactNode } from "react";
import { MOBILE_THEME } from "./mobile-preview-theme";
import { PREVIEW_LAYOUT } from "./layout-tokens";

// Mirrors resolveActionLabelColor from apps/mobile/.../shared-ui.tsx: the
// accent-filled button's label is the inverse of the app background, giving
// dark text on the gold accent button.
export function resolvePreviewActionLabelColor(isDisabled: boolean) {
  return isDisabled ? MOBILE_THEME.textMuted : MOBILE_THEME.background;
}

// Mirrors StationQuizTaskWrapper from shared-ui.tsx.
export function PreviewTaskWrapper({
  prompt,
  hidePrompt,
  children,
  footer,
}: {
  prompt?: string;
  hidePrompt?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div>
      <div
        className="rounded-2xl border"
        style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted }}
      >
        {prompt && !hidePrompt ? (
          <p className="px-3 pt-3 font-semibold" style={{ color: MOBILE_THEME.textPrimary, fontSize: PREVIEW_LAYOUT.promptFontSize, lineHeight: 1.35 }}>
            {prompt}
          </p>
        ) : null}
        <div className="px-3 pb-3 pt-3">{children}</div>
      </div>
      {footer}
    </div>
  );
}

// Mirrors AttemptsIndicator from shared-ui.tsx.
export function PreviewAttemptsIndicator({
  label,
  attemptsLeft,
  maxAttempts,
  align = "start",
}: {
  label: string;
  attemptsLeft: number;
  maxAttempts: number;
  align?: "start" | "center";
}) {
  const safeMax = Math.max(1, maxAttempts);
  const safeLeft = Math.max(0, Math.min(safeMax, attemptsLeft));
  return (
    <div className={`flex items-center gap-2 ${align === "center" ? "justify-center" : "justify-between"}`}>
      <span style={{ color: MOBILE_THEME.textMuted, fontSize: PREVIEW_LAYOUT.infoFontSize }}>
        {label}: {safeLeft}
      </span>
      <div className="flex items-center" style={{ gap: PREVIEW_LAYOUT.attemptDotGap }}>
        {Array.from({ length: safeMax }).map((_, index) => (
          <span
            key={index}
            className="rounded-full border"
            style={{
              width: PREVIEW_LAYOUT.attemptDotSize,
              height: PREVIEW_LAYOUT.attemptDotSize,
              borderColor: index < safeLeft ? MOBILE_THEME.accentStrong : MOBILE_THEME.border,
              backgroundColor: index < safeLeft ? MOBILE_THEME.accentStrong : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function PreviewActionButton({
  label,
  disabled,
  onClick,
  fullWidth,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`items-center justify-center rounded-xl px-5 font-semibold transition ${fullWidth ? "w-full" : ""}`}
      style={{
        backgroundColor: disabled ? MOBILE_THEME.panelStrong : MOBILE_THEME.accent,
        color: resolvePreviewActionLabelColor(Boolean(disabled)),
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: PREVIEW_LAYOUT.actionFontSize,
        minHeight: PREVIEW_LAYOUT.actionMinHeight,
      }}
    >
      {label}
    </button>
  );
}

export function PreviewKey({
  label,
  sublabel,
  disabled,
  selected,
  onClick,
  variant = "default",
  rounded = "rounded-xl",
  size,
}: {
  label: string;
  sublabel?: string;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
  variant?: "default" | "accent";
  rounded?: string;
  size?: number;
}) {
  const isAccent = variant === "accent";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center justify-center border ${rounded} font-semibold transition active:opacity-85`}
      style={{
        width: size,
        height: size,
        borderColor: isAccent ? MOBILE_THEME.accent : selected ? MOBILE_THEME.accentStrong : MOBILE_THEME.border,
        backgroundColor: isAccent ? MOBILE_THEME.accent : MOBILE_THEME.panelStrong,
        color: isAccent ? resolvePreviewActionLabelColor(Boolean(disabled)) : MOBILE_THEME.textPrimary,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: PREVIEW_LAYOUT.keyLabelFontSize,
      }}
    >
      <span>{label}</span>
      {sublabel ? (
        <span className="mt-[-2px] tracking-[1.6px]" style={{ color: MOBILE_THEME.textSubtle, fontSize: 8 }}>
          {sublabel}
        </span>
      ) : null}
    </button>
  );
}
