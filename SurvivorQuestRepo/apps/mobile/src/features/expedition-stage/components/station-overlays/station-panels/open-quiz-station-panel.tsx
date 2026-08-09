import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import { AttemptsIndicator, resolveActionLabelColor, useStationPanelLayout } from "./shared-ui";

type OpenQuizStationPanelProps = {
  openQuizAttemptsLeft: number;
  openQuizInput: string;
  openQuizResult: string | null;
  isActionDisabled: boolean;
  isSubmittingOpenQuiz: boolean;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
};

type OpenQuizStationText = {
  attemptsLeft: string;
  placeholder: string;
  check: string;
};

const OPEN_QUIZ_STATION_TEXT_ENGLISH: OpenQuizStationText = {
  attemptsLeft: "Attempts left",
  placeholder: "Enter your answer",
  check: "Check",
};

const OPEN_QUIZ_STATION_TEXT: Record<UiLanguage, OpenQuizStationText> = {
  polish: {
    attemptsLeft: "Pozostało prób",
    placeholder: "Wpisz odpowiedź",
    check: "Sprawdź",
  },
  english: OPEN_QUIZ_STATION_TEXT_ENGLISH,
  ukrainian: {
    attemptsLeft: "Залишилось спроб",
    placeholder: "Введіть відповідь",
    check: "Перевірити",
  },
  russian: {
    attemptsLeft: "Осталось попыток",
    placeholder: "Введите ответ",
    check: "Проверить",
  },
};

export function OpenQuizStationPanel({
  openQuizAttemptsLeft,
  openQuizInput,
  openQuizResult,
  isActionDisabled,
  isSubmittingOpenQuiz,
  onChangeInput,
  onSubmit,
}: OpenQuizStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = OPEN_QUIZ_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const adaptiveLayout = useAdaptiveLayout();
  const actionLabelColor = resolveActionLabelColor(isActionDisabled);
  // Reserve empty space below the panel so its content never renders under the
  // absolutely-positioned timer/points footer (preview.tsx).
  const footerClearance = adaptiveLayout.s(layout.isTablet ? 100 : 72, 60, 132);

  return (
    <View className="mt-3" style={{ marginBottom: footerClearance }}>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={openQuizAttemptsLeft}
          maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
        />
      </View>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          className="flex-1 rounded-xl border px-4"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
            color: EXPEDITION_THEME.textPrimary,
            fontSize: layout.inputFontSize,
            paddingVertical: layout.isTablet ? 12 : 8,
          }}
          placeholder={text.placeholder}
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          autoCapitalize="sentences"
          autoCorrect
          value={openQuizInput}
          onChangeText={onChangeInput}
          editable={!isActionDisabled}
          onSubmitEditing={onSubmit}
        />
        <Pressable
          className="items-center justify-center rounded-xl px-5 active:opacity-90"
          style={{
            backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
            minHeight: layout.actionMinHeight,
          }}
          onPress={onSubmit}
          disabled={isActionDisabled}
        >
          <Text className="font-semibold" style={{ color: actionLabelColor, fontSize: layout.actionFontSize }}>
            {isSubmittingOpenQuiz ? "..." : text.check}
          </Text>
        </Pressable>
      </View>
      {openQuizResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {openQuizResult}
        </Text>
      ) : null}
    </View>
  );
}
