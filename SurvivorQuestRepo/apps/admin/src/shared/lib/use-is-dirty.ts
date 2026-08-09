import { useState } from "react";

/**
 * Tracks whether a JSON-serializable snapshot of form state has changed
 * since this hook was first mounted. Used to guard "click outside closes
 * the panel" handlers so accidental clicks don't discard unsaved input.
 */
export function useIsDirty(snapshot: unknown): boolean {
  const serialized = JSON.stringify(snapshot);
  // Lazy useState initializer captures the first-render snapshot once;
  // later renders ignore the initializer argument and just read state —
  // reading a ref's `.current` during render isn't allowed under the React
  // Compiler's rules, so state is used instead of a ref here.
  const [initialSnapshot] = useState(serialized);

  return serialized !== initialSnapshot;
}
