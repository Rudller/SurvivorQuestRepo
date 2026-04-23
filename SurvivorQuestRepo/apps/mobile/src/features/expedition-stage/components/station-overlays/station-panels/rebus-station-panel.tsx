import { Pressable, Text, TextInput, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { TEXT_PUZZLE_MAX_ATTEMPTS } from "../puzzle-helpers";
import { AttemptsIndicator, useStationPanelLayout } from "./shared-ui";

type RebusStationPanelProps = {
  rebusQuestion: string;
  rebusAttemptsLeft: number;
  rebusInput: string;
  rebusResult: string | null;
  isActionDisabled: boolean;
  isSubmittingRebus: boolean;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
};

type RebusStationText = {
  rebus: string;
  attemptsLeft: string;
  placeholder: string;
  check: string;
};

const REBUS_STATION_TEXT_ENGLISH: RebusStationText = {
  rebus: "Rebus",
  attemptsLeft: "Attempts left",
  placeholder: "Enter solution",
  check: "Check",
};

const REBUS_STATION_TEXT: Record<UiLanguage, RebusStationText> = {
  polish: {
    rebus: "Rebus",
    attemptsLeft: "Pozostało prób",
    placeholder: "Wpisz rozwiązanie",
    check: "Sprawdź",
  },
  english: REBUS_STATION_TEXT_ENGLISH,
  ukrainian: {
    rebus: "Ребус",
    attemptsLeft: "Залишилось спроб",
    placeholder: "Введіть відповідь",
    check: "Перевірити",
  },
  russian: {
    rebus: "Ребус",
    attemptsLeft: "Осталось попыток",
    placeholder: "Введите решение",
    check: "Проверить",
  },
};

export function RebusStationPanel({
  rebusQuestion,
  rebusAttemptsLeft,
  rebusInput,
  rebusResult,
  isActionDisabled,
  isSubmittingRebus,
  onChangeInput,
  onSubmit,
}: RebusStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = REBUS_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();

  return (
    <View className="mt-3">
      <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.rebus}: <Text className="font-bold">{rebusQuestion}</Text>
      </Text>
      <View className="mt-1">
        <AttemptsIndicator
          label={text.attemptsLeft}
          attemptsLeft={rebusAttemptsLeft}
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
          autoCapitalize="characters"
          autoCorrect={false}
          value={rebusInput}
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
          <Text className="font-semibold text-zinc-950" style={{ fontSize: layout.actionFontSize }}>
            {isSubmittingRebus ? "..." : text.check}
          </Text>
        </Pressable>
      </View>
      {rebusResult ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {rebusResult}
        </Text>
      ) : null}
    </View>
  );
}
