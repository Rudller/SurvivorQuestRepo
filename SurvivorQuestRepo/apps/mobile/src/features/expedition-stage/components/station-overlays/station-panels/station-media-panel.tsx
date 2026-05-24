import { useState, type ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SvgUri } from "react-native-svg";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { MOBILE_UX_TOKENS } from "../../../../../shared/ui/ux-tokens";
import {
  QUIZ_BRAIN_ICON_URI,
  TEXT_PUZZLE_MAX_ATTEMPTS,
  caesarShift,
  isGuessableHangmanCharacter,
} from "../puzzle-helpers";
import type { StationTestType } from "../types";
import { AttemptsIndicator } from "./shared-ui";

const AUDIO_PLAY_ICON_SVG_URI =
  "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/player-play.svg";
const AUDIO_REPLAY_ICON_SVG_URI =
  "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/player-skip-back.svg";
const AUDIO_PAUSE_ICON_SVG_URI =
  "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/player-pause.svg";

type StationMediaPanelProps = {
  stationId: string;
  stationType: StationTestType;
  viewportHeight: number;
  stationMediaHeight: number;
  requiresCode: boolean;
  isNumericCodeStation: boolean;
  renderedStationMedia: ReactNode;
  shouldShowQuizFallbackGraphic: boolean;
  stationImageUri?: string;
  quizIconLoadFailed: boolean;
  onQuizIconLoadError: () => void;
  onStationImageLoadError: () => void;
  caesarMedia: {
    decodedText: string;
    shiftValue: number;
    attemptsLeft: number;
    shiftHintLabel: string;
    attemptsLabel: string;
  };
  hangmanMedia: {
    secret: string;
    guessedLetters: Set<string>;
  };
  audioOverlay?: {
    hasPlaybackStarted: boolean;
    isPlayDisabled: boolean;
    isStopDisabled: boolean;
    isPlaying: boolean;
    playLabel: string;
    replayLabel: string;
    stopLabel: string;
    statusReadyLabel: string;
    statusPlayingLabel: string;
    statusDisabledLabel: string;
    onPlay: () => void;
    onStop: () => void;
  };
};

export function StationMediaPanel({
  stationId,
  stationType,
  viewportHeight,
  stationMediaHeight,
  requiresCode,
  isNumericCodeStation,
  renderedStationMedia,
  shouldShowQuizFallbackGraphic,
  stationImageUri,
  quizIconLoadFailed,
  onQuizIconLoadError,
  onStationImageLoadError,
  caesarMedia,
  hangmanMedia,
  audioOverlay,
}: StationMediaPanelProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletOverlay = adaptiveLayout.isTablet;
  const isCaesarStation = stationType === "caesar-cipher";
  const isHangmanStation = stationType === "hangman";
  const isSimonStation = stationType === "simon";
  const isAudioQuizStation = stationType === "audio-quiz";
  const caesarEncoded = caesarShift(caesarMedia.decodedText, caesarMedia.shiftValue);
  const [hangmanWordContainerWidth, setHangmanWordContainerWidth] = useState(0);
  const hangmanWords = hangmanMedia.secret.split(/\s+/).filter(Boolean);
  const hangmanDisplayWords = hangmanWords.length > 0 ? hangmanWords : [hangmanMedia.secret];
  const hangmanBaseFontSize = adaptiveLayout.fs(isTabletOverlay ? 48 : 24, 22, 56);
  const hangmanBaseLineHeight = adaptiveLayout.s(isTabletOverlay ? 52 : 28, 26, 60);
  const hangmanBaseLetterGap = adaptiveLayout.s(isTabletOverlay ? 10 : 4, 3, 14);
  const hangmanRowGap = adaptiveLayout.s(isTabletOverlay ? 12 : 5, 4, 16);
  const audioOverlayControlHitSize = adaptiveLayout.s(
    isTabletOverlay ? 124 : 72,
    64,
    132,
  );
  const audioOverlayIconSize = adaptiveLayout.s(
    isTabletOverlay ? 98 : 46,
    40,
    106,
  );
  return (
    <View
      className={`${isNumericCodeStation ? "mt-0.5" : "mt-1"} w-full overflow-hidden rounded-2xl border`}
      style={{
        ...(requiresCode
          ? { flex: 1, minHeight: Math.max(140, Math.round(viewportHeight * 0.24)) }
          : isSimonStation
            ? { minHeight: stationMediaHeight }
            : { height: stationMediaHeight }),
        borderColor: EXPEDITION_THEME.border,
        backgroundColor: EXPEDITION_THEME.panelMuted,
      }}
    >
      {isCaesarStation ? (
        <View
          className="flex-1"
          style={{
            paddingHorizontal: adaptiveLayout.s(isTabletOverlay ? 16 : 10, 8, 22),
            paddingTop: adaptiveLayout.s(isTabletOverlay ? 16 : 8, 6, 22),
            paddingBottom: adaptiveLayout.s(isTabletOverlay ? 12 : 8, 6, 18),
          }}
        >
          <View className="flex-1 items-center justify-center">
            <Text
              className="text-center font-black tracking-[5px]"
              style={{
                color: EXPEDITION_THEME.accentStrong,
                fontSize: adaptiveLayout.fs(isTabletOverlay ? 72 : 32, 30, 84),
                lineHeight: adaptiveLayout.s(isTabletOverlay ? 76 : 36, 34, 88),
              }}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
              numberOfLines={2}
            >
              {caesarEncoded}
            </Text>
            <Text
              className="text-center font-semibold"
              style={{
                color: EXPEDITION_THEME.textMuted,
                marginTop: adaptiveLayout.s(isTabletOverlay ? 12 : 6, 5, 16),
                fontSize: adaptiveLayout.fs(isTabletOverlay ? 24 : 12, 11, 28),
              }}
            >
              {caesarMedia.shiftHintLabel}
            </Text>
          </View>
          <AttemptsIndicator
            label={caesarMedia.attemptsLabel}
            attemptsLeft={caesarMedia.attemptsLeft}
            maxAttempts={TEXT_PUZZLE_MAX_ATTEMPTS}
            align="center"
          />
        </View>
      ) : isHangmanStation ? (
        <View
          className="flex-1"
          style={{
            paddingHorizontal: adaptiveLayout.s(isTabletOverlay ? 16 : 10, 8, 22),
            paddingTop: adaptiveLayout.s(isTabletOverlay ? 16 : 8, 6, 22),
            paddingBottom: adaptiveLayout.s(isTabletOverlay ? 12 : 8, 6, 18),
          }}
        >
          <View
            className="flex-1 items-center justify-center"
            onLayout={(event) => {
              const nextWidth = Math.round(event.nativeEvent.layout.width);
              setHangmanWordContainerWidth((currentWidth) =>
                Math.abs(currentWidth - nextWidth) > 1 ? nextWidth : currentWidth,
              );
            }}
          >
            <View className="items-center justify-center" style={{ rowGap: hangmanRowGap }}>
              {hangmanDisplayWords.map((word, wordIndex) => {
                const characters = Array.from(word).map((character) => {
                  if (!isGuessableHangmanCharacter(character)) {
                    return character;
                  }
                  return hangmanMedia.guessedLetters.has(character) ? character : "_";
                });
                const safeCharacterCount = Math.max(1, characters.length);
                const availableWidth = Math.max(120, hangmanWordContainerWidth);
                const fittedLetterGap = Math.max(1, Math.min(hangmanBaseLetterGap, Math.floor(availableWidth / safeCharacterCount * 0.16)));
                const fittedFontSize = Math.max(
                  adaptiveLayout.fs(isTabletOverlay ? 20 : 14, 12, 24),
                  Math.min(
                    hangmanBaseFontSize,
                    Math.floor((availableWidth - fittedLetterGap * (safeCharacterCount - 1)) / safeCharacterCount),
                  ),
                );
                const fittedLineHeight = Math.max(
                  Math.ceil(fittedFontSize * 1.16),
                  Math.round(hangmanBaseLineHeight * (fittedFontSize / hangmanBaseFontSize)),
                );

                return (
                  <View
                    key={`${stationId}-hangman-word-${wordIndex}`}
                    className="flex-row justify-center"
                    style={{ columnGap: fittedLetterGap, maxWidth: "100%" }}
                  >
                    {characters.map((character, characterIndex) => (
                      <Text
                        key={`${stationId}-hangman-char-${wordIndex}-${characterIndex}`}
                        className="font-black"
                        style={{
                          color: EXPEDITION_THEME.accentStrong,
                          fontSize: fittedFontSize,
                          lineHeight: fittedLineHeight,
                        }}
                      >
                        {character}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      ) : renderedStationMedia ? (
        renderedStationMedia
      ) : shouldShowQuizFallbackGraphic ? (
        <View className="flex-1 items-center justify-center">
          {!quizIconLoadFailed ? (
            <Image
              source={{ uri: QUIZ_BRAIN_ICON_URI }}
              style={{ width: "62%", height: "62%", tintColor: "#ffffff" }}
              resizeMode="contain"
              onError={onQuizIconLoadError}
            />
          ) : (
          <Text style={{ fontSize: adaptiveLayout.fs(isTabletOverlay ? 36 : 26, 24, 44) }}>🧠</Text>
          )}
        </View>
      ) : stationImageUri ? (
        <Image
          source={{ uri: stationImageUri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={onStationImageLoadError}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: adaptiveLayout.fs(isTabletOverlay ? 30 : 22, 20, 38) }}>📍</Text>
        </View>
      )}
      {isAudioQuizStation && audioOverlay ? (
        <View className="absolute inset-0 items-center justify-center px-3">
          <View className="flex-row items-center" style={{ gap: adaptiveLayout.s(isTabletOverlay ? 16 : 8, 6, 24) }}>
            <Pressable
              className={`items-center justify-center rounded-2xl px-2 py-2 ${MOBILE_UX_TOKENS.activePressClass}`}
              style={{
                width: audioOverlayControlHitSize,
                height: audioOverlayControlHitSize,
                minWidth: MOBILE_UX_TOKENS.minTouchTarget,
                minHeight: MOBILE_UX_TOKENS.minTouchTarget,
                backgroundColor: "rgba(9, 12, 18, 0.62)",
                opacity: audioOverlay.isPlayDisabled ? MOBILE_UX_TOKENS.disabledOpacity : 1,
              }}
              onPress={audioOverlay.onPlay}
              disabled={audioOverlay.isPlayDisabled}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={audioOverlay.hasPlaybackStarted ? audioOverlay.replayLabel : audioOverlay.playLabel}
              accessibilityState={{ disabled: audioOverlay.isPlayDisabled, busy: audioOverlay.isPlaying }}
            >
              <SvgUri
                uri={audioOverlay.hasPlaybackStarted ? AUDIO_REPLAY_ICON_SVG_URI : AUDIO_PLAY_ICON_SVG_URI}
                width={audioOverlayIconSize}
                height={audioOverlayIconSize}
                color="#ffffff"
                fill="#ffffff"
                stroke="#ffffff"
              />
              <Text
                className="mt-1 text-center font-semibold"
                style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletOverlay ? 11 : 9, 8, 13) }}
              >
                {audioOverlay.hasPlaybackStarted ? audioOverlay.replayLabel : audioOverlay.playLabel}
              </Text>
            </Pressable>
            {audioOverlay.hasPlaybackStarted ? (
              <Pressable
                className={`items-center justify-center rounded-2xl px-2 py-2 ${MOBILE_UX_TOKENS.activePressClass}`}
                style={{
                  width: audioOverlayControlHitSize,
                  height: audioOverlayControlHitSize,
                  minWidth: MOBILE_UX_TOKENS.minTouchTarget,
                  minHeight: MOBILE_UX_TOKENS.minTouchTarget,
                  backgroundColor: "rgba(9, 12, 18, 0.62)",
                  opacity: audioOverlay.isStopDisabled ? MOBILE_UX_TOKENS.disabledOpacity : 1,
                }}
                onPress={audioOverlay.onStop}
                disabled={audioOverlay.isStopDisabled}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={audioOverlay.stopLabel}
                accessibilityState={{ disabled: audioOverlay.isStopDisabled, busy: false }}
              >
                <SvgUri
                  uri={AUDIO_PAUSE_ICON_SVG_URI}
                  width={audioOverlayIconSize}
                  height={audioOverlayIconSize}
                  color="#ffffff"
                  fill="#ffffff"
                  stroke="#ffffff"
                />
                <Text
                  className="mt-1 text-center font-semibold"
                  style={{ color: EXPEDITION_THEME.textPrimary, fontSize: adaptiveLayout.fs(isTabletOverlay ? 11 : 9, 8, 13) }}
                >
                  {audioOverlay.stopLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
