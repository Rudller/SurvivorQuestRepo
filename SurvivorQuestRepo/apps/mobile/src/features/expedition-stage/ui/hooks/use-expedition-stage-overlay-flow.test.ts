import { QR_SCAN_ALREADY_SCANNED, QR_SCAN_SILENT_FAILURE } from "../../api/mobile-session.api";
import { isSilentQrScanSentinel } from "./use-expedition-stage-overlay-flow";

describe("isSilentQrScanSentinel", () => {
  it("treats both qr-scan sentinels as silent (must not reach the global error popup)", () => {
    expect(isSilentQrScanSentinel(QR_SCAN_SILENT_FAILURE)).toBe(true);
    expect(isSilentQrScanSentinel(QR_SCAN_ALREADY_SCANNED)).toBe(true);
  });

  it("treats a real user-facing error message as not silent", () => {
    expect(isSilentQrScanSentinel("Nie udało się zeskanować kodu.")).toBe(false);
  });
});
