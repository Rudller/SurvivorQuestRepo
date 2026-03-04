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

export function useRealizationCountdown(scheduledAt: string) {
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return useMemo(() => {
    const targetTimestamp = new Date(scheduledAt).getTime();

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
  }, [nowTimestamp, scheduledAt]);
}
