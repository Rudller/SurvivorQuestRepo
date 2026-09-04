// The maths behind the SILENCE pig, kept in its own module with no imports.
//
// Unlike the fog and darkness helpers — which live next to their effects in
// risk-quiz-pig-effects.tsx — these cannot: the silence effect has to import
// expo-audio, and expo-audio throws on import under jest-expo because the native
// module is absent. Anything that pulls it in drags every unrelated test suite
// down with it, so the effect and its arithmetic are split apart and the effect
// itself is only required once a SILENCE pig actually lands.

// Recorder metering arrives in dBFS: 0 is the loudest the hardware can register
// and the scale runs down towards -160 for silence.
const SILENCE_FLOOR_DB = -160;
// At or below this the room counts as quiet — a hushed table, people whispering.
export const SILENCE_FULLY_REVEALED_DB = -45;
// ...and at or above it they are talking over each other, which is the state the
// pig exists to punish.
export const SILENCE_FULLY_HIDDEN_DB = -18;

/**
 * Maps a recorder metering reading to how much of the screen shows through,
 * from 1 (quiet, fully readable) down to 0 (loud, fully blacked out).
 *
 * The ramp is plain linear because dBFS is already logarithmic — unlike lux,
 * which `darknessRevealAmount` has to take the logarithm of first.
 */
export function silenceRevealAmount(metering: number): number {
  // A recorder that reports nothing must not black the screen out with no way
  // back, so anything unreadable counts as silence.
  if (!Number.isFinite(metering)) {
    return 1;
  }

  const db = Math.min(0, Math.max(SILENCE_FLOOR_DB, metering));
  const position =
    (db - SILENCE_FULLY_REVEALED_DB) /
    (SILENCE_FULLY_HIDDEN_DB - SILENCE_FULLY_REVEALED_DB);

  return Math.min(1, Math.max(0, 1 - position));
}

// Slower than the light smoother: a room's volume swings far more violently than
// its brightness, and a single cough must not black the screen out.
const SILENCE_SMOOTHING = 0.18;

/**
 * Exponential moving average over the metering feed. Pass the previous smoothed
 * value, or null for the first reading.
 *
 * Deliberately not `smoothIlluminance`: that one clamps its input at zero, which
 * would read every negative dB value as maximum volume.
 */
export function smoothLoudness(previous: number | null, sample: number): number {
  if (!Number.isFinite(sample)) {
    return previous ?? SILENCE_FULLY_REVEALED_DB;
  }

  const db = Math.min(0, Math.max(SILENCE_FLOOR_DB, sample));
  if (previous === null) {
    return db;
  }

  return previous + (db - previous) * SILENCE_SMOOTHING;
}
