import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";

import type { StationTestType } from "../types";
import { normalizeAudioQuizUrl, resolveAudioQuizSourceError } from "./quiz-audio-playback";

type UseAudioQuizPlaybackArgs = {
  stationType: StationTestType | null | undefined;
  quizAudioUrl: string | null | undefined;
  text: {
    audioSourceMissing: string;
    audioLoadFailed: string;
    audioPlayFailed: string;
  };
};

export function useAudioQuizPlayback({ stationType, quizAudioUrl, text }: UseAudioQuizPlaybackArgs) {
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasAudioPlaybackStarted, setHasAudioPlaybackStarted] = useState(false);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioPlaybackSubscriptionRef = useRef<{ remove: () => void } | null>(null);

  const resetAudioPlaybackState = useCallback(() => {
    setAudioLoadError(null);
    setIsAudioLoading(false);
    setIsAudioPlaying(false);
    setHasAudioPlaybackStarted(false);
  }, []);

  const unloadAudioSound = useCallback(async () => {
    const activePlayer = audioPlayerRef.current;
    audioPlayerRef.current = null;
    setIsAudioPlaying(false);
    if (audioPlaybackSubscriptionRef.current) {
      audioPlaybackSubscriptionRef.current.remove();
      audioPlaybackSubscriptionRef.current = null;
    }
    if (!activePlayer) {
      return;
    }

    try {
      activePlayer.pause();
    } catch {
      // noop
    }

    try {
      activePlayer.remove();
    } catch {
      // noop
    }
  }, []);

  const loadAudioSound = useCallback(
    async (audioUrl: string) => {
      const sourceError = resolveAudioQuizSourceError(audioUrl, text.audioSourceMissing);
      if (sourceError) {
        setAudioLoadError(sourceError);
        setIsAudioLoading(false);
        return null;
      }
      const normalizedAudioUrl = normalizeAudioQuizUrl(audioUrl);

      await unloadAudioSound();
      setAudioLoadError(null);
      setIsAudioLoading(true);
      try {
        const player = createAudioPlayer(
          { uri: normalizedAudioUrl },
          {
            updateInterval: 250,
          },
        );
        audioPlayerRef.current = player;
        audioPlaybackSubscriptionRef.current = player.addListener(
          "playbackStatusUpdate",
          (status: AudioStatus) => {
            if (!status.isLoaded) {
              setIsAudioPlaying(false);
              return;
            }

            setIsAudioLoading(false);
            setIsAudioPlaying(status.playing);
            if (status.didJustFinish) {
              void audioPlayerRef.current?.seekTo(0).catch(() => undefined);
              setIsAudioPlaying(false);
            }
          },
        );
        setIsAudioLoading(!player.isLoaded);
        return player;
      } catch {
        setAudioLoadError(text.audioLoadFailed);
        return null;
      } finally {
        if (!audioPlayerRef.current) {
          setIsAudioLoading(false);
        }
      }
    },
    [text.audioLoadFailed, text.audioSourceMissing, unloadAudioSound],
  );

  const handlePlayAudio = useCallback(async () => {
    if (stationType !== "audio-quiz") {
      return;
    }

    const audioUrl = normalizeAudioQuizUrl(quizAudioUrl);
    let activePlayer = audioPlayerRef.current;
    if (!activePlayer) {
      activePlayer = await loadAudioSound(audioUrl);
    }

    if (!activePlayer) {
      return;
    }

    try {
      activePlayer.play();
      setHasAudioPlaybackStarted(true);
    } catch {
      setAudioLoadError(text.audioPlayFailed);
      setIsAudioPlaying(false);
    }
  }, [loadAudioSound, quizAudioUrl, stationType, text.audioPlayFailed]);

  const handleStopAudio = useCallback(async () => {
    const activePlayer = audioPlayerRef.current;
    if (!activePlayer) {
      return;
    }

    try {
      if (activePlayer.playing) {
        activePlayer.pause();
        setIsAudioPlaying(false);
        return;
      }

      activePlayer.play();
      setHasAudioPlaybackStarted(true);
      setIsAudioPlaying(true);
    } catch {
      setAudioLoadError(text.audioPlayFailed);
      setIsAudioPlaying(false);
    }
  }, [text.audioPlayFailed]);

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldRouteThroughEarpiece: false,
      shouldPlayInBackground: false,
    }).catch(() => undefined);

    return () => {
      void unloadAudioSound();
    };
  }, [unloadAudioSound]);

  useEffect(() => {
    if (stationType !== "audio-quiz") {
      void unloadAudioSound();
      return;
    }

    const audioUrl = normalizeAudioQuizUrl(quizAudioUrl);
    const sourceError = resolveAudioQuizSourceError(audioUrl, text.audioSourceMissing);
    if (sourceError) {
      void unloadAudioSound();
      setAudioLoadError(sourceError);
      return;
    }

    let cancelled = false;
    void loadAudioSound(audioUrl).then((loadedSound) => {
      if (!cancelled || !loadedSound) {
        return;
      }

      try {
        loadedSound.pause();
      } catch {
        // noop
      }
      try {
        loadedSound.remove();
      } catch {
        // noop
      }
      if (audioPlayerRef.current === loadedSound) {
        audioPlayerRef.current = null;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadAudioSound, quizAudioUrl, stationType, text.audioSourceMissing, unloadAudioSound]);

  return {
    audioLoadError,
    isAudioLoading,
    isAudioPlaying,
    hasAudioPlaybackStarted,
    resetAudioPlaybackState,
    handlePlayAudio,
    handleStopAudio,
  };
}
