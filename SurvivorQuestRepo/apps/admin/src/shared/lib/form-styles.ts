export function resolveFieldBorderClassName(isInvalid: boolean) {
  return isInvalid ? "border-red-500/70 focus:border-red-400/80" : "border-zinc-700 focus:border-amber-400/80";
}
