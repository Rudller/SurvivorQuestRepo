export function normalizeAudioQuizUrl(audioUrl: string | null | undefined) {
  return audioUrl?.trim() ?? "";
}

export function resolveAudioQuizSourceError(audioUrl: string | null | undefined, missingSourceMessage: string) {
  return normalizeAudioQuizUrl(audioUrl) ? null : missingSourceMessage;
}
