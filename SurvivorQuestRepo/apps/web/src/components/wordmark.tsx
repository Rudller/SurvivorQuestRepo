type WordmarkProps = {
  className?: string;
};

/**
 * The name set as the brand lockup: "Survivor" in Ivory, "Quest" in Amber.
 *
 * Only for places where the name stands on its own — the header lockup, a
 * section eyebrow, a footer heading. Inside a sentence it stays plain text: a
 * colour change mid-prose reads as emphasis on one word, not as a brand mark.
 *
 * Casing, tracking and the two colours belong to the mark and live here, so no
 * call site can render it lowercase or tightly set by forgetting a class. Size
 * and weight stay with the caller, which is why the same lockup drops into an
 * 11px label and a 16px footer heading alike.
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span className={`uppercase tracking-[0.18em] ${className ?? ""}`}>
      <span className="text-ivory">Survivor</span>
      <span className="text-amber">Quest</span>
    </span>
  );
}
