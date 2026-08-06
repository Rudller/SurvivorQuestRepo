import { MOBILE_THEME } from "../mobile-preview-theme";

// photo-task and qr-hunt both need the device camera on mobile, which can't
// be meaningfully replicated in a browser preview inside the admin panel.
export function CameraPlaceholderPreview({ kind }: { kind: "photo-task" | "qr-hunt" }) {
  return (
    <div
      className="mt-1 flex flex-col items-center justify-center gap-2 rounded-2xl border py-10 text-center"
      style={{ borderColor: MOBILE_THEME.border, backgroundColor: MOBILE_THEME.panelStrong }}
    >
      <span style={{ fontSize: 32 }}>{kind === "photo-task" ? "📷" : "🔳"}</span>
      <p className="text-center" style={{ color: MOBILE_THEME.textMuted, fontSize: 12 }}>
        Podgląd aparatu {kind === "qr-hunt" ? "/ skanera" : ""} niedostępny w panelu administracyjnym
      </p>
    </div>
  );
}
