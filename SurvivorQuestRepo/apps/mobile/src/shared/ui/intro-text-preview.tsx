import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { AutoScrollingBox } from "./auto-scrolling-box";
import { EXPEDITION_THEME } from "../../features/onboarding/model/constants";
import { useAdaptiveLayout } from "../layout/use-adaptive-layout";

export type RulesBlock = {
  kind: "paragraph" | "unordered" | "ordered";
  text: string;
  order?: number;
};

export type InlineRulesPart = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export function parseRulesBlocks(rawText: string): RulesBlock[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  return lines.map((line) => {
    const unorderedMatch = /^[-*]\s+(.*)$/.exec(line);
    if (unorderedMatch) {
      return { kind: "unordered", text: unorderedMatch[1].trim() };
    }

    const orderedMatch = /^(\d+)\.\s+(.*)$/.exec(line);
    if (orderedMatch) {
      return {
        kind: "ordered",
        order: Number(orderedMatch[1]),
        text: orderedMatch[2].trim(),
      };
    }

    return { kind: "paragraph", text: line.trim() };
  });
}

export function parseInlineRules(text: string): InlineRulesPart[] {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
  const parts: InlineRulesPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index) });
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith("__") && token.endsWith("__")) {
      parts.push({ text: token.slice(2, -2), underline: true });
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push({ text: token.slice(1, -1), italic: true });
    } else {
      parts.push({ text: token });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts;
}

/**
 * Station descriptions: **bold**, *italic* and __underline__ inside one text
 * run. Line breaks stay as typed — no list or paragraph parsing here, the
 * description keeps the caller's own font size, colour and alignment.
 */
export function FormattedText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const parts = parseInlineRules(text);

  return (
    <Text style={style}>
      {parts.map((part, partIndex) =>
        part.bold || part.italic || part.underline ? (
          <Text
            key={partIndex}
            style={{
              fontWeight: part.bold ? "700" : undefined,
              fontStyle: part.italic ? "italic" : undefined,
              textDecorationLine: part.underline ? "underline" : undefined,
            }}
          >
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}

type IntroTextPreviewProps = {
  text: string;
  fallbackText: string;
};

export function IntroTextPreview({ text, fallbackText }: IntroTextPreviewProps) {
  const blocks = parseRulesBlocks(text);
  const adaptiveLayout = useAdaptiveLayout();
  const isTablet = adaptiveLayout.isTablet;
  const introFontSize = adaptiveLayout.fs(isTablet ? 16 : 12, 11, 20);
  const introLineHeight = adaptiveLayout.s(isTablet ? 28 : 20, 18, 34);

  if (blocks.length === 0) {
    return (
      <Text className="mt-3" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: introFontSize, lineHeight: introLineHeight }}>
        {fallbackText}
      </Text>
    );
  }

  return (
    <View className="mt-3">
      {blocks.map((block, blockIndex) => {
        const parts = parseInlineRules(block.text);
        const prefix = block.kind === "unordered" ? "• " : block.kind === "ordered" ? `${block.order ?? 1}. ` : "";

        return (
          <Text
            key={`intro-${block.kind}-${blockIndex}`}
            className="mb-1"
            style={{ color: EXPEDITION_THEME.textPrimary, fontSize: introFontSize, lineHeight: introLineHeight }}
          >
            {prefix ? (
              <Text className="font-semibold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                {prefix}
              </Text>
            ) : null}
            {parts.map((part, partIndex) => (
              <Text
                key={`intro-${blockIndex}-${partIndex}`}
                style={{
                  fontWeight: part.bold ? "700" : "400",
                  fontStyle: part.italic ? "italic" : "normal",
                  textDecorationLine: part.underline ? "underline" : "none",
                }}
              >
                {part.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </View>
  );
}

export function AutoScrollingIntroBox({
  text,
  fallbackText,
  // Drops the card the text normally sits in — no border, no fill, no rounding —
  // so it reads as bare text on the screen's own background. Used by the
  // Ryzykanci waiting screen, which is built around the logo instead of panels.
  chromeless = false,
  style,
}: IntroTextPreviewProps & { chromeless?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <AutoScrollingBox
      className={chromeless ? "mt-2" : "mt-2 rounded-2xl border"}
      contentContainerStyle={{ padding: chromeless ? 0 : 12 }}
      style={[
        chromeless
          ? null
          : { borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted },
        style,
      ]}
    >
      <IntroTextPreview text={text} fallbackText={fallbackText} />
    </AutoScrollingBox>
  );
}
