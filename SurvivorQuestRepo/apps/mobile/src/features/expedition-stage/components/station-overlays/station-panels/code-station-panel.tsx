import { useMemo, useState } from "react";
import { Animated, Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { NUMERIC_PINPAD_LAYOUT, NUMERIC_PINPAD_SUBLABELS, isInvalidCompletionCodeErrorMessage } from "../puzzle-helpers";
import type { StationTestType, StationTestViewModel } from "../types";
import { resolveActionLabelColor, useStationPanelLayout, withAlpha } from "./shared-ui";

type CodeStationText = {
  timedPlaceholder: string;
  pointsPlaceholder: string;
  submitting: string;
  submitCode: string;
};

const CODE_STATION_TEXT_ENGLISH: CodeStationText = {
  timedPlaceholder: "e.g. TIME-2048",
  pointsPlaceholder: "e.g. POINTS-2048",
  submitting: "Submitting...",
  submitCode: "Submit code",
};

const CODE_STATION_TEXT: Record<UiLanguage, CodeStationText> = {
  polish: {
    timedPlaceholder: "np. TIME-2048",
    pointsPlaceholder: "np. POINTS-2048",
    submitting: "Zatwierdzanie...",
    submitCode: "Zatwierdź kod",
  },
  english: CODE_STATION_TEXT_ENGLISH,
  ukrainian: {
    timedPlaceholder: "напр. TIME-2048",
    pointsPlaceholder: "напр. POINTS-2048",
    submitting: "Надсилання...",
    submitCode: "Підтвердити код",
  },
  russian: {
    timedPlaceholder: "напр. TIME-2048",
    pointsPlaceholder: "напр. POINTS-2048",
    submitting: "Отправка...",
    submitCode: "Подтвердить код",
  },
};

function getCodePlaceholder(stationType: StationTestType, text: CodeStationText) {
  return stationType === "time" ? text.timedPlaceholder : text.pointsPlaceholder;
}

const ALPHANUMERIC_CODE_KEYBOARD_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "-"],
] as const;
type CodeKeyboardKeySizeInput = {
  containerWidth: number;
  containerHeight: number;
  columnCount: number;
  rowCount: number;
  keyGap: number;
  rowGap: number;
  preferredKeySize: number;
  minKeySize: number;
};

/**
 * Fits the alphanumeric keyboard to the box it was measured in — both axes,
 * same treatment as resolveWordleMediaCellSize. Width alone isn't enough: in
 * Ryzykanci the card shares the screen with the host's top panel, timer and
 * bottom panel, so a keyboard sized only to fit horizontally still runs past
 * the bottom edge and gets clipped there.
 */
export function resolveCodeKeyboardKeySize({
  containerWidth,
  containerHeight,
  columnCount,
  rowCount,
  keyGap,
  rowGap,
  preferredKeySize,
  minKeySize,
}: CodeKeyboardKeySizeInput) {
  // Not measured yet — render at the preferred size and let the first layout
  // pass correct it, rather than flashing a minimum-size keyboard.
  if (containerWidth <= 0) {
    return preferredKeySize;
  }

  const columns = Math.max(1, columnCount);
  const rows = Math.max(1, rowCount);
  const fitByWidth = Math.floor((containerWidth - keyGap * (columns - 1)) / columns);
  const fitByHeight = containerHeight > 0 ? Math.floor((containerHeight - rowGap * (rows - 1)) / rows) : Number.POSITIVE_INFINITY;

  return Math.max(minKeySize, Math.min(preferredKeySize, fitByWidth, fitByHeight));
}

type CodeKeyboardKeyHeightInput = {
  keySize: number;
  containerHeight: number;
  rowCount: number;
  rowGap: number;
  maxHeightRatio: number;
  minKeyHeight: number;
};

/**
 * How tall each key gets once its width is fixed. Keys are square by default,
 * but the widest row caps the width at ~1/11th of the card, which left the
 * keyboard looking tiny next to the code input on a tablet. Spare height in
 * the keyboard's box goes into taller keys instead of empty space.
 */
export function resolveCodeKeyboardKeyHeight({ keySize, containerHeight, rowCount, rowGap, maxHeightRatio, minKeyHeight }: CodeKeyboardKeyHeightInput) {
  if (containerHeight <= 0) {
    return keySize;
  }

  const rows = Math.max(1, rowCount);
  const fitByHeight = Math.floor((containerHeight - rowGap * (rows - 1)) / rows);
  return Math.max(minKeyHeight, Math.min(Math.round(keySize * maxHeightRatio), fitByHeight));
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type CodeStationPanelProps = {
  minimalChrome?: boolean;
  station: StationTestViewModel;
  isNumericCodeStation: boolean;
  isCodeActionDisabled: boolean;
  verificationCode: string;
  isCodeInputInvalid: boolean;
  isCodeInputSuccess: boolean;
  codeResult: string | null;
  isSubmittingCode: boolean;
  codeInputShakeAnimation: Animated.Value;
  onBackspaceVerificationCode: () => void;
  onAppendVerificationCode: (value: string) => void;
  onSubmitVerificationCode: () => void;
  onResetCodeFeedback: () => void;
};

export function CodeStationPanel({
  minimalChrome = false,
  station,
  isNumericCodeStation,
  isCodeActionDisabled,
  verificationCode,
  isCodeInputInvalid,
  isCodeInputSuccess,
  codeResult,
  isSubmittingCode,
  codeInputShakeAnimation,
  onBackspaceVerificationCode,
  onAppendVerificationCode,
  onSubmitVerificationCode,
  onResetCodeFeedback,
}: CodeStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = CODE_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const adaptiveLayout = useAdaptiveLayout();
  // Reserve empty space below the keyboard so it never renders under the
  // absolutely-positioned timer/points footer (preview.tsx) — that footer
  // floats over the card and doesn't push this panel's layout on its own.
  const footerClearance = minimalChrome ? 0 : adaptiveLayout.s(layout.isTablet ? 100 : 72, 60, 132);
  const successColor = "#34d399";
  const successSurfaceColor = withAlpha(successColor, 0.2);
  const dangerSurfaceColor = withAlpha(EXPEDITION_THEME.danger, 0.16);
  const [keyboardBox, setKeyboardBox] = useState({ width: 0, height: 0 });
  const canAppendAlphanumericCharacter = !isCodeActionDisabled && verificationCode.length < 32;
  const canBackspaceAlphanumericCode = !isCodeActionDisabled && verificationCode.length > 0;
  const useInlineSubmitForNumericPad = station.completionCodeInputMode === "numeric" && (station.stationType === "points" || station.stationType === "time");
  // Ryzykanci embeds the station inline (`minimalChrome`) and has enough room
  // for a full-size pinpad. Keep the compact sizing used by the regular
  // station overlay isolated from that presentation.
  const numericPadScale = minimalChrome ? 1 : 0.8;
  const numericPadMaxWidth = minimalChrome ? 320 : 256;
  // Square keys can only get bigger by getting wider, so inline they run with
  // a tighter gap and a higher preferred-size ceiling, letting the row's width
  // decide their actual size.
  const keyboardGap = minimalChrome ? 2 : layout.isTablet ? 6 : 2;
  const desiredKeySize = minimalChrome ? (layout.isTablet ? 84 : 56) : layout.isTablet ? 62 : 46;
  const minKeySize = layout.isTablet ? 40 : 24;
  const keyboardRows: string[][] = ALPHANUMERIC_CODE_KEYBOARD_ROWS.map((row) => [...row]);
  keyboardRows[0].push("backspace");
  const keyboardColumnCount = Math.max(...keyboardRows.map((row) => row.length));
  const keyboardRowCount = keyboardRows.length;
  const inlineBlockScale = 0.9;
  const inlineKeyboardWidth = Math.max(0, (adaptiveLayout.width - 24) * inlineBlockScale);
  const alphanumericKeyLabelFontSize =
    layout.keyLabelFontSize * (minimalChrome ? 1.15 * inlineBlockScale : 1);
  // Matches the keyboard container's `gap-2` row spacing below.
  const keyboardRowGap = 8;
  // Inline (Ryzykanci) the card is short and the keyboard is the part worth
  // the space, so the code row and its submit button run slimmer there than in
  // the full-screen overlay.
  const inlineCodeRowHeight = minimalChrome
    ? Math.round((layout.isTablet ? 56 : 46) * inlineBlockScale)
    : layout.isTablet
      ? 78
      : 57;
  const submitButtonWidth = minimalChrome
    ? layout.isTablet
      ? // Narrower than the overlay's, but still wide enough to keep the label
        // on one line at the tablet font size.
        148 * inlineBlockScale
      : 104 * inlineBlockScale
    : layout.isTablet
      ? 164
      : 132;

  const alphanumericKeySize = useMemo(
    () =>
      resolveCodeKeyboardKeySize({
        // Ryzykanci uses a stable screen-derived width. It must not rescale
        // after the keyboard measures its own rendered content.
        containerWidth: minimalChrome ? inlineKeyboardWidth : keyboardBox.width,
        // Inline height is content-driven and therefore cannot be fed back
        // into its own scale calculation: doing so caused a visible cascade
        // from large keys to progressively smaller ones after opening.
        containerHeight: minimalChrome ? 0 : keyboardBox.height,
        columnCount: keyboardColumnCount,
        rowCount: keyboardRowCount,
        keyGap: keyboardGap,
        rowGap: keyboardRowGap,
        preferredKeySize: desiredKeySize,
        minKeySize,
      }),
    [
      desiredKeySize,
      keyboardBox.height,
      keyboardBox.width,
      keyboardGap,
      keyboardRowGap,
      keyboardColumnCount,
      keyboardRowCount,
      inlineKeyboardWidth,
      minimalChrome,
      minKeySize,
    ],
  );
  const alphanumericKeyHeight = useMemo(
    () =>
      resolveCodeKeyboardKeyHeight({
        keySize: alphanumericKeySize,
        containerHeight: minimalChrome ? 0 : keyboardBox.height,
        rowCount: keyboardRowCount,
        rowGap: keyboardRowGap,
        // The wide number row still limits key width. Use spare vertical room
        // to make the touch targets visibly larger instead of leaving a small
        // square keyboard at the bottom of the card.
        maxHeightRatio: 1.5,
        minKeyHeight: minKeySize,
      }),
    [alphanumericKeySize, keyboardBox.height, keyboardRowCount, keyboardRowGap, minimalChrome, minKeySize],
  );

  const codeInputShakeStyle = {
    transform: [{ translateX: codeInputShakeAnimation }],
  } as const;

  return (
    <View
      className={`${isNumericCodeStation ? "mt-2" : "mt-3"} ${minimalChrome ? "px-0" : "px-3"} ${isNumericCodeStation ? "py-2" : "py-3"}${minimalChrome ? "" : " rounded-2xl border"}`}
      style={{
        borderColor: minimalChrome ? "transparent" : EXPEDITION_THEME.border,
        backgroundColor: minimalChrome ? "transparent" : EXPEDITION_THEME.panelMuted,
        marginBottom: footerClearance,
        // Inline this is a fixed-height final block. The media/description
        // section above owns flexGrow and absorbs changes in available height.
        ...(minimalChrome ? { paddingBottom: 0, flexGrow: 0, flexShrink: 0 } : {}),
      }}
    >
      {station.completionCodeInputMode === "numeric" ? (
        <View className={isNumericCodeStation ? "mt-1" : "mt-2"}>
          {useInlineSubmitForNumericPad ? (
            <AnimatedTextInput
              style={[
                {
                  marginTop: isNumericCodeStation ? 6 : 8,
                  width: "100%",
                  maxWidth: 320 * 0.8,
                  alignSelf: "center",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isCodeInputSuccess ? successColor : isCodeInputInvalid ? EXPEDITION_THEME.danger : EXPEDITION_THEME.border,
                  backgroundColor: isCodeInputSuccess ? successSurfaceColor : isCodeInputInvalid ? dangerSurfaceColor : EXPEDITION_THEME.panelStrong,
                  color: EXPEDITION_THEME.textPrimary,
                  minHeight: inlineCodeRowHeight * 0.8,
                  paddingHorizontal: 16 * 0.8,
                  paddingVertical: (layout.isTablet ? 12 : 10) * 0.8,
                  textAlign: "center",
                  fontSize: (layout.isTablet ? 34 : 24) * 0.8,
                  fontWeight: "600",
                  letterSpacing: (layout.isTablet ? 6 : 4) * 0.8,
                  fontVariant: ["tabular-nums"],
                },
                codeInputShakeStyle,
              ]}
              value={verificationCode}
              editable={false}
              showSoftInputOnFocus={false}
            />
          ) : (
            <View className="items-center">
              <Animated.View
                className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} w-full max-w-[320px] rounded-2xl border px-4 ${isNumericCodeStation ? "py-2.5" : "py-3"}`}
                style={[
                  codeInputShakeStyle,
                  {
                    borderColor: isCodeInputSuccess ? successColor : isCodeInputInvalid ? EXPEDITION_THEME.danger : EXPEDITION_THEME.border,
                    backgroundColor: isCodeInputSuccess ? successSurfaceColor : isCodeInputInvalid ? dangerSurfaceColor : EXPEDITION_THEME.panelStrong,
                  },
                ]}
              >
                <Text
                  className="text-center text-2xl font-semibold tracking-[0.35em]"
                  style={{
                    color: EXPEDITION_THEME.textPrimary,
                    fontSize: layout.isTablet ? 34 : 24,
                  }}
                  numberOfLines={1}
                >
                  {verificationCode || "• • • •"}
                </Text>
              </Animated.View>
            </View>
          )}

          {useInlineSubmitForNumericPad ? (
            <View className={`mx-auto ${isNumericCodeStation ? "mt-2" : "mt-3"} w-full gap-y-2`} style={{ maxWidth: numericPadMaxWidth }}>
              {[
                ["1", "2", "3"],
                ["4", "5", "6"],
                ["7", "8", "9"],
                ["backspace", "0", "submit"],
              ].map((row, rowIndex) => (
                <View key={`points-numeric-row-${rowIndex}`} className="flex-row justify-between" style={{ columnGap: keyboardGap }}>
                  {row.map((key) => {
                    const isBackspaceKey = key === "backspace";
                    const isSubmitKey = key === "submit";
                    const isDigitKey = /^\d$/.test(key);
                    const isDisabled =
                      isCodeActionDisabled || (isBackspaceKey && verificationCode.length === 0) || (isDigitKey && verificationCode.length >= 32);
                    const label = isBackspaceKey ? "⌫" : isSubmitKey ? "OK" : key;
                    const sublabel = isDigitKey ? NUMERIC_PINPAD_SUBLABELS[label] : "";

                    return (
                      <Pressable
                        key={`${station.stationId}-points-pin-${key}`}
                        className="items-center justify-center rounded-full active:opacity-85"
                        style={{
                          width: "31%",
                          aspectRatio: 1,
                          borderWidth: 1,
                          borderColor: EXPEDITION_THEME.border,
                          backgroundColor: isSubmitKey ? (isDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent) : EXPEDITION_THEME.panelStrong,
                          opacity: isDisabled ? 0.45 : 1,
                        }}
                        disabled={isDisabled}
                        onPress={() => {
                          if (isBackspaceKey) {
                            onBackspaceVerificationCode();
                            onResetCodeFeedback();
                            return;
                          }

                          if (isSubmitKey) {
                            onSubmitVerificationCode();
                            return;
                          }

                          onAppendVerificationCode(key);
                          onResetCodeFeedback();
                        }}
                      >
                        {isDigitKey ? (
                          <View className="h-full w-full items-center justify-center">
                            <Text
                              className="font-semibold text-center"
                              style={{
                                color: EXPEDITION_THEME.textPrimary,
                                textAlign: "center",
                                fontVariant: ["tabular-nums"],
                                fontSize: layout.pinpadDigitFontSize * numericPadScale,
                              }}
                            >
                              {label}
                            </Text>
                            <Text
                              className="mt-[-2px] text-[9px] font-semibold tracking-[1.6px] text-center"
                              style={{
                                color: EXPEDITION_THEME.textSubtle,
                                fontSize: (layout.isTablet ? 11 : 9) * numericPadScale,
                              }}
                            >
                              {sublabel}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            className="font-semibold text-center"
                            style={{
                              color: isSubmitKey ? resolveActionLabelColor(isDisabled) : EXPEDITION_THEME.textPrimary,
                              width: "100%",
                              textAlign: "center",
                              textAlignVertical: "center",
                              fontSize: (isSubmitKey ? layout.actionFontSize : layout.keyLabelFontSize) * numericPadScale,
                            }}
                          >
                            {label}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            <View className={`mx-auto ${isNumericCodeStation ? "mt-2" : "mt-3"} w-full max-w-[320px] flex-row flex-wrap justify-between gap-y-2`}>
              {NUMERIC_PINPAD_LAYOUT.map((key) => {
                const isBackspaceKey = key === "backspace";
                const isSubmitKey = key === "submit";
                const isDisabled = isCodeActionDisabled || (isBackspaceKey && verificationCode.length === 0);
                const label = isBackspaceKey ? "⌫" : isSubmitKey ? "OK" : key;
                const isDigitKey = /^\d$/.test(label);
                const sublabel = isDigitKey ? NUMERIC_PINPAD_SUBLABELS[label] : "";

                return (
                  <Pressable
                    key={`${station.stationId}-pin-${key}`}
                    className="items-center justify-center rounded-full active:opacity-85"
                    style={{
                      width: "31%",
                      aspectRatio: 1,
                      borderWidth: 1,
                      borderColor: EXPEDITION_THEME.border,
                      backgroundColor: isSubmitKey ? (isDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent) : EXPEDITION_THEME.panelStrong,
                      opacity: isDisabled ? 0.45 : 1,
                    }}
                    disabled={isDisabled}
                    onPress={() => {
                      if (isBackspaceKey) {
                        onBackspaceVerificationCode();
                        onResetCodeFeedback();
                        return;
                      }

                      if (isSubmitKey) {
                        onSubmitVerificationCode();
                        return;
                      }

                      onAppendVerificationCode(key);
                      onResetCodeFeedback();
                    }}
                  >
                    {isDigitKey ? (
                      <View className="h-full w-full items-center justify-center">
                        <Text
                          className="font-semibold text-center"
                          style={{
                            color: EXPEDITION_THEME.textPrimary,
                            textAlign: "center",
                            fontVariant: ["tabular-nums"],
                            fontSize: layout.pinpadDigitFontSize,
                          }}
                        >
                          {label}
                        </Text>
                        <Text
                          className="mt-[-2px] text-[9px] font-semibold tracking-[1.6px] text-center"
                          style={{
                            color: EXPEDITION_THEME.textSubtle,
                            fontSize: layout.isTablet ? 11 : 9,
                          }}
                        >
                          {sublabel}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        className="font-semibold text-center"
                        style={{
                          color: isSubmitKey ? resolveActionLabelColor(isDisabled) : EXPEDITION_THEME.textPrimary,
                          width: "100%",
                          textAlign: "center",
                          textAlignVertical: "center",
                          fontSize: isSubmitKey ? layout.actionFontSize : layout.keyLabelFontSize,
                        }}
                      >
                        {label}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <Animated.View style={[codeInputShakeStyle, minimalChrome ? { flexGrow: 0, flexShrink: 0 } : null]}>
          <View
            className="flex-row items-stretch"
            style={{
              marginTop: layout.isTablet ? 10 : 8,
              columnGap: keyboardGap,
            }}
          >
            <Animated.View
              className="flex-1 rounded-2xl border"
              style={[
                codeInputShakeStyle,
                {
                  borderColor: isCodeInputSuccess ? successColor : isCodeInputInvalid ? EXPEDITION_THEME.danger : EXPEDITION_THEME.border,
                  backgroundColor: isCodeInputSuccess ? successSurfaceColor : isCodeInputInvalid ? dangerSurfaceColor : EXPEDITION_THEME.panelStrong,
                  justifyContent: "center",
                  minHeight: inlineCodeRowHeight,
                  paddingHorizontal: minimalChrome ? 14 : 16,
                  paddingVertical: minimalChrome ? 9 : 12,
                },
              ]}
            >
              <Text
                className="text-center font-semibold tracking-[0.18em]"
                style={{
                  color: verificationCode ? EXPEDITION_THEME.textPrimary : EXPEDITION_THEME.textSubtle,
                  fontSize: (layout.isTablet ? 26 : 20) * (minimalChrome ? inlineBlockScale : 1),
                }}
                numberOfLines={1}
              >
                {verificationCode || getCodePlaceholder(station.stationType, text)}
              </Text>
            </Animated.View>

            <Pressable
              className="items-center justify-center rounded-2xl px-3 active:opacity-90"
              style={{
                width: submitButtonWidth,
                minHeight: inlineCodeRowHeight,
                borderWidth: 1,
                borderColor: isCodeActionDisabled ? EXPEDITION_THEME.border : EXPEDITION_THEME.accent,
                backgroundColor: isCodeActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
                opacity: isCodeActionDisabled ? 0.45 : 1,
              }}
              disabled={isCodeActionDisabled}
              onPress={onSubmitVerificationCode}
            >
              <Text
                className="font-semibold text-center"
                style={{
                  color: resolveActionLabelColor(isCodeActionDisabled),
                  fontSize: layout.actionFontSize * (minimalChrome ? inlineBlockScale : 1),
                }}
                numberOfLines={2}
              >
                {isSubmittingCode ? text.submitting : text.submitCode}
              </Text>
            </Pressable>
          </View>

          <View
            className="gap-2"
            style={{
              marginTop: minimalChrome ? (layout.isTablet ? 8 : 6) : layout.isTablet ? 16 : 12,
              marginBottom: minimalChrome ? 0 : layout.isTablet ? 8 : 6,
              ...(minimalChrome ? { flexGrow: 0, flexShrink: 0 } : {}),
            }}
            onLayout={(event) => {
              if (minimalChrome) {
                return;
              }
              const { width, height } = event.nativeEvent.layout;
              setKeyboardBox((current) => (current.width === width && current.height === height ? current : { width, height }));
            }}
          >
            {keyboardRows.map((row, rowIndex) => (
              <View key={`code-keyboard-row-${rowIndex}`} className="flex-row justify-center" style={{ columnGap: keyboardGap }}>
                {row.map((key) => {
                  const isBackspaceKey = key === "backspace";
                  const isDisabled = isBackspaceKey ? !canBackspaceAlphanumericCode : !canAppendAlphanumericCharacter;

                  return (
                    <Pressable
                      key={`code-key-${key}`}
                      className="items-center justify-center rounded-2xl border active:opacity-85"
                      style={{
                        width: alphanumericKeySize,
                        height: alphanumericKeyHeight,
                        borderColor: isBackspaceKey ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                        backgroundColor: isBackspaceKey ? EXPEDITION_THEME.accent : EXPEDITION_THEME.panelStrong,
                        opacity: isDisabled ? 0.45 : 1,
                      }}
                      disabled={isDisabled}
                      onPress={() => {
                        if (isBackspaceKey) {
                          onBackspaceVerificationCode();
                          onResetCodeFeedback();
                          return;
                        }

                        onAppendVerificationCode(key);
                        onResetCodeFeedback();
                      }}
                      hitSlop={3}
                    >
                      <Text
                        className="font-semibold"
                        style={{
                          color: isBackspaceKey ? resolveActionLabelColor(!canBackspaceAlphanumericCode) : EXPEDITION_THEME.textPrimary,
                          fontSize: alphanumericKeyLabelFontSize,
                        }}
                      >
                        {isBackspaceKey ? "⌫" : key}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {codeResult && !isInvalidCompletionCodeErrorMessage(codeResult) ? (
        <Text
          className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"}`}
          style={{
            color: EXPEDITION_THEME.textMuted,
            fontSize: layout.resultFontSize,
          }}
        >
          {codeResult}
        </Text>
      ) : null}
    </View>
  );
}
