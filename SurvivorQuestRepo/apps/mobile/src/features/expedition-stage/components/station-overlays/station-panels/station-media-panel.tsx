import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Image, Pressable, Text, View } from "react-native";
import { SvgUri } from "react-native-svg";

import { EXPEDITION_THEME } from "../../../../onboarding/model/constants";
import { useAdaptiveLayout } from "../../../../../shared/layout/use-adaptive-layout";
import { MOBILE_UX_TOKENS } from "../../../../../shared/ui/ux-tokens";
import { ChamferedContentFrame } from "../../../../../shared/ui/chamfered-panel";
import {
  QUIZ_BRAIN_ICON_URI,
  TEXT_PUZZLE_MAX_ATTEMPTS,
  caesarShift,
  isGuessableHangmanCharacter,
} from "../puzzle-helpers";
import type { StationTestType } from "../types";
import { AttemptsIndicator } from "./shared-ui";
import { PhotoTaskInlineCamera } from "./photo-task-inline-camera";

const AUDIO_PLAY_ICON_SVG_URI =
  "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/player-play.svg";
const AUDIO_REPLAY_ICON_SVG_URI =
  "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/player-skip-back.svg";
const AUDIO_PAUSE_ICON_SVG_URI =
  "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/player-pause.svg";
const CAMERA_ICON_SVG_URI =
  "https://unpkg.com/@tabler/icons@3.34.1/icons/filled/camera.svg";

// Ryzykanci frames the photo the same way the screen's top bar is framed:
// corners cut at 45 degrees, same cut length, same heavy outline. The frame is
// drawn over the viewfinder rather than around it, so the camera fills the box
// edge to edge instead of sitting inset inside the outline.
function PhotoTaskFrame({ chamfered, children }: { chamfered: boolean; children: ReactNode }) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletLayout = adaptiveLayout.isTablet;

  if (!chamfered) {
    return <>{children}</>;
  }

  return (
    <ChamferedContentFrame
      cut={adaptiveLayout.s(isTabletLayout ? 28 : 18, 16, 32)}
      borderColor={EXPEDITION_THEME.border}
      borderWidth={adaptiveLayout.s(isTabletLayout ? 3 : 2, 2, 4)}
      baseColor={EXPEDITION_THEME.background}
      surfaceColor={EXPEDITION_THEME.panel}
      style={{ flex: 1 }}
    >
      {children}
    </ChamferedContentFrame>
  );
}

type StationMediaPanelProps = {
  minimalChrome?: boolean;
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
  photoTaskCapture?: {
    canCapture: boolean;
    previewUri: string | null;
    onOpenCamera: () => void;
    takePhotoLabel: string;
    retakePhotoLabel: string;
    isCaptureActive: boolean;
    isUploading: boolean;
    uploadError: string | null;
    cameraAccessTitle: string;
    cameraAccessDescription: string;
    enableCameraLabel: string;
    switchCameraLabel: string;
    onCancelCapture: () => void;
    onConfirmCapture: (uri: string) => void;
  };
};

export function StationMediaPanel({
  minimalChrome = false,
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
  photoTaskCapture,
}: StationMediaPanelProps) {
  const adaptiveLayout = useAdaptiveLayout();
  const isTabletOverlay = adaptiveLayout.isTablet;
  const isCaesarStation = stationType === "caesar-cipher";
  const isPhotoTaskStation = stationType === "photo-task";
  const isHangmanStation = stationType === "hangman";
  const isAudioQuizStation = stationType === "audio-quiz";
  const isMiniSudokuStation = stationType === "mini-sudoku";
  const isWordleStation = stationType === "wordle";
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
  const photoTaskButtonSize = adaptiveLayout.s(
    photoTaskCapture?.previewUri ? (isTabletOverlay ? 64 : 44) : isTabletOverlay ? 96 : 64,
    40,
    108,
  );
  const photoTaskIconSize = adaptiveLayout.s(
    photoTaskCapture?.previewUri ? (isTabletOverlay ? 28 : 20) : isTabletOverlay ? 44 : 30,
    18,
    50,
  );
  const photoTaskLabelFontSize = adaptiveLayout.fs(isTabletOverlay ? 15 : 12, 11, 18);
  const photoTaskPulseAnimation = useRef(new Animated.Value(0)).current;
  const isPhotoTaskCaptureIdle =
    isPhotoTaskStation &&
    Boolean(photoTaskCapture?.canCapture) &&
    !photoTaskCapture?.previewUri &&
    !photoTaskCapture?.isCaptureActive;

  useEffect(() => {
    if (!isPhotoTaskCaptureIdle) {
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(photoTaskPulseAnimation, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(photoTaskPulseAnimation, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [isPhotoTaskCaptureIdle, photoTaskPulseAnimation]);

  const photoTaskPulseRingStyle = {
    opacity: photoTaskPulseAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [
      {
        scale: photoTaskPulseAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }),
      },
    ],
  };
  return (
    <View
      className={`${minimalChrome ? "" : isNumericCodeStation ? "mt-0.5" : "mt-1"} w-full overflow-hidden${minimalChrome ? "" : " rounded-2xl border"}`}
      style={{
        ...(requiresCode
          ? minimalChrome
            ? {
                // In Ryzykanci the photo absorbs the remaining height. The
                // input and keyboard below keep a stable, fixed layout.
                flexGrow: 1,
                flexBasis: 0,
                flexShrink: 1,
                minHeight: 0,
              }
            : { flex: 1, minHeight: Math.max(140, Math.round(viewportHeight * 0.24)) }
          : isMiniSudokuStation
            // Flex + minHeight (instead of a fixed height) so the grid
            // shrinks when the station description needs room, and grows
            // back up to fill the available space otherwise.
            ? { flex: 1, minHeight: Math.max(160, Math.round(viewportHeight * 0.22)) }
            : isWordleStation
              // WordleMediaBoard measures this flexible box and fits all six
              // answer rows to both its width and height. Keep only a small
              // floor so a longer description can reclaim space without the
              // board forcing the input/keyboard below the clipped edge.
              ? { flex: 1, minHeight: Math.max(80, Math.round(viewportHeight * 0.1)) }
              : isHangmanStation
                // Same reasoning as mini-sudoku: the word display is already
                // width-driven (font size fitted from measured width above),
                // so it just needs to flex-fill whatever height is left after
                // the description, not claim a fixed guessed height.
                ? { flex: 1, minHeight: Math.max(120, Math.round(viewportHeight * 0.16)) }
                : { height: stationMediaHeight }),
        // Ryzykanci runs the flex branch above (photo tasks pass requiresCode),
        // where the viewfinder would otherwise take every pixel left in the
        // card — or collapse to nothing under a long text. The task
        // description below it is the whole task, so bound the camera on both
        // sides and let the description keep the rest.
        ...(isPhotoTaskStation && minimalChrome
          ? {
              minHeight: Math.max(140, Math.round(viewportHeight * 0.18)),
              maxHeight: Math.max(180, Math.round(viewportHeight * 0.42)),
            }
          : {}),
        // Ryzykanci: the ciphertext box gives way instead of holding a fixed
        // height, so the input and keyboard below — which do not shrink — keep
        // their natural size and end level with the bottom panel. With the
        // fixed height the last keyboard row ran under it and got clipped.
        // The cipher text itself is already fitted to its box
        // (adjustsFontSizeToFit), so it survives being squeezed.
        ...(isCaesarStation && minimalChrome
          ? {
              height: undefined,
              flexGrow: 1,
              flexBasis: 0,
              flexShrink: 1,
              minHeight: Math.max(90, Math.round(viewportHeight * 0.12)),
            }
          : {}),
        borderColor: minimalChrome ? "transparent" : EXPEDITION_THEME.border,
        backgroundColor: minimalChrome ? "transparent" : EXPEDITION_THEME.panelMuted,
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
      ) : isPhotoTaskStation && photoTaskCapture ? (
        <PhotoTaskFrame chamfered={minimalChrome}>
          {photoTaskCapture.isCaptureActive ? (
            <PhotoTaskInlineCamera
              showCloseButton={!minimalChrome}
              isUploading={photoTaskCapture.isUploading}
              uploadError={photoTaskCapture.uploadError}
              cameraAccessTitle={photoTaskCapture.cameraAccessTitle}
              cameraAccessDescription={photoTaskCapture.cameraAccessDescription}
              enableCameraLabel={photoTaskCapture.enableCameraLabel}
              switchCameraLabel={photoTaskCapture.switchCameraLabel}
              onCancel={photoTaskCapture.onCancelCapture}
              onConfirm={photoTaskCapture.onConfirmCapture}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              {photoTaskCapture.previewUri ? (
                <Image
                  source={{ uri: photoTaskCapture.previewUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : null}
              {photoTaskCapture.canCapture ? (
                photoTaskCapture.previewUri ? (
                  <Pressable
                    className="absolute bottom-2 right-2 items-center justify-center rounded-full border-4 active:opacity-90"
                    style={{
                      width: photoTaskButtonSize,
                      height: photoTaskButtonSize,
                      minWidth: MOBILE_UX_TOKENS.minTouchTarget,
                      minHeight: MOBILE_UX_TOKENS.minTouchTarget,
                      borderColor: EXPEDITION_THEME.accent,
                      backgroundColor: EXPEDITION_THEME.panelStrong,
                    }}
                    onPress={photoTaskCapture.onOpenCamera}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={photoTaskCapture.retakePhotoLabel}
                  >
                    <SvgUri
                      uri={CAMERA_ICON_SVG_URI}
                      width={photoTaskIconSize}
                      height={photoTaskIconSize}
                      color={EXPEDITION_THEME.accent}
                      fill={EXPEDITION_THEME.accent}
                      stroke={EXPEDITION_THEME.accent}
                    />
                  </Pressable>
                ) : (
                  <View className="items-center" style={{ rowGap: adaptiveLayout.s(8, 6, 12) }}>
                    <View
                      style={{
                        width: photoTaskButtonSize,
                        height: photoTaskButtonSize,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Animated.View
                        pointerEvents="none"
                        className="absolute rounded-full border-2"
                        style={[
                          {
                            width: photoTaskButtonSize,
                            height: photoTaskButtonSize,
                            borderColor: EXPEDITION_THEME.accent,
                          },
                          photoTaskPulseRingStyle,
                        ]}
                      />
                      <Pressable
                        className="items-center justify-center rounded-full border-4 active:opacity-90"
                        style={{
                          width: photoTaskButtonSize,
                          height: photoTaskButtonSize,
                          minWidth: MOBILE_UX_TOKENS.minTouchTarget,
                          minHeight: MOBILE_UX_TOKENS.minTouchTarget,
                          borderColor: EXPEDITION_THEME.accent,
                          backgroundColor: EXPEDITION_THEME.panelStrong,
                        }}
                        onPress={photoTaskCapture.onOpenCamera}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={photoTaskCapture.takePhotoLabel}
                      >
                        <SvgUri
                          uri={CAMERA_ICON_SVG_URI}
                          width={photoTaskIconSize}
                          height={photoTaskIconSize}
                          color={EXPEDITION_THEME.accent}
                          fill={EXPEDITION_THEME.accent}
                          stroke={EXPEDITION_THEME.accent}
                        />
                      </Pressable>
                    </View>
                    <Text
                      className="text-center font-semibold"
                      style={{ color: EXPEDITION_THEME.accent, fontSize: photoTaskLabelFontSize }}
                    >
                      {photoTaskCapture.takePhotoLabel}
                    </Text>
                  </View>
                )
              ) : null}
            </View>
          )}
        </PhotoTaskFrame>
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
            {/* START / STOP toggle */}
            <Pressable
              className={`items-center justify-center rounded-2xl px-2 py-2 ${MOBILE_UX_TOKENS.activePressClass}`}
              style={{
                width: audioOverlayControlHitSize,
                height: audioOverlayControlHitSize,
                minWidth: MOBILE_UX_TOKENS.minTouchTarget,
                minHeight: MOBILE_UX_TOKENS.minTouchTarget,
                backgroundColor: "rgba(9, 12, 18, 0.62)",
                opacity: (audioOverlay.isPlaying ? audioOverlay.isStopDisabled : audioOverlay.isPlayDisabled)
                  ? MOBILE_UX_TOKENS.disabledOpacity
                  : 1,
              }}
              onPress={audioOverlay.isPlaying || audioOverlay.hasPlaybackStarted ? audioOverlay.onStop : audioOverlay.onPlay}
              disabled={audioOverlay.isPlaying || audioOverlay.hasPlaybackStarted ? audioOverlay.isStopDisabled : audioOverlay.isPlayDisabled}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={audioOverlay.isPlaying ? audioOverlay.stopLabel : audioOverlay.playLabel}
              accessibilityState={{ disabled: audioOverlay.isPlaying || audioOverlay.hasPlaybackStarted ? audioOverlay.isStopDisabled : audioOverlay.isPlayDisabled, busy: audioOverlay.isPlaying }}
            >
              <SvgUri
                key={audioOverlay.isPlaying ? "pause" : "play"}
                uri={audioOverlay.isPlaying ? AUDIO_PAUSE_ICON_SVG_URI : AUDIO_PLAY_ICON_SVG_URI}
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
                {audioOverlay.isPlaying ? audioOverlay.stopLabel : audioOverlay.playLabel}
              </Text>
            </Pressable>
            {/* REPLAY — visible after first playback */}
            {audioOverlay.hasPlaybackStarted ? (
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
                accessibilityLabel={audioOverlay.replayLabel}
                accessibilityState={{ disabled: audioOverlay.isPlayDisabled }}
              >
                <SvgUri
                  uri={AUDIO_REPLAY_ICON_SVG_URI}
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
                  {audioOverlay.replayLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
