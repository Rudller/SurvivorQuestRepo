import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

const CORRECT_SCAN_ASSET: number = require("../assets/qr-scan-sfx/correct.wav");
const INCORRECT_SCAN_ASSET: number = require("../assets/qr-scan-sfx/incorrect.wav");
const STATION_OPENED_ASSET: number = CORRECT_SCAN_ASSET;

function removePlayer(player: AudioPlayer) {
  try {
    player.pause();
  } catch {
    // noop
  }
  try {
    player.remove();
  } catch {
    // noop
  }
}

export function useQrScanFeedbackSound() {
  const correctPlayerRef = useRef<AudioPlayer | null>(null);
  const incorrectPlayerRef = useRef<AudioPlayer | null>(null);
  const stationOpenedPlayerRef = useRef<AudioPlayer | null>(null);
  // A ref holding the in-flight setup promise (rather than a boolean flag
  // flipped before the await resolves) so overlapping playCorrect/playIncorrect
  // calls made while setup is still pending await the SAME promise instead of
  // racing ahead of a not-yet-configured audio session.
  const audioModeReadyPromiseRef = useRef<Promise<void> | null>(null);

  const ensureAudioMode = useCallback(() => {
    if (!audioModeReadyPromiseRef.current) {
      audioModeReadyPromiseRef.current = setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: "duckOthers",
        shouldRouteThroughEarpiece: false,
        shouldPlayInBackground: false,
      })
        .then(() => undefined)
        .catch(() => undefined);
    }
    return audioModeReadyPromiseRef.current;
  }, []);

  const playAsset = useCallback(
    async (playerRef: MutableRefObject<AudioPlayer | null>, assetId: number) => {
      await ensureAudioMode();

      let player = playerRef.current;
      if (!player) {
        player = createAudioPlayer(assetId, { updateInterval: 250 });
        playerRef.current = player;
      }

      player.volume = 1;
      try {
        player.pause();
      } catch {
        // noop
      }
      try {
        await player.seekTo(0);
      } catch {
        // noop
      }
      try {
        player.play();
      } catch {
        // noop
      }
    },
    [ensureAudioMode],
  );

  const playCorrect = useCallback(() => {
    void playAsset(correctPlayerRef, CORRECT_SCAN_ASSET);
  }, [playAsset]);

  const playIncorrect = useCallback(() => {
    void playAsset(incorrectPlayerRef, INCORRECT_SCAN_ASSET);
  }, [playAsset]);

  const playStationOpened = useCallback(() => {
    void playAsset(stationOpenedPlayerRef, STATION_OPENED_ASSET);
  }, [playAsset]);

  useEffect(() => {
    return () => {
      if (correctPlayerRef.current) {
        removePlayer(correctPlayerRef.current);
        correctPlayerRef.current = null;
      }
      if (incorrectPlayerRef.current) {
        removePlayer(incorrectPlayerRef.current);
        incorrectPlayerRef.current = null;
      }
      if (stationOpenedPlayerRef.current) {
        removePlayer(stationOpenedPlayerRef.current);
        stationOpenedPlayerRef.current = null;
      }
    };
  }, []);

  return { playCorrect, playIncorrect, playStationOpened };
}
