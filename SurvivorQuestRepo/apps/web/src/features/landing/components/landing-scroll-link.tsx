"use client";

import type { MouseEvent, ReactNode } from "react";

type LandingScrollLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  /** Fired after the link is activated, so a container (the mobile sheet) can close itself. */
  onNavigate?: () => void;
};

/** Header height (64px) plus breathing room, so a section never lands under the bar. */
const STICKY_TOP_OFFSET = 88;

export function LandingScrollLink({ href, className, children, onNavigate }: LandingScrollLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onNavigate?.();

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
