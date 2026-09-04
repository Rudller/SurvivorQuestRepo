import { memo, useMemo, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { EXPEDITION_THEME } from "../model/constants";
import type { TeamColor, TeamColorOption } from "../model/types";
import { MobileFeedbackBanner } from "../../../shared/ui/mobile-feedback-banner";
import { MOBILE_UX_TOKENS } from "../../../shared/ui/ux-tokens";

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
  languageLabel: string;
  avatarLabel: string;
  avatarHint: string;
  photoOption: string;
  emojiOption: string;
  takeSelfie: string;
  retakeSelfie: string;
  selfieOverlayTitle: string;
  selfieOverlaySubtitle: string;
  startAction: string;
  startingAction: string;
};

type TeamCustomizationStepProps = {
  isTabletLayout: boolean;
  selectedTeam: number | null;
  teamName: string;
  teamColor: TeamColor;
  selfiePreviewUri: string | null;
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
  selfieUploadError: string | null;
  text: TeamCustomizationStepText;
  onTeamNameChange: (value: string) => void;
  onTeamColorChange: (value: TeamColor) => void;
  onOpenSelfieCapture: () => void;
  onOpenIconPicker: () => void;
  onSave: () => void | Promise<void>;
  // Language lives on the realization rather than on the team, but this is the
  // last screen before the game starts, so it is the last chance to fix a wrong
  // pick — the flag button on the team screen is gone by now.
  languageFlag?: string;
  languageName?: string;
  showLanguagePicker?: boolean;
  onOpenLanguagePicker?: () => void;
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
      className={`h-12 w-12 items-center justify-center rounded-full border ${MOBILE_UX_TOKENS.activePressClass}`}
      style={{
        ...containerStyle,
        minWidth: MOBILE_UX_TOKENS.minTouchTarget,
        minHeight: MOBILE_UX_TOKENS.minTouchTarget,
      }}
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

export function TeamCustomizationStep({
  isTabletLayout,
  selectedTeam,
  teamName,
  teamColor,
  selfiePreviewUri,
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
  selfieUploadError,
  text,
  onTeamNameChange,
  onTeamColorChange,
  onOpenSelfieCapture,
  onOpenIconPicker,
  onSave,
  languageFlag,
  languageName,
  showLanguagePicker = false,
  onOpenLanguagePicker,
}: TeamCustomizationStepProps) {
  const [isTeamNameFocused, setIsTeamNameFocused] = useState(false);
  // No separate mode state: the avatar in play *is* the mode. A photo always
  // wins in the banner when one exists, so having one is exactly what "photo is
  // active" means, here and on the server.
  const isPhotoActive = Boolean(selfiePreviewUri);

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
            <View
              className="h-full w-1/6 items-center justify-center overflow-hidden rounded-md"
              style={{ backgroundColor: bannerIconBackground }}
            >
              {selfiePreviewUri ? (
                <Image source={{ uri: selfiePreviewUri }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <Text className={isTabletLayout ? "text-4xl" : "text-3xl"}>{teamIcon}</Text>
              )}
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
            borderColor: isTeamNameFocused ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
            backgroundColor: EXPEDITION_THEME.panel,
            color: EXPEDITION_THEME.textPrimary,
          }}
          value={teamName}
          onChangeText={onTeamNameChange}
          onFocus={() => setIsTeamNameFocused(true)}
          onBlur={() => setIsTeamNameFocused(false)}
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
          {text.avatarLabel}
        </Text>
        <Text className="mt-1 text-xs" style={{ color: EXPEDITION_THEME.textMuted }}>
          {text.avatarHint}
        </Text>

        {/* No minHeight on either card: it padded the taller one out with dead
            space under the label. The row stretches its children by default, so
            the two still match — the content just decides how tall that is.

            Two cards rather than tabs: a tab would introduce a mode the rest of
            this editor does not have, and hide whichever half is not open. Here
            both choices stay on screen and the active one is simply the one
            wearing the accent ring — the same grammar as the colour swatches
            above. Picking one clears the other, because the banner can only
            draw a single avatar. */}
        <View className="mt-2 flex-row gap-3">
          <Pressable
            className={`flex-1 items-center justify-center rounded-2xl border px-3 py-3 ${MOBILE_UX_TOKENS.activePressClass}`}
            style={{
              borderWidth: isPhotoActive ? 2 : 1,
              borderColor: isPhotoActive ? EXPEDITION_THEME.accentStrong : EXPEDITION_THEME.border,
              backgroundColor: isPhotoActive ? EXPEDITION_THEME.panelStrong : EXPEDITION_THEME.panel,
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isPhotoActive }}
            onPress={onOpenSelfieCapture}
          >
            {selfiePreviewUri ? (
              <Image
                source={{ uri: selfiePreviewUri }}
                className="rounded-xl border"
                style={{
                  width: isTabletLayout ? 64 : 52,
                  height: isTabletLayout ? 64 : 52,
                  borderColor: EXPEDITION_THEME.border,
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                className="items-center justify-center rounded-full"
                style={{
                  width: isTabletLayout ? 52 : 44,
                  height: isTabletLayout ? 52 : 44,
                  backgroundColor: EXPEDITION_THEME.accent,
                }}
              >
                <Text style={{ fontSize: isTabletLayout ? 24 : 20 }}>📸</Text>
              </View>
            )}
            <Text
              className="mt-2 text-center text-sm font-bold"
              style={{ color: EXPEDITION_THEME.textPrimary }}
              numberOfLines={1}
            >
              {selfiePreviewUri ? text.retakeSelfie : text.photoOption}
            </Text>
          </Pressable>

          <Pressable
            className={`flex-1 items-center justify-center rounded-2xl border px-3 py-3 ${MOBILE_UX_TOKENS.activePressClass}`}
            style={{
              borderWidth: isPhotoActive ? 1 : 2,
              borderColor: isPhotoActive ? EXPEDITION_THEME.border : EXPEDITION_THEME.accentStrong,
              backgroundColor: isPhotoActive ? EXPEDITION_THEME.panel : EXPEDITION_THEME.panelStrong,
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: !isPhotoActive }}
            onPress={onOpenIconPicker}
          >
            <Text style={{ fontSize: isTabletLayout ? 44 : 36 }}>{teamIcon}</Text>
            <Text
              className="mt-2 text-center text-sm font-bold"
              style={{ color: EXPEDITION_THEME.textPrimary }}
              numberOfLines={1}
            >
              {text.emojiOption}
            </Text>
          </Pressable>
        </View>

        {selfieUploadError ? (
          <Text className="mt-2 text-xs" style={{ color: EXPEDITION_THEME.danger }}>
            {selfieUploadError}
          </Text>
        ) : null}
        {showLanguagePicker ? (
          <>
            <Text className="mt-3 text-xs uppercase tracking-widest" style={{ color: EXPEDITION_THEME.textSubtle }}>
              {text.languageLabel}
            </Text>
            <Pressable
              className={`mt-2 flex-row items-center justify-between rounded-2xl border px-4 ${MOBILE_UX_TOKENS.activePressClass}`}
              style={{
                minHeight: MOBILE_UX_TOKENS.minTouchTarget,
                borderColor: EXPEDITION_THEME.border,
                backgroundColor: EXPEDITION_THEME.panel,
              }}
              onPress={onOpenLanguagePicker}
            >
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 22 }}>{languageFlag}</Text>
                <Text className="text-sm font-semibold" style={{ color: EXPEDITION_THEME.textPrimary }}>
                  {languageName}
                </Text>
              </View>
              <Text className="text-lg" style={{ color: EXPEDITION_THEME.textSubtle }}>
                ›
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <View className="mt-4">
        <Pressable
          className={`rounded-2xl px-3 py-3 ${MOBILE_UX_TOKENS.activePressClass}`}
          style={{
            minHeight: MOBILE_UX_TOKENS.minTouchTarget,
            backgroundColor: EXPEDITION_THEME.accent,
            opacity: canSave ? 1 : MOBILE_UX_TOKENS.disabledOpacity,
          }}
          onPress={() => void onSave()}
          disabled={!canSave}
        >
          <Text className="text-center font-semibold" style={{ color: EXPEDITION_THEME.background }}>
            {isSaving ? text.startingAction : text.startAction}
          </Text>
        </Pressable>
      </View>

      {saveMessage && (
        <MobileFeedbackBanner
          message={saveMessage}
          tone={saveMessageTone === "error" ? "error" : "success"}
          style={{ marginTop: 12 }}
        />
      )}

      {blockMessage && (
        <MobileFeedbackBanner message={blockMessage} tone="error" style={{ marginTop: 12 }} />
      )}
    </View>
  );
}
