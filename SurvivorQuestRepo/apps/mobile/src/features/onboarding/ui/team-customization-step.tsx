import { memo, useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { EXPEDITION_THEME, TEAM_ICONS } from "../model/constants";
import type { TeamColor, TeamColorOption } from "../model/types";

export type TeamCustomizationStepText = {
  editorTitle: string;
  editorHint: string;
  bannerPreviewLabel: string;
  teamFallbackName: string;
  teamLabel: string;
  pointsLabel: string;
  customizationLabel: string;
  teamNamePlaceholder: string;
  teamColorLabel: string;
  teamIconLabel: string;
  startAction: string;
  startingAction: string;
};

type TeamCustomizationStepProps = {
  isTabletLayout: boolean;
  selectedTeam: number | null;
  teamName: string;
  teamColor: TeamColor;
  teamIcon: string;
  teamColors: TeamColorOption[];
  selectedColor: TeamColorOption;
  bannerTextColor: string;
  bannerMutedTextColor: string;
  bannerIconBackground: string;
  saveMessage: string | null;
  saveMessageTone: "success" | "error" | null;
  blockMessage: string | null;
  isSaving: boolean;
  canSave: boolean;
  occupiedColors: Record<string, number>;
  occupiedIcons: Record<string, number>;
  text: TeamCustomizationStepText;
  onTeamNameChange: (value: string) => void;
  onTeamColorChange: (value: TeamColor) => void;
  onTeamIconChange: (value: string) => void;
  onSave: () => void | Promise<void>;
};

type ColorOptionButtonProps = {
  colorOption: TeamColorOption;
  isSelected: boolean;
  selectedTeam: number | null;
  occupiedByTeam: number | null;
  onSelect: (value: TeamColor) => void;
};

const ColorOptionButton = memo(function ColorOptionButton({
  colorOption,
  isSelected,
  selectedTeam,
  occupiedByTeam,
  onSelect,
}: ColorOptionButtonProps) {
  const isTakenByAnotherTeam =
    typeof occupiedByTeam === "number" &&
    (!selectedTeam || occupiedByTeam !== selectedTeam);

  const containerStyle = useMemo(
    () => ({
      borderColor: isSelected
        ? EXPEDITION_THEME.accentStrong
        : isTakenByAnotherTeam
          ? EXPEDITION_THEME.danger
          : EXPEDITION_THEME.border,
      backgroundColor: isSelected
        ? EXPEDITION_THEME.panelStrong
        : isTakenByAnotherTeam
          ? "rgba(239, 111, 108, 0.16)"
          : EXPEDITION_THEME.panelMuted,
    }),
    [isSelected, isTakenByAnotherTeam],
  );

  return (
    <Pressable
      className="h-12 w-12 items-center justify-center rounded-full border active:opacity-90"
      style={containerStyle}
      onPress={() => onSelect(colorOption.key)}
    >
      <View className="h-7 w-7 rounded-full" style={{ backgroundColor: colorOption.hex }} />
      {isTakenByAnotherTeam ? (
        <Text
          className="absolute -top-2 -right-2 rounded-full px-1 text-[10px] font-bold"
          style={{ backgroundColor: EXPEDITION_THEME.danger, color: "#fff" }}
        >
          {occupiedByTeam}
        </Text>
      ) : null}
    </Pressable>
  );
});

type IconOptionButtonProps = {
  iconOption: string;
  isSelected: boolean;
  selectedTeam: number | null;
  occupiedByTeam: number | null;
  onSelect: (value: string) => void;
};

const IconOptionButton = memo(function IconOptionButton({
  iconOption,
  isSelected,
  selectedTeam,
  occupiedByTeam,
  onSelect,
}: IconOptionButtonProps) {
  const isTakenByAnotherTeam =
    typeof occupiedByTeam === "number" &&
    (!selectedTeam || occupiedByTeam !== selectedTeam);

  const containerStyle = useMemo(
    () => ({
      borderColor: isSelected
        ? EXPEDITION_THEME.accentStrong
        : isTakenByAnotherTeam
          ? EXPEDITION_THEME.danger
          : EXPEDITION_THEME.border,
      backgroundColor: isSelected
        ? EXPEDITION_THEME.panelStrong
        : isTakenByAnotherTeam
          ? "rgba(239, 111, 108, 0.16)"
          : EXPEDITION_THEME.panel,
    }),
    [isSelected, isTakenByAnotherTeam],
  );

  return (
    <Pressable
      className="h-14 w-14 items-center justify-center rounded-2xl border active:opacity-90"
      style={containerStyle}
      onPress={() => onSelect(iconOption)}
    >
      <Text className="text-2xl">{iconOption}</Text>
      {isTakenByAnotherTeam ? (
        <Text
          className="absolute -top-2 -right-2 rounded-full px-1 text-[10px] font-bold"
          style={{ backgroundColor: EXPEDITION_THEME.danger, color: "#fff" }}
        >
          {occupiedByTeam}
        </Text>
      ) : null}
    </Pressable>
  );
});

export function TeamCustomizationStep({
  isTabletLayout,
  selectedTeam,
  teamName,
  teamColor,
  teamIcon,
  teamColors,
  selectedColor,
  bannerTextColor,
  bannerMutedTextColor,
  bannerIconBackground,
  saveMessage,
  saveMessageTone,
  blockMessage,
  isSaving,
  canSave,
  occupiedColors,
  occupiedIcons,
  text,
  onTeamNameChange,
  onTeamColorChange,
  onTeamIconChange,
  onSave,
}: TeamCustomizationStepProps) {
  return (
    <View
      className={`rounded-3xl border ${isTabletLayout ? "p-7" : "p-5"}`}
      style={{
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: EXPEDITION_THEME.panel,
      }}
    >
      <View className="px-1">
        <Text className="text-base font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
          {text.editorTitle}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: EXPEDITION_THEME.textMuted }}>
          {text.editorHint}
        </Text>
      </View>

      <View
        className="mt-3 rounded-2xl border px-4 py-4"
        style={{
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panelStrong,
        }}
        >
          <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
            {text.bannerPreviewLabel}
          </Text>
        <View
          className="mt-2 rounded-xl border px-2 py-1"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: selectedColor.hex,
            minHeight: isTabletLayout ? 104 : 88,
          }}
        >
          <View className="flex-1 flex-row items-center gap-2">
            <View className="h-full w-1/6 items-center justify-center rounded-md" style={{ backgroundColor: bannerIconBackground }}>
              <Text className={isTabletLayout ? "text-4xl" : "text-3xl"}>{teamIcon}</Text>
            </View>
            <View className="flex-1">
              <Text
                className={isTabletLayout ? "text-2xl font-extrabold" : "text-xl font-extrabold"}
                style={{ color: bannerTextColor }}
                numberOfLines={1}
              >
                {teamName.trim() || text.teamFallbackName}
              </Text>
              <Text className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: bannerMutedTextColor }}>
                {text.teamLabel} {selectedTeam ?? "-"} • {selectedColor.label}
              </Text>
            </View>
            <View>
              <Text className="text-[9px] uppercase tracking-widest" style={{ color: bannerMutedTextColor }}>
                {text.pointsLabel}
              </Text>
              <Text
                className={isTabletLayout ? "text-2xl font-extrabold text-right" : "text-xl font-extrabold text-right"}
                style={{ color: bannerTextColor }}
              >
                0
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        className="mt-3 rounded-2xl border px-4 py-4"
        style={{
          borderColor: EXPEDITION_THEME.border,
          backgroundColor: EXPEDITION_THEME.panelMuted,
        }}
      >
        <Text className="text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
          {text.customizationLabel}
        </Text>

        <TextInput
          className="mt-2 rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panel,
            color: EXPEDITION_THEME.textPrimary,
          }}
          value={teamName}
          onChangeText={onTeamNameChange}
          placeholder={text.teamNamePlaceholder}
          placeholderTextColor={EXPEDITION_THEME.textSubtle}
          maxLength={40}
        />

        <Text className="mt-3 text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
          {text.teamColorLabel}
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-3">
          {teamColors.map((colorOption) => (
            <ColorOptionButton
              key={colorOption.key}
              colorOption={colorOption}
              isSelected={colorOption.key === teamColor}
              selectedTeam={selectedTeam}
              occupiedByTeam={occupiedColors[colorOption.key] ?? null}
              onSelect={onTeamColorChange}
            />
          ))}
        </View>

        <Text className="mt-3 text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
          {text.teamIconLabel}
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-3">
          {TEAM_ICONS.map((iconOption) => (
            <IconOptionButton
              key={iconOption}
              iconOption={iconOption}
              isSelected={iconOption === teamIcon}
              selectedTeam={selectedTeam}
              occupiedByTeam={occupiedIcons[iconOption] ?? null}
              onSelect={onTeamIconChange}
            />
          ))}
        </View>
      </View>

      <View className="mt-4">
        <Pressable
          className="rounded-2xl px-3 py-3 active:opacity-90"
          style={{ backgroundColor: EXPEDITION_THEME.accent, opacity: canSave ? 1 : 0.6 }}
          onPress={() => void onSave()}
          disabled={!canSave}
        >
          <Text className="text-center font-semibold text-zinc-950">
            {isSaving ? text.startingAction : text.startAction}
          </Text>
        </Pressable>
      </View>

      {saveMessage && (
        <View
          className="mt-3 rounded-2xl border px-3 py-2"
          style={{
            borderColor: EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panelStrong,
          }}
        >
          <Text
            className="text-sm"
            style={{ color: saveMessageTone === "error" ? EXPEDITION_THEME.danger : EXPEDITION_THEME.accentStrong }}
          >
            {saveMessage}
          </Text>
        </View>
      )}

      {blockMessage && (
        <View
          className="mt-3 rounded-2xl border px-3 py-2"
          style={{
            borderColor: EXPEDITION_THEME.danger,
            backgroundColor: "rgba(239, 111, 108, 0.12)",
          }}
        >
          <Text className="text-sm" style={{ color: EXPEDITION_THEME.danger }}>
            {blockMessage}
          </Text>
        </View>
      )}
    </View>
  );
}
