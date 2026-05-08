import { useMemo, useState } from "react";
import { Animated, Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import {
  NUMERIC_PINPAD_LAYOUT,
  NUMERIC_PINPAD_SUBLABELS,
  isInvalidCompletionCodeErrorMessage,
} from "../puzzle-helpers";
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
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type CodeStationPanelProps = {
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
  const successColor = "#34d399";
  const successSurfaceColor = withAlpha(successColor, 0.2);
  const dangerSurfaceColor = withAlpha(EXPEDITION_THEME.danger, 0.16);
  const [keyboardWidth, setKeyboardWidth] = useState(0);
  const canAppendAlphanumericCharacter = !isCodeActionDisabled && verificationCode.length < 32;
  const canBackspaceAlphanumericCode = !isCodeActionDisabled && verificationCode.length > 0;
  const isPointsStation = station.stationType === "points";
  const useInlineSubmitForNumericPad = station.completionCodeInputMode === "numeric" && isPointsStation;
  const keyboardGap = layout.isTablet ? 6 : 2;
  const desiredKeySize = layout.isTablet ? 62 : 46;
  const minKeySize = layout.isTablet ? 40 : 24;
  const keyboardTopRow = [...ALPHANUMERIC_CODE_KEYBOARD_ROWS[0], "backspace"] as const;
  const keyboardBottomRows = ALPHANUMERIC_CODE_KEYBOARD_ROWS.slice(1);
  const inlineCodeRowHeight = layout.isTablet ? 78 : 57;

  const alphanumericKeySize = useMemo(() => {
    if (keyboardWidth <= 0) {
      return desiredKeySize;
    }

    const availableForTopRow = keyboardWidth - keyboardGap * (keyboardTopRow.length - 1);
    if (availableForTopRow <= 0) {
      return minKeySize;
    }

    const computed = Math.floor(availableForTopRow / keyboardTopRow.length);
    return Math.max(minKeySize, Math.min(desiredKeySize, computed));
  }, [desiredKeySize, keyboardGap, keyboardTopRow.length, keyboardWidth, minKeySize]);

  const topRowWidth = alphanumericKeySize * keyboardTopRow.length + keyboardGap * (keyboardTopRow.length - 1);
  const codeInputShakeStyle = {
    transform: [{ translateX: codeInputShakeAnimation }],
  } as const;

  return (
    <View
      className={`${isNumericCodeStation ? "mt-2" : "mt-3"} rounded-2xl border px-3 ${isNumericCodeStation ? "py-2" : "py-3"}`}
      style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
    >
      {station.completionCodeInputMode === "numeric" ? (
        <View className={isNumericCodeStation ? "mt-1" : "mt-2"}>
          {useInlineSubmitForNumericPad ? (
            <AnimatedTextInput
              style={[
                {
                  marginTop: isNumericCodeStation ? 6 : 8,
                  width: "100%",
                  maxWidth: 320,
                  alignSelf: "center",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isCodeInputSuccess
                    ? successColor
                    : isCodeInputInvalid
                      ? EXPEDITION_THEME.danger
                      : EXPEDITION_THEME.border,
                  backgroundColor: isCodeInputSuccess
                    ? successSurfaceColor
                    : isCodeInputInvalid
                      ? dangerSurfaceColor
                      : EXPEDITION_THEME.panelStrong,
                  color: EXPEDITION_THEME.textPrimary,
                  minHeight: inlineCodeRowHeight,
                  paddingHorizontal: 16,
                  paddingVertical: layout.isTablet ? 12 : 10,
                  textAlign: "center",
                  fontSize: layout.isTablet ? 34 : 24,
                  fontWeight: "600",
                  letterSpacing: layout.isTablet ? 6 : 4,
                  fontVariant: ["tabular-nums"],
                },
                codeInputShakeStyle,
              ]}
              value={verificationCode}
              placeholder="• • • •"
              placeholderTextColor={EXPEDITION_THEME.textSubtle}
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
                    borderColor: isCodeInputSuccess
                      ? successColor
                      : isCodeInputInvalid
                        ? EXPEDITION_THEME.danger
                        : EXPEDITION_THEME.border,
                    backgroundColor: isCodeInputSuccess
                      ? successSurfaceColor
                      : isCodeInputInvalid
                        ? dangerSurfaceColor
                        : EXPEDITION_THEME.panelStrong,
                  },
                ]}
              >
                <Text
                  className="text-center text-2xl font-semibold tracking-[0.35em]"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 34 : 24 }}
                  numberOfLines={1}
                >
                  {verificationCode || "• • • •"}
                </Text>
              </Animated.View>
            </View>
          )}

          {useInlineSubmitForNumericPad ? (
            <View className={`mx-auto ${isNumericCodeStation ? "mt-2" : "mt-3"} w-full max-w-[320px] gap-y-2`}>
              {[
                ["1", "2", "3"],
                ["4", "5", "6"],
                ["7", "8", "9"],
                ["backspace", "0", "submit"],
              ].map((row, rowIndex) => (
                <View
                  key={`points-numeric-row-${rowIndex}`}
                  className="flex-row justify-between"
                  style={{ columnGap: keyboardGap }}
                >
                  {row.map((key) => {
                    const isBackspaceKey = key === "backspace";
                    const isSubmitKey = key === "submit";
                    const isDigitKey = /^\d$/.test(key);
                    const isDisabled =
                      isCodeActionDisabled ||
                      (isBackspaceKey && verificationCode.length === 0) ||
                      (isDigitKey && verificationCode.length >= 32);
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
                          backgroundColor: isSubmitKey
                            ? isDisabled
                              ? EXPEDITION_THEME.panelStrong
                              : EXPEDITION_THEME.accent
                            : EXPEDITION_THEME.panelStrong,
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
                              className="text-[30px] font-medium text-center"
                              style={{
                                color: EXPEDITION_THEME.textPrimary,
                                textAlign: "center",
                                fontVariant: ["tabular-nums"],
                                fontSize: layout.isTablet ? 36 : 30,
                              }}
                            >
                              {label}
                            </Text>
                            <Text
                              className="mt-[-2px] text-[9px] font-semibold tracking-[1.6px] text-center"
                              style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.isTablet ? 11 : 9 }}
                            >
                              {sublabel}
                            </Text>
                          </View>
                      ) : (
                        <Text
                          className={`${isSubmitKey ? "text-xl" : "text-base"} font-semibold text-center`}
                          style={{
                            color: isSubmitKey
                              ? resolveActionLabelColor(isDisabled)
                              : EXPEDITION_THEME.textPrimary,
                            width: "100%",
                            textAlign: "center",
                            textAlignVertical: "center",
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
                    backgroundColor: isSubmitKey
                      ? isDisabled
                        ? EXPEDITION_THEME.panelStrong
                        : EXPEDITION_THEME.accent
                      : EXPEDITION_THEME.panelStrong,
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
                        className="text-[30px] font-medium text-center"
                        style={{
                          color: EXPEDITION_THEME.textPrimary,
                          textAlign: "center",
                          fontVariant: ["tabular-nums"],
                          fontSize: layout.isTablet ? 36 : 30,
                        }}
                      >
                        {label}
                      </Text>
                      <Text
                        className="mt-[-2px] text-[9px] font-semibold tracking-[1.6px] text-center"
                        style={{ color: EXPEDITION_THEME.textSubtle, fontSize: layout.isTablet ? 11 : 9 }}
                      >
                        {sublabel}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      className={`${isSubmitKey ? "text-xl" : "text-base"} font-semibold text-center`}
                      style={{
                        color: isSubmitKey ? resolveActionLabelColor(isDisabled) : EXPEDITION_THEME.textPrimary,
                        width: "100%",
                        textAlign: "center",
                        textAlignVertical: "center",
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
        <Animated.View style={codeInputShakeStyle}>
          <View className="flex-row items-stretch" style={{ marginTop: layout.isTablet ? 10 : 8, columnGap: keyboardGap }}>
            <Animated.View
              className="flex-1 rounded-2xl border px-4 py-3"
              style={[
                codeInputShakeStyle,
                {
                  borderColor: isCodeInputSuccess
                    ? successColor
                    : isCodeInputInvalid
                      ? EXPEDITION_THEME.danger
                      : EXPEDITION_THEME.border,
                  backgroundColor: isCodeInputSuccess
                    ? successSurfaceColor
                    : isCodeInputInvalid
                      ? dangerSurfaceColor
                      : EXPEDITION_THEME.panelStrong,
                  justifyContent: "center",
                  minHeight: inlineCodeRowHeight,
                },
              ]}
            >
              <Text
                className="text-center font-semibold tracking-[0.18em]"
                style={{
                  color: verificationCode ? EXPEDITION_THEME.textPrimary : EXPEDITION_THEME.textSubtle,
                  fontSize: layout.isTablet ? 26 : 20,
                }}
                numberOfLines={1}
              >
                {verificationCode || getCodePlaceholder(station.stationType, text)}
              </Text>
            </Animated.View>

            <Pressable
              className="items-center justify-center rounded-2xl px-3 active:opacity-90"
              style={{
                width: layout.isTablet ? 164 : 132,
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
                style={{ color: resolveActionLabelColor(isCodeActionDisabled), fontSize: layout.isTablet ? 16 : 13 }}
                numberOfLines={2}
              >
                {isSubmittingCode ? text.submitting : text.submitCode}
              </Text>
            </Pressable>
          </View>

          <View
            className="gap-2"
            style={{ marginTop: layout.isTablet ? 16 : 12, marginBottom: layout.isTablet ? 8 : 6 }}
            onLayout={(event) => {
              setKeyboardWidth(event.nativeEvent.layout.width);
            }}
          >
            <View className="items-center">
              <View style={{ width: topRowWidth, maxWidth: "100%" }}>
                <View className="flex-row" style={{ columnGap: keyboardGap }}>
                  {keyboardTopRow.map((key) => (
                    (() => {
                      const isBackspaceKey = key === "backspace";
                      const isDisabled = isBackspaceKey ? !canBackspaceAlphanumericCode : !canAppendAlphanumericCharacter;
                      const label = isBackspaceKey ? "⌫" : key;

                      return (
                        <Pressable
                          key={`code-key-top-${key}`}
                          className="items-center justify-center rounded-2xl border active:opacity-85"
                          style={{
                            width: alphanumericKeySize,
                            height: alphanumericKeySize,
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
                              color: isBackspaceKey
                                ? resolveActionLabelColor(!canBackspaceAlphanumericCode)
                                : EXPEDITION_THEME.textPrimary,
                              fontSize: layout.isTablet ? 18 : 15,
                            }}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })()
                  ))}
                </View>
              </View>
            </View>

            {keyboardBottomRows.map((row, rowIndex) => (
              <View key={`code-keyboard-row-${rowIndex + 1}`} className="flex-row justify-center" style={{ columnGap: keyboardGap }}>
                {row.map((key) => (
                  <Pressable
                    key={`code-key-${key}`}
                    className="items-center justify-center rounded-2xl border active:opacity-85"
                    style={{
                      width: alphanumericKeySize,
                      height: alphanumericKeySize,
                      borderColor: EXPEDITION_THEME.border,
                      backgroundColor: EXPEDITION_THEME.panelStrong,
                      opacity: canAppendAlphanumericCharacter ? 1 : 0.45,
                    }}
                    disabled={!canAppendAlphanumericCharacter}
                    onPress={() => {
                      onAppendVerificationCode(key);
                      onResetCodeFeedback();
                    }}
                    hitSlop={3}
                  >
                    <Text
                      className="font-semibold"
                      style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 18 : 15 }}
                    >
                      {key}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}

          </View>
        </Animated.View>
      )}

      {codeResult && !isInvalidCompletionCodeErrorMessage(codeResult) ? (
        <Text
          className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"}`}
          style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}
        >
          {codeResult}
        </Text>
      ) : null}
    </View>
  );
}
