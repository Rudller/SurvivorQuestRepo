/**
 * Zmniejsza zdjęcie w przeglądarce przed wysyłką, żeby zmieściło się w limicie
 * backendu bez proszenia admina o ręczne przerabianie plików z telefonu.
 *
 * Plik, który już jest mały i w obsługiwanym formacie, przechodzi bez zmian —
 * każda rekompresja JPEG-a traci jakość, więc nie robimy jej bez potrzeby.
 * Wszystko inne (duże zdjęcia, HEIC w Safari, BMP…) jest dekodowane przez
 * przeglądarkę i zapisywane jako JPEG: najpierw z ograniczeniem dłuższego boku,
 * potem z coraz niższą jakością, a na końcu z dalszym zmniejszaniem wymiarów.
 */

const PASSTHROUGH_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type CompressImageOptions = {
  /** Docelowy maksymalny rozmiar pliku. */
  maxBytes: number;
  /** Dłuższy bok po zmniejszeniu — więcej i tak nie widać na tablecie. */
  maxDimension?: number;
};

export async function compressImageForUpload(
  file: File,
  { maxBytes, maxDimension = 2560 }: CompressImageOptions,
): Promise<File> {
  if (file.size <= maxBytes && PASSTHROUGH_TYPES.includes(file.type)) {
    return file;
  }

  const source = await decodeImage(file);
  try {
    const longEdge = Math.max(source.width, source.height);
    let scale = Math.min(1, maxDimension / longEdge);

    // Kilka kroków wystarcza w praktyce: zdjęcie 12 Mpx z telefonu schodzi do
    // ~1–2 MB już przy pierwszej próbie po ograniczeniu boku do 2560 px.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      for (const quality of [0.85, 0.75, 0.65]) {
        const blob = await renderJpeg(source, scale, quality);
        if (blob.size <= maxBytes) {
          return new File([blob], renameToJpeg(file.name), { type: "image/jpeg" });
        }
      }
      scale *= 0.8;
    }
  } finally {
    if ("close" in source) {
      source.close();
    }
  }

  throw new Error("Nie udało się zmniejszyć zdjęcia do dopuszczalnego rozmiaru.");
}

type DecodedImage = ImageBitmap | HTMLImageElement;

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      // `from-image` obraca zdjęcie wg EXIF — bez tego fotki z telefonu
      // trzymanego pionowo lądowałyby na boku.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Niektóre przeglądarki nie dekodują tu wszystkiego — niżej <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function renderJpeg(source: DecodedImage, scale: number, quality: number): Promise<Blob> {
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Brak obsługi canvas w przeglądarce."));
  }

  // JPEG nie ma przezroczystości — bez białego tła przezroczyste PNG
  // wychodziłyby na czarnym.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Nie udało się zapisać zdjęcia."))),
      "image/jpeg",
      quality,
    );
  });
}

function renameToJpeg(name: string) {
  const base = name.replace(/\.[^.]+$/, "") || "zdjecie";
  return `${base}.jpg`;
}
