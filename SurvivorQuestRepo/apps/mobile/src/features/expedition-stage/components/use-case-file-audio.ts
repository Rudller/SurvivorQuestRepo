import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Odtwarzanie nagrania z dowodu.
 *
 * `expo-audio` jest ładowany LENIWIE, dopiero przy pierwszym naciśnięciu play.
 * To nie jest optymalizacja, tylko warunek konieczny: modal akt wisi na
 * ekranie rozgrywki, a statyczny import `expo-audio` na tej ścieżce wywala
 * siedem zestawów testów naraz — moduł natywny nie istnieje pod jest-expo, a
 * repo nie ma globalnego setupu, który by go mockował.
 */

type AudioPlayerLike = {
  play: () => void;
  pause: () => void;
  remove: () => void;
};

export function useCaseFileAudio(url: string | undefined) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const playerRef = useRef<AudioPlayerLike | null>(null);

  const stop = useCallback(() => {
    const player = playerRef.current;
    playerRef.current = null;
    setIsPlaying(false);

    if (!player) {
      return;
    }

    try {
      player.pause();
    } catch {
      // Odtwarzacz mógł już zostać zwolniony.
    }

    try {
      player.remove();
    } catch {
      // jw.
    }
  }, []);

  // Wyjście ze szczegółu dowodu albo zamknięcie akt ma uciszyć nagranie —
  // inaczej zeznanie leciałoby dalej nad mapą.
  useEffect(() => stop, [stop, url]);

  const toggle = useCallback(async () => {
    if (!url) {
      return;
    }

    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    setIsLoading(true);
    setError(false);

    try {
      const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");

      await setAudioModeAsync({ playsInSilentMode: true });

      const player = createAudioPlayer({ uri: url }) as unknown as AudioPlayerLike;
      playerRef.current = player;
      player.play();
      setIsPlaying(true);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isPlaying, url]);

  return { isPlaying, isLoading, error, toggle };
}
