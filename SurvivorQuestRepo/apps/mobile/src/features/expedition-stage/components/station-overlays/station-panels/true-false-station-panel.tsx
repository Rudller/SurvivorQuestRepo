import { Pressable, Text, View } from "react-native";

import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import type { TrueFalseStatement } from "../puzzle-helpers";
import { resolveActionLabelColor, useStationPanelLayout, withAlpha } from "./shared-ui";

type TrueFalseStationPanelProps = {
  statements: TrueFalseStatement[];
  // Parallel to `statements`; null means that statement has not been marked yet.
  selections: (boolean | null)[];
  result: string | null;
  isActionDisabled: boolean;
  isInteractiveLocked: boolean;
  isSubmitting: boolean;
  onSelect: (index: number, isTrue: boolean) => void;
  onSubmit: () => void;
};

type TrueFalseStationText = {
  isTrue: string;
  isFalse: string;
  check: string;
};

const TRUE_FALSE_STATION_TEXT_ENGLISH: TrueFalseStationText = {
  isTrue: "True",
  isFalse: "False",
  check: "Check",
};

const TRUE_FALSE_STATION_TEXT: Record<UiLanguage, TrueFalseStationText> = {
  polish: {
    isTrue: "Prawda",
    isFalse: "Fałsz",
    check: "Sprawdź",
  },
  english: TRUE_FALSE_STATION_TEXT_ENGLISH,
  ukrainian: {
    isTrue: "Правда",
    isFalse: "Хиба",
    check: "Перевірити",
  },
  russian: {
    isTrue: "Правда",
    isFalse: "Ложь",
    check: "Проверить",
  },
};

export function TrueFalseStationPanel({
  statements,
  selections,
  result,
  isActionDisabled,
  isInteractiveLocked,
  isSubmitting,
  onSelect,
  onSubmit,
}: TrueFalseStationPanelProps) {
  const uiLanguage = useUiLanguage();
  const text = TRUE_FALSE_STATION_TEXT[uiLanguage];
  const layout = useStationPanelLayout();
  const actionLabelColor = resolveActionLabelColor(isActionDisabled);

  return (
    // No instruction line here: the card already renders the station's question,
    // which for this type is the fixed "mark each statement" prompt (see
    // TRUE_FALSE_SYSTEM_STATION_PROMPT on the admin side).
    <View className="mt-3">
      <View style={{ rowGap: layout.isTablet ? 10 : 6 }}>
        {statements.map((item, index) => {
          const selection = selections[index] ?? null;

          return (
            <View
              key={`${index}-${item.statement}`}
              className="rounded-xl border px-3 py-2"
              style={{
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panelStrong,
                rowGap: layout.isTablet ? 8 : 5,
              }}
            >
              <Text
                style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.inputFontSize }}
              >
                {item.statement}
              </Text>
              <View className="flex-row" style={{ columnGap: layout.isTablet ? 8 : 6 }}>
                <TrueFalseChoice
                  label={text.isTrue}
                  isSelected={selection === true}
                  tint={EXPEDITION_THEME.accent}
                  isDisabled={isInteractiveLocked || isSubmitting}
                  onPress={() => onSelect(index, true)}
                />
                <TrueFalseChoice
                  label={text.isFalse}
                  isSelected={selection === false}
                  tint={EXPEDITION_THEME.danger}
                  isDisabled={isInteractiveLocked || isSubmitting}
                  onPress={() => onSelect(index, false)}
                />
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        testID="true-false-submit"
        className="mt-3 items-center justify-center rounded-xl px-5 active:opacity-90"
        style={{
          backgroundColor: isActionDisabled ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.accent,
          minHeight: layout.actionMinHeight,
        }}
        onPress={onSubmit}
        disabled={isActionDisabled}
      >
        <Text className="font-semibold" style={{ color: actionLabelColor, fontSize: layout.actionFontSize }}>
          {isSubmitting ? "..." : text.check}
        </Text>
      </Pressable>

      {result ? (
        <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.resultFontSize }}>
          {result}
        </Text>
      ) : null}
    </View>
  );
}

type TrueFalseChoiceProps = {
  label: string;
  isSelected: boolean;
  tint: string;
  isDisabled: boolean;
  onPress: () => void;
};

function TrueFalseChoice({ label, isSelected, tint, isDisabled, onPress }: TrueFalseChoiceProps) {
  const layout = useStationPanelLayout();

  return (
    <Pressable
      className="flex-1 items-center justify-center rounded-lg border px-3 active:opacity-90"
      style={{
        borderColor: isSelected ? tint : EXPEDITION_THEME.border,
        backgroundColor: isSelected ? withAlpha(tint, 0.18) : "transparent",
        minHeight: layout.isTablet ? 42 : 30,
        opacity: isDisabled ? 0.6 : 1,
      }}
      onPress={onPress}
      disabled={isDisabled}
    >
      <Text
        className={isSelected ? "font-semibold" : undefined}
        style={{
          color: isSelected ? tint : EXPEDITION_THEME.textMuted,
          fontSize: layout.actionFontSize,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
