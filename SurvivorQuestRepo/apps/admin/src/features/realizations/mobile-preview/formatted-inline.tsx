import { parseIntroInline } from "./puzzle-helpers";

// Mirrors apps/mobile/src/shared/ui/intro-text-preview.tsx's FormattedText:
// **bold**, *italic* and __underline__ inside a station description.
export function FormattedInline({ text }: { text: string }) {
  return (
    <>
      {parseIntroInline(text).map((part, index) => {
        let node: React.ReactNode = part.text;
        if (part.underline) node = <u>{node}</u>;
        if (part.italic) node = <em>{node}</em>;
        if (part.bold) node = <strong>{node}</strong>;
        return <span key={index}>{node}</span>;
      })}
    </>
  );
}
