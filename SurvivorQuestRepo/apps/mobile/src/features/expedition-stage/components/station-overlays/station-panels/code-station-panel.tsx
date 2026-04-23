import { Animated, Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import {
  NUMERIC_PINPAD_LAYOUT,
  NUMERIC_PINPAD_SUBLABELS,
  isInvalidCompletionCodeErrorMessage,
} from "../puzzle-helpers";
import type { StationTestType, StationTestViewModel } from "../types";
import { useStationPanelLayout } from "./shared-ui";

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
  const uiLanguage = useUiLanguage();
  const text = CODE_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
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
                style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.isTablet ? 34 : 24 }}
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
              className={`${isNumericCodeStation ? "mt-1.5" : "mt-2"} rounded-xl border px-4`}
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
                fontSize: layout.inputFontSize,
                paddingVertical: layout.isTablet ? 12 : 8,
              }}
              placeholder={getCodePlaceholder(station.stationType, text)}
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
          className={`${isNumericCodeStation ? "mt-2" : "mt-3"} items-center rounded-xl active:opacity-90`}
          style={{
            backgroundColor: isCodeActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
            minHeight: layout.actionMinHeight,
            justifyContent: "center",
          }}
          disabled={isCodeActionDisabled}
          onPress={onSubmitVerificationCode}
        >
          <Text className="font-semibold text-zinc-950" style={{ fontSize: layout.actionFontSize }}>
            {isSubmittingCode ? text.submitting : text.submitCode}
          </Text>
        </Pressable>
      ) : null}

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
