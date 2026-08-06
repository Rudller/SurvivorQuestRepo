// Exact "phone" scale values from apps/mobile's useStationPanelLayout()
// (apps/mobile/.../station-panels/shared-ui.tsx), i.e. the values a real
// phone renders at baseline width (~390px, iPhone 12/13/14-ish CSS width,
// scale factor 1.0 in useAdaptiveLayout). The preview frame is sized close
// to that same width (see mobile-station-preview.tsx), so using these exact
// px values — not approximations — makes text wrap at nearly the same
// points here as it does on an actual phone screen.
export const PREVIEW_LAYOUT = {
  infoFontSize: 10,
  inputFontSize: 12,
  actionFontSize: 11,
  actionMinHeight: 34,
  resultFontSize: 10,
  promptFontSize: 13,
  descriptionFontSize: 12,
  keyLabelFontSize: 14,
  pinpadDigitFontSize: 30,
  attemptDotSize: 6,
  attemptRowGap: 6,
  attemptDotGap: 4,
} as const;
