"use client";

import { useEffect, useRef, type ReactNode } from "react";

type RevealOnViewProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * Marks its wrapper `data-revealed` the first time it scrolls into view, and
 * then stops watching. Everything that moves is a CSS transition keyed off
 * that attribute (see `.sq-reveal` in globals.css), so nothing runs on scroll
 * and nothing keeps animating once the reveal is over — the landing has janked
 * on scroll before, and this keeps the section out of that.
 */
export function RevealOnView({ children, className, id }: RevealOnViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.dataset.revealed = "";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} id={id} className={`sq-reveal ${className ?? ""}`}>
      {children}
    </div>
  );
}
