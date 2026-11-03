// Wspólny stan otwartego modelu 3D. Scena Viro dostaje propsy tylko raz
// (viroAppProps), a nakładka 2D i scena muszą widzieć to samo pokrętło, te
// same przecięte kable itd. — więc obie czytają ten mały magazyn.
import { useSyncExternalStore } from "react";

import type { ArModelKind } from "./ar-model-answer";

// checking: odpowiedź poszła do sprawdzenia; wrong / success: wynik, który
// scena pokazuje animacją (wybuch, otwarte drzwi).
export type ArModelStatus = "idle" | "checking" | "wrong" | "success";

export type ArModelState = {
  kind: ArModelKind;
  expected: string;
  placement: "none" | "plane" | "front";
  frontPosition: [number, number, number];
  frontRotationY: number;
  status: ArModelStatus;
  safeDial: number;
  safeEntered: number[];
  bombCut: string[];
  puzzleFaces: number[];
  artifactRotation: [number, number];
  artifactScale: number;
};

export function createInitialArModelState(kind: ArModelKind, expected: string): ArModelState {
  return {
    kind,
    expected,
    placement: "none",
    frontPosition: [0, -0.3, -0.6],
    frontRotationY: 0,
    status: "idle",
    safeDial: 0,
    safeEntered: [],
    bombCut: [],
    // Każda kostka startuje od innego symbolu, żeby układ startowy nie był
    // przypadkiem rozwiązaniem.
    puzzleFaces: [1, 3, 0, 2],
    artifactRotation: [0, 0],
    artifactScale: 1,
  };
}

let state: ArModelState = createInitialArModelState("ar-safe", "");
const listeners = new Set<() => void>();

export function getArModelState() {
  return state;
}

export function setArModelState(patch: Partial<ArModelState> | ((current: ArModelState) => Partial<ArModelState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export function resetArModelState(kind: ArModelKind, expected: string) {
  state = createInitialArModelState(kind, expected);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useArModelState() {
  return useSyncExternalStore(subscribe, getArModelState, getArModelState);
}
