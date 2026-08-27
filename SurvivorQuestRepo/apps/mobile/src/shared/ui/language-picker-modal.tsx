import { Modal, Pressable, Text, View } from "react-native";
import { EXPEDITION_THEME } from "../../features/onboarding/model/constants";
import {
  getRealizationLanguageFlag,
  type RealizationLanguage,
  type RealizationLanguageOption,
} from "../../features/onboarding/model/types";
import type { UiLanguage } from "../../features/i18n";

const TEXT: Record<UiLanguage, { title: string; close: string }> = {
  polish: { title: "Wybierz język treści", close: "Zamknij" },
  english: { title: "Choose content language", close: "Close" },
  ukrainian: { title: "Виберіть мову контенту", close: "Закрити" },
  russian: { title: "Выберите язык контента", close: "Закрыть" },
};

type LanguagePickerModalProps = {
  visible: boolean;
  uiLanguage: UiLanguage;
  isLightTheme?: boolean;
  options: RealizationLanguageOption[];
  selectedLanguage: RealizationLanguage;
  onSelect: (language: RealizationLanguage) => void;
  onClose: () => void;
};

export function LanguagePickerModal({
  visible,
  uiLanguage,
  isLightTheme,
  options,
  selectedLanguage,
  onSelect,
  onClose,
}: LanguagePickerModalProps) {
  const text = TEXT[uiLanguage] ?? TEXT.polish;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-center px-6"
        style={{ backgroundColor: isLightTheme ? `rgba(${EXPEDITION_THEME.scrimWashRgb}, 0.34)` : "rgba(0, 0, 0, 0.45)" }}
        onPress={onClose}
      >
        <Pressable
          className="w-full self-center rounded-3xl border px-6 py-6"
          style={{
            maxWidth: 440,
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panel,
          }}
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-lg font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {text.title}
          </Text>
          <View className="mt-4 gap-3">
            {options.map((option) => {
              const isActive = option.value === selectedLanguage;
              return (
                <Pressable
                  key={`language-picker-${option.value}`}
                  className="flex-row items-center justify-between rounded-2xl border px-4 py-4 active:opacity-90"
                  style={{
                    borderColor: isActive ? EXPEDITION_THEME.accent : EXPEDITION_THEME.border,
                    backgroundColor: isActive ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panelMuted,
                  }}
                  onPress={() => {
                    if (!isActive) {
                      onSelect(option.value);
                    }
                    onClose();
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">{getRealizationLanguageFlag(option.value)}</Text>
                    <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                      {option.label}
                    </Text>
                  </View>
                  {isActive ? (
                    <Text className="text-base font-bold" style={{ color: EXPEDITION_THEME.accentStrong }}>
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            className="mt-4 rounded-2xl border px-4 py-3 active:opacity-90"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onClose}
          >
            <Text className="text-center text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
              {text.close}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
