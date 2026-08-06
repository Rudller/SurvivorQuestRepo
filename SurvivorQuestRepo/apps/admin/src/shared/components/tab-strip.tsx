"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

export type TabItem = {
  id: string;
  label: string;
  hasError?: boolean;
};

type TabStripProps = {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

const DRAG_THRESHOLD_PX = 3;

export function TabStrip({ tabs, activeId, onChange, className }: TabStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  function handleMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    isPointerDownRef.current = true;
    hasDraggedRef.current = false;
    dragStartXRef.current = event.pageX;
    dragStartScrollLeftRef.current = el.scrollLeft;
    setIsDragging(true);
  }

  function handleMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    if (!el || !isPointerDownRef.current) {
      return;
    }

    const delta = event.pageX - dragStartXRef.current;
    if (Math.abs(delta) > DRAG_THRESHOLD_PX) {
      hasDraggedRef.current = true;
    }

    el.scrollLeft = dragStartScrollLeftRef.current - delta;
  }

  function stopDragging() {
    isPointerDownRef.current = false;
    setIsDragging(false);
  }

  return (
    <div
      ref={scrollRef}
      role="tablist"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      className={`sq-thin-scrollbar flex select-none gap-1 overflow-x-auto border-b border-zinc-800 ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      } ${className ?? ""}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (hasDraggedRef.current) {
                return;
              }
              onChange(tab.id);
            }}
            className={`relative shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {tab.hasError ? (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-red-500"
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
