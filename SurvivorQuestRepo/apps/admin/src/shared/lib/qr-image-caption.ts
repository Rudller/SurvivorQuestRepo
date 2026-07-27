const QR_CAPTION_HORIZONTAL_PADDING = 18;
const QR_CAPTION_VERTICAL_PADDING = 14;
const QR_CAPTION_FONT_SIZE = 18;
const QR_CAPTION_LINE_HEIGHT = 22;
const QR_CAPTION_MAX_LINES = 2;

function trimCaptionToWidth(
  context: CanvasRenderingContext2D,
  caption: string,
  maxWidth: number,
) {
  if (context.measureText(caption).width <= maxWidth) {
    return caption;
  }

  let trimmed = caption;
  while (trimmed.length > 0 && context.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length > 0 ? `${trimmed}…` : "…";
}

function buildCaptionLines(
  context: CanvasRenderingContext2D,
  caption: string,
  maxWidth: number,
) {
  const words = caption.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = words.shift() ?? "";

  words.forEach((word) => {
    if (lines.length >= QR_CAPTION_MAX_LINES - 1) {
      currentLine = `${currentLine} ${word}`.trim();
      return;
    }

    const nextLine = `${currentLine} ${word}`.trim();
    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  lines.push(currentLine);

  if (lines.length <= QR_CAPTION_MAX_LINES) {
    const normalizedLastIndex = lines.length - 1;
    lines[normalizedLastIndex] = trimCaptionToWidth(context, lines[normalizedLastIndex] ?? "", maxWidth);
    return lines;
  }

  const trimmed = lines.slice(0, QR_CAPTION_MAX_LINES);
  const lastIndex = trimmed.length - 1;
  trimmed[lastIndex] = trimCaptionToWidth(context, trimmed[lastIndex] ?? "", maxWidth);
  return trimmed;
}

export function addCaptionToQrImageDataUrl(qrImageDataUrl: string, caption: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Brak kontekstu canvas dla podpisu QR."));
          return;
        }

        context.font = `600 ${QR_CAPTION_FONT_SIZE}px Arial, sans-serif`;
        const lines = buildCaptionLines(
          context,
          caption,
          Math.max(1, image.width - QR_CAPTION_HORIZONTAL_PADDING * 2),
        );
        const normalizedLines = lines.length > 0 ? lines : [caption];
        const captionAreaHeight =
          QR_CAPTION_VERTICAL_PADDING * 2 + normalizedLines.length * QR_CAPTION_LINE_HEIGHT;

        canvas.width = image.width;
        canvas.height = image.height + captionAreaHeight;

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, image.width, image.height);

        context.font = `600 ${QR_CAPTION_FONT_SIZE}px Arial, sans-serif`;
        context.fillStyle = "#111827";
        context.textAlign = "center";
        context.textBaseline = "top";

        normalizedLines.forEach((line, lineIndex) => {
          const y = image.height + QR_CAPTION_VERTICAL_PADDING + lineIndex * QR_CAPTION_LINE_HEIGHT;
          context.fillText(line, canvas.width / 2, y, canvas.width - QR_CAPTION_HORIZONTAL_PADDING * 2);
        });

        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      reject(new Error("Nie udało się załadować obrazu QR do dodania podpisu."));
    };
    image.src = qrImageDataUrl;
  });
}
