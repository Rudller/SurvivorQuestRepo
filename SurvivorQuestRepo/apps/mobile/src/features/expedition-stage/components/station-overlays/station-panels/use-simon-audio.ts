import { useCallback, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

type UseSimonAudioArgs = {
  toneAssetByButton: Record<string, number>;
};

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

export function useSimonAudio({ toneAssetByButton }: UseSimonAudioArgs) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const currentButtonRef = useRef<string | null>(null);
  const sequenceRunRef = useRef(0);
  const [isSimonAudioReady, setIsSimonAudioReady] = useState(false);

  const ensurePlayer = useCallback(
    (buttonId: string) => {
      const toneAssetId = toneAssetByButton[buttonId];
      if (!toneAssetId) {
        return null;
      }

      let player = playerRef.current;
      if (!player) {
        player = createAudioPlayer(toneAssetId, {
          updateInterval: 250,
          keepAudioSessionActive: true,
        });
        playerRef.current = player;
        currentButtonRef.current = buttonId;
        return player;
      }

      if (currentButtonRef.current !== buttonId) {
        try {
          player.pause();
        } catch {
          // noop
        }
        try {
          player.replace(toneAssetId);
          currentButtonRef.current = buttonId;
        } catch {
          removePlayer(player);
          player = createAudioPlayer(toneAssetId, {
            updateInterval: 250,
            keepAudioSessionActive: true,
          });
          playerRef.current = player;
          currentButtonRef.current = buttonId;
        }
      }

      return player;
    },
    [toneAssetByButton],
  );

  const prepareSimonAudio = useCallback(async () => {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldRouteThroughEarpiece: false,
      shouldPlayInBackground: false,
    }).catch(() => undefined);
    setIsSimonAudioReady(true);
  }, []);

  const playTone = useCallback(
    async (buttonId: string) => {
      const player = ensurePlayer(buttonId);
      if (!player) {
        return;
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
    [ensurePlayer],
  );

  const stopSequenceAudio = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }
    try {
      player.pause();
    } catch {
      // noop
    }
  }, []);

  const stopAllSimonAudio = useCallback(() => {
    sequenceRunRef.current += 1;
    const player = playerRef.current;
    if (!player) {
      return;
    }
    try {
      player.pause();
    } catch {
      // noop
    }
  }, []);

  const playSequenceTone = useCallback(
    async (buttonId: string, runId: number) => {
      if (sequenceRunRef.current !== runId) {
        return;
      }
      await playTone(buttonId);
    },
    [playTone],
  );

  const playInputTone = useCallback(
    async (buttonId: string) => {
      await playTone(buttonId);
    },
    [playTone],
  );

  const startSequenceRun = useCallback(() => {
    sequenceRunRef.current += 1;
    stopSequenceAudio();
    return sequenceRunRef.current;
  }, [stopSequenceAudio]);

  const releaseSimonAudio = useCallback(() => {
    sequenceRunRef.current += 1;
    const player = playerRef.current;
    playerRef.current = null;
    currentButtonRef.current = null;
    setIsSimonAudioReady(false);
    if (player) {
      removePlayer(player);
    }
  }, []);

  return {
    isSimonAudioReady,
    prepareSimonAudio,
    playSequenceTone,
    playInputTone,
    startSequenceRun,
    stopSequenceAudio,
    stopAllSimonAudio,
    releaseSimonAudio,
  };
}
