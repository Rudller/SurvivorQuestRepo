import { Pressable, Text, View } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../i18n";
import { EXPEDITION_THEME } from "../../../onboarding/model/constants";
import { parseIntroBlocks, parseIntroInline } from "./puzzle-helpers";
import type { WelcomePreviewOverlayProps } from "./types";

const WELCOME_PREVIEW_TEXT: Record<
  UiLanguage,
  {
    introLabel: string;
    emptyIntro: string;
    close: string;
  }
> = {
  polish: {
    introLabel: "Tekst wstępu",
    emptyIntro: "Brak tekstu wstępu dla tej realizacji.",
    close: "Zamknij",
  },
  english: {
    introLabel: "Intro text",
    emptyIntro: "No intro text for this realization.",
    close: "Close",
  },
  ukrainian: {
    introLabel: "Вступний текст",
    emptyIntro: "Для цієї реалізації немає вступного тексту.",
    close: "Закрити",
  },
  russian: {
    introLabel: "Вступительный текст",
    emptyIntro: "Для этой реализации нет вступительного текста.",
    close: "Закрыть",
  },
};

export function WelcomePreviewOverlay({ visible, introText, onClose }: WelcomePreviewOverlayProps) {
  const uiLanguage = useUiLanguage();
  const text = WELCOME_PREVIEW_TEXT[uiLanguage];

  if (!visible) {
    return null;
  }
  const blocks = parseIntroBlocks(introText?.trim() || "");

  return (
    <View className="absolute inset-0 z-50 items-center justify-center px-4" style={{ backgroundColor: "rgba(15, 25, 20, 0.78)" }}>
      <View
        className="w-full max-w-[560px] rounded-3xl border p-5"
        style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
      >
        <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.accentStrong }}>
          {text.introLabel}
        </Text>
        {blocks.length === 0 ? (
          <Text className="mt-3 text-sm leading-6" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {text.emptyIntro}
          </Text>
        ) : (
          <View className="mt-3">
            {blocks.map((block, blockIndex) => {
              const parts = parseIntroInline(block.text);
              const prefix = block.kind === "unordered" ? "• " : block.kind === "ordered" ? `${block.order ?? 1}. ` : "";

              return (
                <Text
                  key={`intro-${block.kind}-${blockIndex}`}
                  className="mb-1 text-sm leading-6"
                  style={{ color: EXPEDITION_THEME.textPrimary }}
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
                      }}
                    >
                      {part.text}
                    </Text>
                  ))}
                </Text>
              );
            })}
          </View>
        )}

        <Pressable
          className="mt-4 rounded-xl border px-3 py-2 active:opacity-90"
          style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
          onPress={onClose}
        >
          <Text className="text-center text-xs font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {text.close}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
