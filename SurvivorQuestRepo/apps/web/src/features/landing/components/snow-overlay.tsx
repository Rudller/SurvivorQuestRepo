"use client";

import { useEffect, useRef } from "react";

/**
 * Snow falling over a photo. Each layer is a tiled field of flakes that slides
 * by exactly one tile per loop, so the loop is seamless, and it only ever moves
 * through `transform` — no repaint per frame. Layers run only while the photo
 * is on screen (see `.sq-snow` in globals.css); off screen they are paused,
 * so the snow costs nothing while the visitor scrolls elsewhere.
 */
export function SnowOverlay() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.dataset.active = "";
      } else {
        delete element.dataset.active;
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="sq-snow pointer-events-none absolute inset-0 overflow-hidden">
      <div className="sq-snow-layer sq-snow-far" />
      <div className="sq-snow-layer sq-snow-mid" />
      <div className="sq-snow-layer sq-snow-near" />
    </div>
  );
}
