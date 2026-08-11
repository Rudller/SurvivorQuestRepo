import { useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useUiLanguage, type UiLanguage } from "../../../../i18n";
import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { buildStrongPasswordRules, getDifficultyPointsMultiplier, type ChallengeDifficulty } from "./strong-password-rules";
import { resolveActionLabelColor, useStationPanelLayout } from "./shared-ui";

type Props = {
  stationId: string;
  configuredDifficulty: ChallengeDifficulty;
  difficultyMode?: "admin" | "player";
  basePoints: number;
  startedAt: string | null;
  isActionDisabled: boolean;
  onComplete: (difficulty: ChallengeDifficulty) => void;
};

type StrongPasswordStationText = {
  difficultyLabel: Record<ChallengeDifficulty, string>;
  ruleCount: string;
  pointsPercent: string;
  passwordPlaceholder: string;
  level: string;
  points: string;
  submit: string;
};

const STRONG_PASSWORD_STATION_TEXT_ENGLISH: StrongPasswordStationText = {
  difficultyLabel: { easy: "Easy", medium: "Medium", hard: "Hard" },
  ruleCount: "rules",
  pointsPercent: "% points",
  passwordPlaceholder: "Enter password",
  level: "Level",
  points: "Points",
  submit: "Confirm strong password",
};

const STRONG_PASSWORD_STATION_TEXT: Record<UiLanguage, StrongPasswordStationText> = {
  polish: {
    difficultyLabel: { easy: "Łatwy", medium: "Średni", hard: "Trudny" },
    ruleCount: "reguł",
    pointsPercent: "% punktów",
    passwordPlaceholder: "Wprowadź hasło",
    level: "Poziom",
    points: "Punkty",
    submit: "Zatwierdź mocne hasło",
  },
  english: STRONG_PASSWORD_STATION_TEXT_ENGLISH,
  ukrainian: {
    difficultyLabel: { easy: "Легкий", medium: "Середній", hard: "Важкий" },
    ruleCount: "правил",
    pointsPercent: "% балів",
    passwordPlaceholder: "Введіть пароль",
    level: "Рівень",
    points: "Бали",
    submit: "Підтвердити надійний пароль",
  },
  russian: {
    difficultyLabel: { easy: "Лёгкий", medium: "Средний", hard: "Сложный" },
    ruleCount: "правил",
    pointsPercent: "% очков",
    passwordPlaceholder: "Введите пароль",
    level: "Уровень",
    points: "Очки",
    submit: "Подтвердить надёжный пароль",
  },
};

export function StrongPasswordStationPanel({
  stationId,
  configuredDifficulty,
  difficultyMode = "admin",
  basePoints,
  startedAt,
  isActionDisabled,
  onComplete,
}: Props) {
  const layout = useStationPanelLayout();
  const uiLanguage = useUiLanguage();
  const text = STRONG_PASSWORD_STATION_TEXT[uiLanguage];
  const [selectedDifficulty, setSelectedDifficulty] = useState<ChallengeDifficulty | null>(
    difficultyMode === "admin" ? configuredDifficulty : null,
  );
  const [password, setPassword] = useState("");
  const difficulty = selectedDifficulty ?? configuredDifficulty;
  const rules = useMemo(
    () => buildStrongPasswordRules(stationId, difficulty, uiLanguage),
    [difficulty, stationId, uiLanguage],
  );
  const maxVisibleRef = useRef<{ key: string; count: number }>({ key: "", count: 0 });
  const ruleSetKey = `${stationId}-${difficulty}`;
  if (maxVisibleRef.current.key !== ruleSetKey) {
    maxVisibleRef.current = { key: ruleSetKey, count: 0 };
  }
  const currentVisibleRuleCount = Math.min(
    rules.length,
    rules.findIndex((rule) => !rule.validate(password)) === -1
      ? rules.length
      : rules.findIndex((rule) => !rule.validate(password)) + 1,
  );
  maxVisibleRef.current.count = Math.max(maxVisibleRef.current.count, currentVisibleRuleCount);
  const visibleRules = rules.slice(0, maxVisibleRef.current.count);
  const isSolved = rules.every((rule) => rule.validate(password));
  const multiplier = getDifficultyPointsMultiplier(difficulty);
  const awardedPoints = Math.round(basePoints * multiplier);

  if (!selectedDifficulty) {
    return (
      <View className="mt-3 gap-2">
        {(["easy", "medium", "hard"] as ChallengeDifficulty[]).map((option) => (
          <Pressable
            key={option}
            className="rounded-2xl border px-4 py-3 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelStrong }}
            onPress={() => setSelectedDifficulty(option)}
          >
            <Text className="font-bold" style={{ color: EXPEDITION_THEME.textPrimary, fontSize: layout.actionFontSize }}>
              {text.difficultyLabel[option]}
            </Text>
            <Text style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
              {rules.length} {text.ruleCount} • {Math.round(getDifficultyPointsMultiplier(option) * 100)}
              {text.pointsPercent}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View className="mt-3">
      <TextInput
        className="rounded-2xl border px-4"
        style={{
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panelStrong,
          color: EXPEDITION_THEME.textPrimary,
          fontSize: layout.inputFontSize,
          paddingVertical: layout.isTablet ? 14 : 10,
        }}
        placeholder={text.passwordPlaceholder}
        placeholderTextColor={EXPEDITION_THEME.textSubtle}
        value={password}
        onChangeText={setPassword}
        editable={!isActionDisabled}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text className="mt-2" style={{ color: EXPEDITION_THEME.textMuted, fontSize: layout.infoFontSize }}>
        {text.level}: {text.difficultyLabel[difficulty]} • {text.points}: {awardedPoints}
      </Text>
      <View className="mt-3 gap-2">
        {[...visibleRules].reverse().map((rule) => {
          const passed = rule.validate(password);
          return (
            <View key={rule.id} className="rounded-xl border px-3 py-2" style={{ borderColor: passed ? "#34d399" : EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}>
              <Text style={{ color: passed ? "#86efac" : EXPEDITION_THEME.textPrimary, fontSize: layout.infoFontSize }}>
                {passed ? "✓" : "•"} {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
      <Pressable
        className="mt-3 items-center justify-center rounded-xl px-5 active:opacity-90"
        style={{ backgroundColor: isSolved && !isActionDisabled ? EXPEDITION_THEME.accent : EXPEDITION_THEME.panelStrong, minHeight: layout.actionMinHeight }}
        disabled={!isSolved || isActionDisabled || !startedAt}
        onPress={() => onComplete(difficulty)}
      >
        <Text className="font-semibold" style={{ color: resolveActionLabelColor(!isSolved || isActionDisabled), fontSize: layout.actionFontSize }}>
          {text.submit}
        </Text>
      </Pressable>
    </View>
  );
}
