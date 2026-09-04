import { Modal, Pressable, ScrollView, Text } from "react-native";
import { EXPEDITION_THEME } from "../model/constants";
import { MOBILE_UX_TOKENS } from "../../../shared/ui/ux-tokens";

export type TeamIconPickerText = {
  title: string;
  hint: string;
  closeAction: string;
  takenLabel: (slotNumber: number) => string;
};

type TeamIconPickerModalProps = {
  visible: boolean;
  isTabletLayout: boolean;
  icons: string[];
  selectedIcon: string | null;
  /** icon -> slot number of the team that already took it. */
  occupiedIcons: Record<string, number>;
  selectedTeam: number | null;
  text: TeamIconPickerText;
  onSelect: (icon: string) => void;
  onRequestClose: () => void;
};

export function TeamIconPickerModal({
  visible,
  isTabletLayout,
  icons,
  selectedIcon,
  occupiedIcons,
  selectedTeam,
  text,
  onSelect,
  onRequestClose,
}: TeamIconPickerModalProps) {
  const cellSize = isTabletLayout ? 72 : 58;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <Pressable
        className="flex-1 items-center justify-center px-4"
        style={{ backgroundColor: "rgba(12, 18, 15, 0.72)" }}
        onPress={onRequestClose}
      >
        <Pressable
          className={`w-full rounded-3xl border ${isTabletLayout ? "p-6" : "p-4"}`}
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panel,
            maxWidth: isTabletLayout ? 760 : 640,
          }}
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-lg font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
            {text.title}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
            {text.hint}
          </Text>

          {/* Capped and scrollable: the catalogue is thirty-odd emoji, which on a
              phone is taller than the screen once the modal's own chrome is
              accounted for. */}
          <ScrollView
            className="mt-4"
            style={{ maxHeight: isTabletLayout ? 420 : 300 }}
            contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
          >
            {icons.map((icon) => {
              const occupiedByTeam = occupiedIcons[icon] ?? null;
              // A team's own emoji is "taken" by itself — that must stay
              // selectable, or re-opening the picker would lock them out of the
              // choice they already made.
              const isTakenByOther =
                occupiedByTeam !== null && occupiedByTeam !== selectedTeam;
              const isSelected = icon === selectedIcon;

              return (
                <Pressable
                  key={`team-icon-${icon}`}
                  className="items-center justify-center rounded-2xl border active:opacity-85"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
                    backgroundColor: isSelected
                      ? EXPEDITION_THEME.panelStrong
                      : EXPEDITION_THEME.panelMuted,
                    opacity: isTakenByOther ? MOBILE_UX_TOKENS.disabledOpacity : 1,
                  }}
                  disabled={isTakenByOther}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: isTakenByOther }}
                  accessibilityLabel={
                    isTakenByOther ? `${icon} — ${text.takenLabel(occupiedByTeam)}` : icon
                  }
                  onPress={() => onSelect(icon)}
                >
                  <Text style={{ fontSize: isTabletLayout ? 34 : 27 }}>{icon}</Text>
                  {isTakenByOther ? (
                    <Text
                      className="text-[9px] font-bold uppercase"
                      style={{ color: EXPEDITION_THEME.textSubtle }}
                    >
                      {text.takenLabel(occupiedByTeam)}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            className="mt-4 rounded-2xl border px-4 py-3 active:opacity-85"
            style={{ borderColor: EXPEDITION_THEME.border, backgroundColor: EXPEDITION_THEME.panelMuted }}
            onPress={onRequestClose}
          >
            <Text
              className="text-center text-base font-semibold"
              style={{ color: EXPEDITION_THEME.textPrimary }}
            >
              {text.closeAction}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
