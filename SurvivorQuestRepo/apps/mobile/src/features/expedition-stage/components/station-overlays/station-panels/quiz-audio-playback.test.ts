import { normalizeAudioQuizUrl, resolveAudioQuizSourceError } from "./quiz-audio-playback";

describe("quiz-audio-playback helpers", () => {
  const missingAudioMessage = "Brak audio dla tego stanowiska.";

  it("returns missing-audio error for empty source", () => {
    expect(resolveAudioQuizSourceError("", missingAudioMessage)).toBe(missingAudioMessage);
    expect(resolveAudioQuizSourceError("   ", missingAudioMessage)).toBe(missingAudioMessage);
  });

  it("normalizes valid source and does not return error", () => {
    expect(normalizeAudioQuizUrl("  https://example.com/audio.mp3  ")).toBe("https://example.com/audio.mp3");
    expect(resolveAudioQuizSourceError("https://example.com/audio.mp3", missingAudioMessage)).toBeNull();
  });
});
