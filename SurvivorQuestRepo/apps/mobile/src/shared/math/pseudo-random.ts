/**
 * Deterministic stand-in for Math.random, seeded by an integer.
 *
 * Scattered decoration has to survive re-renders — otherwise every state change
 * reshuffles the layout — and has to stay stable in tests. Both callers build
 * their scatter inside a useMemo, so a real random source would reshuffle it on
 * every dependency change.
 */
export function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}
