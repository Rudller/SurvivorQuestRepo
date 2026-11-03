import { useEffect, useMemo, useState } from "react";

function padTime(value: number) {
  return String(value).padStart(2, "0");
}

function formatCountdown(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`;
}

export function computeRealizationCountdown(scheduledAt: string, durationMinutes: number, nowTimestamp: number) {
  const scheduledTimestamp = new Date(scheduledAt).getTime();
  const safeDurationMinutes = Math.max(1, Math.round(durationMinutes) || 120);
  const targetTimestamp = scheduledTimestamp + safeDurationMinutes * 60 * 1000;

  if (!Number.isFinite(targetTimestamp)) {
    return {
      remainingSeconds: 0,
      remainingLabel: "--:--:--",
      isCompleted: true,
    };
  }

  const remainingSeconds = Math.max(0, Math.round((targetTimestamp - nowTimestamp) / 1000));

  return {
    remainingSeconds,
    remainingLabel: formatCountdown(remainingSeconds),
    isCompleted: remainingSeconds === 0,
  };
}

export function useRealizationCountdown(scheduledAt: string, durationMinutes: number) {
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return useMemo(
    () => computeRealizationCountdown(scheduledAt, durationMinutes, nowTimestamp),
    [durationMinutes, nowTimestamp, scheduledAt],
  );
}

/**
 * Same flagi z zegara realizacji, bez sekund.
 *
 * Ekran ekspedycji potrzebuje tylko „czas minął” i „zostało mniej niż N sekund”
 * (ukrywanie rankingu przed końcem). Gdyby trzymał pełny zegar, przerysowywałby
 * się cały co sekundę — a to zjada wątek JS i szarpie gesty, np. przesuwanie
 * kart w Poszlakach. Tu stan zmienia się tylko wtedy, gdy któraś flaga się
 * przełącza (React pomija setState z tą samą wartością), a sekundy liczy sam
 * panel z czasem.
 */
export function useRealizationCountdownFlags(scheduledAt: string, durationMinutes: number, thresholdSeconds: number) {
  const resolve = () => {
    const { remainingSeconds, isCompleted } = computeRealizationCountdown(scheduledAt, durationMinutes, Date.now());
    return { isCompleted, isBelowThreshold: remainingSeconds <= thresholdSeconds };
  };
  const [flags, setFlags] = useState(resolve);

  useEffect(() => {
    const sync = () => {
      const next = resolve();
      // Ten sam obiekt, gdy nic się nie zmieniło — React pominie wtedy render.
      setFlags((current) =>
        current.isCompleted === next.isCompleted && current.isBelowThreshold === next.isBelowThreshold ? current : next,
      );
    };
    // Od razu, bo zmiana terminu albo progu z serwera ma zadziałać bez czekania na tyknięcie.
    sync();
    const interval = setInterval(sync, 1000);
    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMinutes, scheduledAt, thresholdSeconds]);

  return flags;
}
