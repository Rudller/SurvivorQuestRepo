import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { resolveActionLabelColor, useStationPanelLayout } from "./shared-ui";

// Matches RISK_REVIEWED_ANSWER_MAX_LENGTH in the backend's risk-quiz.constants.ts.
// Enforced here too so a team hits the ceiling while typing instead of losing a
// long answer to a 400 at send time.
export const REVIEWED_ANSWER_MAX_LENGTH = 2000;

type ReviewedAnswerStationPanelProps = {
  input: string;
  isActionDisabled: boolean;
  isSubmitting: boolean;
  // The answer is already with the Game Master. Terminal for this card: there is
  // no retry, exactly like a photo task.
  hasSubmitted: boolean;
  submitError: string | null;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
};

type ReviewedAnswerStationText = {
  placeholder: string;
  send: string;
  pendingReview: string;
};

const REVIEWED_ANSWER_STATION_TEXT_ENGLISH: ReviewedAnswerStationText = {
  placeholder: "Write your answer",
  send: "Send answer",
  pendingReview: "Answer sent — waiting for the Game Master's decision.",
};

const REVIEWED_ANSWER_STATION_TEXT: Record<UiLanguage, ReviewedAnswerStationText> = {
  polish: {
    placeholder: "Wpiszcie odpowiedź",
    send: "Wyślij odpowiedź",
    pendingReview: "Odpowiedź wysłana — czeka na decyzję Mistrza Gry.",
  },
  english: REVIEWED_ANSWER_STATION_TEXT_ENGLISH,
  ukrainian: {
    placeholder: "Напишіть відповідь",
    send: "Надіслати відповідь",
    pendingReview: "Відповідь надіслано — очікує на рішення організатора.",
  },
  russian: {
    placeholder: "Напишите ответ",
    send: "Отправить ответ",
    pendingReview: "Ответ отправлен — ожидает решения организатора.",
  },
};

export function ReviewedAnswerStationPanel({
  input,
  isActionDisabled,
  isSubmitting,
  hasSubmitted,
  submitError,
  onChangeInput,
  onSubmit,
}: ReviewedAnswerStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = REVIEWED_ANSWER_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();

  if (hasSubmitted) {
    return (
      <View className="mt-3 items-center">
        <Text
          className="text-center"
          style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}
        >
          {text.pendingReview}
        </Text>
      </View>
    );
  }

  const isSendDisabled = isActionDisabled || isSubmitting || !input.trim();
  const actionLabelColor = resolveActionLabelColor(isSendDisabled);

  return (
    <View className="mt-3">
      <TextInput
        className="rounded-xl border px-4"
        style={{
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panelStrong,
          color: EXPEDITION_THEME.textPrimary,
          fontSize: layout.inputFontSize,
          paddingVertical: layout.isTablet ? 12 : 8,
          minHeight: layout.isTablet ? 132 : 88,
          textAlignVertical: "top",
        }}
        placeholder={text.placeholder}
        placeholderTextColor={EXPEDITION_THEME.textSubtle}
        autoCapitalize="sentences"
        autoCorrect
        multiline
        maxLength={REVIEWED_ANSWER_MAX_LENGTH}
        value={input}
        editable={!isActionDisabled && !isSubmitting}
        onChangeText={onChangeInput}
        // Same reason as the open-quiz panel: the station card dismisses the
        // keyboard on onTouchEnd for taps on empty space (preview.tsx), and raw
        // touch events bubble regardless of who becomes the responder.
        onTouchEnd={(event) => event.stopPropagation()}
      />
      <Pressable
        testID="reviewed-answer-send"
        className="mt-2 items-center justify-center rounded-xl px-5 active:opacity-90"
        style={{
          backgroundColor: isSendDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          minHeight: layout.actionMinHeight,
        }}
        onPress={onSubmit}
        disabled={isSendDisabled}
      >
        {isSubmitting ? (
          <ActivityIndicator color={actionLabelColor} />
        ) : (
          <Text className="font-semibold" style={{ color: actionLabelColor, fontSize: layout.actionFontSize }}>
            {text.send}
          </Text>
        )}
      </Pressable>
      {submitError ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.danger, fontSize: layout.resultFontSize }}>
          {submitError}
        </Text>
      ) : null}
    </View>
  );
}
