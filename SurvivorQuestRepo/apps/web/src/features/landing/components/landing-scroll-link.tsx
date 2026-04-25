"use client";

import type { MouseEvent, ReactNode } from "react";

type LandingScrollLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

const STICKY_TOP_OFFSET = 140;

export function LandingScrollLink({ href, className, children }: LandingScrollLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!href.startsWith("#")) {
      return;
    }

    const targetId = href.slice(1);
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    event.preventDefault();
    const targetTop = target.getBoundingClientRect().top + window.scrollY - STICKY_TOP_OFFSET;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
    window.history.replaceState(null, "", href);
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
