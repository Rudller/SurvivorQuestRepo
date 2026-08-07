import { MOBILE_THEME } from "../mobile-preview-theme";
import { PREVIEW_LAYOUT } from "../layout-tokens";
import { PreviewActionButton } from "../preview-ui";

const QR_WATERMARK_ICON_URI = "https://unpkg.com/@tabler/icons@3.34.1/icons/outline/qrcode.svg";
const CARD_HEIGHT = 240;

// Mirrors apps/mobile/.../station-overlays/preview.tsx's qr-hunt card + apps/mobile/.../qr-hunt-station-panel.tsx's QrHuntProgressDots.
export function QrHuntPreview({ description, qrScanCodesCount }: { description?: string; qrScanCodesCount: number }) {
  return (
    <div className="mt-1">
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-2xl border"
        style={{ height: CARD_HEIGHT, borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelMuted }}
      >
        <img
          src={QR_WATERMARK_ICON_URI}
          alt=""
          className="pointer-events-none absolute opacity-[0.16]"
          style={{ width: CARD_HEIGHT / 2, height: CARD_HEIGHT / 2, filter: "invert(1)" }}
        />
        <PreviewActionButton label="Skanuj kod" />
      </div>

      {description ? (
        <p className="mt-2" style={{ color: MOBILE_THEME.textMuted, fontSize: PREVIEW_LAYOUT.descriptionFontSize, lineHeight: 1.4 }}>
          {description}
        </p>
      ) : null}

      {qrScanCodesCount > 0 ? (
        <div className="mt-2 flex flex-col items-center" style={{ gap: PREVIEW_LAYOUT.attemptRowGap }}>
          <p className="uppercase tracking-widest" style={{ color: MOBILE_THEME.textSubtle, fontSize: PREVIEW_LAYOUT.infoFontSize }}>
            Postęp skanowania
          </p>
          <div className="flex flex-wrap items-center justify-center" style={{ gap: PREVIEW_LAYOUT.attemptDotGap }}>
            {Array.from({ length: qrScanCodesCount }).map((_, index) => (
              <span
                key={index}
                className="rounded-full border"
                style={{
                  width: PREVIEW_LAYOUT.attemptDotSize * 1.6,
                  height: PREVIEW_LAYOUT.attemptDotSize * 1.6,
                  borderColor: MOBILE_THEME.border,
                  backgroundColor: "transparent",
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
