/**
 * Zmniejsza zdjęcie w przeglądarce przed wysyłką, żeby zmieściło się w limicie
 * backendu bez proszenia admina o ręczne przerabianie plików z telefonu.
 *
 * Plik, który już jest mały i w obsługiwanym formacie, przechodzi bez zmian —
 * każda rekompresja JPEG-a traci jakość, więc nie robimy jej bez potrzeby.
 *
 * Format ustalamy z PIERWSZYCH BAJTÓW, nie z rozszerzenia. Przeglądarka bierze
 * typ z nazwy pliku, a generatory obrazów chętnie zapisują PNG jako „.jpg”.
 * Backend sprawdza sygnaturę i taki plik odrzucał („Invalid … file signature”),
 * więc tutaj dostaje on po prostu właściwy typ i rozszerzenie.
 *
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
  const actualType = await sniffImageType(file);
  if (file.size <= maxBytes && actualType && PASSTHROUGH_TYPES.includes(actualType)) {
    return actualType === file.type
      ? file
      : new File([file], renameWithExtension(file.name, EXTENSION_BY_TYPE[actualType]), { type: actualType });
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
          return new File([blob], renameWithExtension(file.name, "jpg"), { type: "image/jpeg" });
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

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Typ obrazu z sygnatury pliku; null, gdy to nie JPEG, PNG ani WebP. */
export async function sniffImageType(file: Blob): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp";
  }

  return null;
}

function renameWithExtension(name: string, extension: string) {
  const base = name.replace(/\.[^.]+$/, "") || "zdjecie";
  return `${base}.${extension}`;
}
