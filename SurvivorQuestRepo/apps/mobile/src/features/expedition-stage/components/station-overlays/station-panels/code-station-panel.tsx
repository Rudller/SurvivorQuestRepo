import { Animated, Pressable, Text, TextInput, View } from "react-native";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import {
  NUMERIC_PINPAD_LAYOUT,
  NUMERIC_PINPAD_SUBLABELS,
  isInvalidCompletionCodeErrorMessage,
} from "../puzzle-helpers";
import type { StationTestType, StationTestViewModel } from "../types";

function getCodePlaceholder(stationType: StationTestType) {
  return stationType === "time" ? "np. TIME-2048" : "np. POINTS-2048";
}

type CodeStationPanelProps = {
  station: StationTestViewModel;
  isNumericCodeStation: boolean;
  hasTimedLimit: boolean;
  hasTimerStarted: boolean;
  isTimeExpired: boolean;
  isCodeActionDisabled: boolean;
  verificationCode: string;
  isCodeInputInvalid: boolean;
  isCodeInputSuccess: boolean;
  codeResult: string | null;
  isSubmittingCode: boolean;
  codeInputShakeAnimation: Animated.Value;
  onChangeVerificationCode: (value: string) => void;
  onBackspaceVerificationCode: () => void;
  onAppendVerificationCode: (value: string) => void;
  onSubmitVerificationCode: () => void;
  onResetCodeFeedback: () => void;
};

export function CodeStationPanel({
  station,
  isNumericCodeStation,
  hasTimedLimit,
  hasTimerStarted,
  isTimeExpired,
  isCodeActionDisabled,
  verificationCode,
  isCodeInputInvalid,
  isCodeInputSuccess,
  codeResult,
  isSubmittingCode,
  codeInputShakeAnimation,
  onChangeVerificationCode,
  onBackspaceVerificationCode,
  onAppendVerificationCode,
  onSubmitVerificationCode,
  onResetCodeFeedback,
}: CodeStationPanelProps) {
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
          <View className="items-center">
            <Animated.View
              className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} w-full max-w-[320px] rounded-2xl border px-4 ${isNumericCodeStation ? "py-2.5" : "py-3"}`}
              style={[
                codeInputShakeStyle,
                {
                  borderColor: isCodeInputSuccess
                    ? "#34d399"
                    : isCodeInputInvalid
                      ? EXPEDITION_THEME.danger
                      : EXPEDITION_THEME.border,
                  backgroundColor: isCodeInputSuccess
                    ? "rgba(52, 211, 153, 0.2)"
                    : isCodeInputInvalid
                      ? "rgba(239, 111, 108, 0.16)"
                      : EXPEDITION_THEME.panelStrong,
                },
              ]}
            >
              <Text
                className="text-center text-2xl font-semibold tracking-[0.35em]"
                style={{ color: EXPEDITION_THEME.textPrimary }}
                numberOfLines={1}
              >
                {verificationCode || "• • • •"}
              </Text>
            </Animated.View>
          </View>

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
                        }}
                      >
                        {label}
                      </Text>
                      <Text
                        className="mt-[-2px] text-[9px] font-semibold tracking-[1.6px] text-center"
                        style={{ color: EXPEDITION_THEME.textSubtle }}
                      >
                        {sublabel}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      className={`${isSubmitKey ? "text-xl" : "text-base"} font-semibold text-center`}
                      style={{
                        color: isSubmitKey ? "#09090b" : EXPEDITION_THEME.textPrimary,
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
        </View>
      ) : (
        <Animated.View style={codeInputShakeStyle}>
          <TextInput
            className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} rounded-xl border px-3 py-2 text-sm`}
            style={{
              borderColor: isCodeInputSuccess
                ? "#34d399"
                : isCodeInputInvalid
                  ? EXPEDITION_THEME.danger
                  : EXPEDITION_THEME.border,
              backgroundColor: isCodeInputSuccess
                ? "rgba(52, 211, 153, 0.2)"
                : isCodeInputInvalid
                  ? "rgba(239, 111, 108, 0.16)"
                  : EXPEDITION_THEME.panelStrong,
              color: EXPEDITION_THEME.textPrimary,
            }}
            placeholder={getCodePlaceholder(station.stationType)}
            placeholderTextColor={EXPEDITION_THEME.textSubtle}
            autoCapitalize="characters"
            autoCorrect={false}
            value={verificationCode}
            editable={
              station.status !== "done" &&
              station.status !== "failed" &&
              (!hasTimedLimit || (hasTimerStarted && !isTimeExpired))
            }
            onChangeText={(value) => {
              onChangeVerificationCode(value);
              onResetCodeFeedback();
            }}
          />
        </Animated.View>
      )}

      {station.completionCodeInputMode !== "numeric" ? (
        <Pressable
          className={`${isNumericCodeStation ? "mt-2" : "mt-3"} items-center rounded-xl py-2.5 active:opacity-90`}
          style={{
            backgroundColor: isCodeActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          }}
          disabled={isCodeActionDisabled}
          onPress={onSubmitVerificationCode}
        >
          <Text className="text-sm font-semibold text-zinc-950">
            {isSubmittingCode ? "Zatwierdzanie..." : "Zatwierdź kod"}
          </Text>
        </Pressable>
      ) : null}

      {codeResult && !isInvalidCompletionCodeErrorMessage(codeResult) ? (
        <Text className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} text-xs`} style={{ color: EXPEDITION_THEME.textMuted }}>
          {codeResult}
        </Text>
      ) : null}
    </View>
  );
}
