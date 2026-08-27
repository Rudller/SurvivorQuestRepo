import { type ReactNode, useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../features/onboarding/model/constants";
import type { UiLanguage } from "../../features/i18n";

export const HIDDEN_RESET_HOLD_MS = 5000;

// Which way out the confirm popup actually offers, so the body text doesn't
// promise something the caller's onReset() won't do:
// "rejoin" — the local session is dropped and the same code is submitted again
//   at the same server (mobile-app's waiting screen).
// "exit"  — the local session is dropped and the app lands on the start screen
//   with nothing pre-filled, which is the only usable escape when the stored
//   server address is unreachable (Ryzykanci intro screen).
export type HiddenResetVariant = "rejoin" | "exit";

const TEXT: Record<
  UiLanguage,
  {
    title: string;
    bodyRejoin: string;
    bodyExit: string;
    confirmAction: string;
    cancelAction: string;
  }
> = {
  polish: {
    title: "Wrócić do startu?",
    bodyRejoin: "Zresetuje to lokalną sesję i spróbuje ponownie dołączyć tym samym kodem.",
    bodyExit: "Zresetuje to lokalną sesję i wróci na ekran startowy, gdzie możesz wybrać serwer i kod od nowa.",
    confirmAction: "Wróć do startu",
    cancelAction: "Anuluj",
  },
  english: {
    title: "Back to start?",
    bodyRejoin: "This resets the local session and tries to rejoin with the same code.",
    bodyExit: "This resets the local session and returns to the start screen, where you can pick the server and code again.",
    confirmAction: "Back to start",
    cancelAction: "Cancel",
  },
  ukrainian: {
    title: "Повернутися до старту?",
    bodyRejoin: "Це скине локальну сесію і спробує знову приєднатися тим самим кодом.",
    bodyExit: "Це скине локальну сесію і поверне на початковий екран, де можна знову вибрати сервер і код.",
    confirmAction: "Повернутися до старту",
    cancelAction: "Скасувати",
  },
  russian: {
    title: "Вернуться к старту?",
    bodyRejoin: "Это сбросит локальную сессию и попробует снова присоединиться тем же кодом.",
    bodyExit: "Это сбросит локальную сессию и вернёт на стартовый экран, где можно снова выбрать сервер и код.",
    confirmAction: "Вернуться к старту",
    cancelAction: "Отмена",
  },
};

/**
 * Escape hatch for screens a team can get stranded on: hold the wrapped
 * content for HIDDEN_RESET_HOLD_MS, confirm, and the caller drops the local
 * session. Deliberately invisible — it sits on ordinary screen furniture (the
 * "waiting for start" row) so players don't find it by accident, only someone
 * who was told about it.
 */
export function HiddenResetOnHold({
  language,
  variant = "rejoin",
  onReset,
  children,
}: {
  language: UiLanguage;
  variant?: HiddenResetVariant;
  onReset: () => void;
  children: ReactNode;
}) {
  const text = TEXT[language] ?? TEXT.polish;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => clearHoldTimer, []);

  return (
    <>
      <Pressable
        onPressIn={() => {
          clearHoldTimer();
          holdTimerRef.current = setTimeout(() => setIsOverlayOpen(true), HIDDEN_RESET_HOLD_MS);
        }}
        onPressOut={clearHoldTimer}
      >
        {children}
      </Pressable>

      <Modal
        visible={isOverlayOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOverlayOpen(false)}
      >
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: `rgba(${EXPEDITION_THEME.scrimAbyssRgb}, 0.72)` }}
        >
          <View
            className="w-full rounded-3xl border p-5"
            style={{ maxWidth: 420, borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panel }}
          >
            <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.title}
            </Text>
            <Text className="mt-2 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
              {variant === "exit" ? text.bodyExit : text.bodyRejoin}
            </Text>
            <Pressable
              className="mt-4 rounded-2xl border px-4 py-3 active:opacity-85"
              style={{ borderColor: "rgba(248, 113, 113, 0.55)", backgroundColor: "rgba(127, 29, 29, 0.3)" }}
              onPress={() => {
                setIsOverlayOpen(false);
                onReset();
              }}
            >
              <Text className="text-center font-semibold" style={{ color: "#fca5a5" }}>
                {text.confirmAction}
              </Text>
            </Pressable>
            <Pressable
              className="mt-2 rounded-2xl border px-4 py-3 active:opacity-85"
              style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
              onPress={() => setIsOverlayOpen(false)}
            >
              <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                {text.cancelAction}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
