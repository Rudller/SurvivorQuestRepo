import JSZip from "jszip";

export type QrZipEntry = {
  fileName: string;
  qrImage: string;
};

/**
 * Packs already-rendered QR data URIs into a ZIP and hands it to the browser.
 *
 * Shared by the current-realization QR panel and the Ryzykanci scheme library,
 * which download the same kind of printable sheet from two different places.
 * Duplicate base names get a " (n)" suffix instead of overwriting each other —
 * two categories can legitimately produce the same file name.
 */
export async function downloadQrImagesAsZip(
  entries: QrZipEntry[],
  archiveFileName: string,
) {
  const zip = new JSZip();
  const usedFileNameCounts = new Map<string, number>();

  for (const { fileName: baseFileName, qrImage } of entries) {
    const fileNameCount = (usedFileNameCounts.get(baseFileName) ?? 0) + 1;
    usedFileNameCounts.set(baseFileName, fileNameCount);
    const fileName =
      fileNameCount > 1
        ? baseFileName.replace(/\.png$/i, ` (${fileNameCount}).png`)
        : baseFileName;

    const base64MarkerIndex = qrImage.indexOf("base64,");
    if (base64MarkerIndex < 0) {
      continue;
    }

    zip.file(fileName, qrImage.slice(base64MarkerIndex + "base64,".length), {
      base64: true,
    });
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipUrl = window.URL.createObjectURL(zipBlob);
  const anchor = document.createElement("a");
  anchor.href = zipUrl;
  anchor.download = archiveFileName;
  anchor.click();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(zipUrl);
  }, 1000);
}
