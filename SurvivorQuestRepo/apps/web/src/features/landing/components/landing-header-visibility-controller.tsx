"use client";

import { useEffect } from "react";

const HEADER_ID = "landing-top-bar";
const SCROLL_DELTA = 8;
const TOP_THRESHOLD = 24;

export function LandingHeaderVisibilityController() {
  useEffect(() => {
    const header = document.getElementById(HEADER_ID);
    if (!header) {
      return;
    }

    let lastY = window.scrollY;
    let frameScheduled = false;

    const updateHeaderVisibility = () => {
      const currentY = window.scrollY;

      if (currentY <= TOP_THRESHOLD || currentY < lastY - SCROLL_DELTA) {
        header.style.transform = "translateY(0)";
      } else if (currentY > lastY + SCROLL_DELTA) {
        header.style.transform = "translateY(-100%)";
      }

      lastY = currentY;
      frameScheduled = false;
    };

    const onScroll = () => {
      if (frameScheduled) {
        return;
      }

      frameScheduled = true;
      window.requestAnimationFrame(updateHeaderVisibility);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      header.style.transform = "translateY(0)";
    };
  }, []);

  return null;
}
