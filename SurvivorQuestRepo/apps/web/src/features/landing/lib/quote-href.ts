/**
 * Builds the "ask for a quote" link for one place on the page.
 *
 * The base comes from `NEXT_PUBLIC_QUOTE_URL` or falls back to a plain
 * `mailto:`. Only a mailto gets a subject appended — a form URL from the env
 * is used as-is, because we cannot know what query parameters it accepts.
 */
export function withQuoteSubject(base: string, subject: string) {
  if (!base.startsWith("mailto:")) {
    return base;
  }

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}subject=${encodeURIComponent(subject)}`;
}
