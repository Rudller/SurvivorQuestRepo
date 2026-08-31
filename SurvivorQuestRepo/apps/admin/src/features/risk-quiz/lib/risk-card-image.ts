import easyCardTemplate from "../../../../../mobile/assets/karty/karta-niskie.png";
import mediumCardTemplate from "../../../../../mobile/assets/karty/karta-srednie.png";
import hardCardTemplate from "../../../../../mobile/assets/karty/karta-wysokie.png";
import type { RiskDifficulty } from "../types/risk-quiz";

const TEMPLATE_WIDTH = 745;
const TEMPLATE_HEIGHT = 1040;
const QR_SIZE = 350;
const QR_LEFT = Math.round((TEMPLATE_WIDTH - QR_SIZE) / 2);
const QR_TOP = 369;
const GOLD = "#d9a441";
const LIGHT_TEXT = "#f4ead7";

const templateImagePromises = new Map<string, Promise<HTMLImageElement>>();

function loadImage(source: string, cache = false) {
  const existing = cache ? templateImagePromises.get(source) : undefined;
  if (existing) {
    return existing;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Nie udało się wczytać obrazu: ${source}`));
    image.src = source;
  });

  if (cache) {
    templateImagePromises.set(source, promise);
  }
  return promise;
}

function templateUrlForDifficulty(difficulty: RiskDifficulty) {
  if (difficulty === "EASY") {
    return easyCardTemplate.src;
  }
  if (difficulty === "HARD") {
    return hardCardTemplate.src;
  }
  return mediumCardTemplate.src;
}

function normalizeCategoryName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL");
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  maxWidth: number,
) {
  let fontSize = 28;
  do {
    context.font = `500 ${fontSize}px Georgia, "Times New Roman", serif`;
    fontSize -= 1;
  } while (fontSize >= 15 && context.measureText(text).width > maxWidth);

  context.fillText(text, centerX, baselineY, maxWidth);
}

function drawGlobe(context: CanvasRenderingContext2D, x: number, y: number) {
  context.beginPath();
  context.arc(x, y, 27, 0, Math.PI * 2);
  context.moveTo(x - 27, y);
  context.lineTo(x + 27, y);
  context.moveTo(x, y - 27);
  context.bezierCurveTo(x - 15, y - 12, x - 15, y + 12, x, y + 27);
  context.moveTo(x, y - 27);
  context.bezierCurveTo(x + 15, y - 12, x + 15, y + 12, x, y + 27);
  context.stroke();
}

function drawTemple(context: CanvasRenderingContext2D, x: number, y: number) {
  context.beginPath();
  context.moveTo(x - 29, y - 16);
  context.lineTo(x, y - 32);
  context.lineTo(x + 29, y - 16);
  context.closePath();
  context.moveTo(x - 31, y - 11);
  context.lineTo(x + 31, y - 11);
  context.moveTo(x - 25, y + 25);
  context.lineTo(x + 25, y + 25);
  context.moveTo(x - 31, y + 31);
  context.lineTo(x + 31, y + 31);
  for (const offset of [-19, -6, 7, 20]) {
    context.moveTo(x + offset, y - 8);
    context.lineTo(x + offset, y + 23);
  }
  context.stroke();
}

function drawBall(context: CanvasRenderingContext2D, x: number, y: number) {
  context.beginPath();
  context.arc(x, y, 29, 0, Math.PI * 2);
  context.moveTo(x, y - 9);
  context.lineTo(x + 10, y - 2);
  context.lineTo(x + 6, y + 10);
  context.lineTo(x - 6, y + 10);
  context.lineTo(x - 10, y - 2);
  context.closePath();
  context.moveTo(x, y - 9);
  context.lineTo(x, y - 28);
  context.moveTo(x + 10, y - 2);
  context.lineTo(x + 27, y - 8);
  context.moveTo(x + 6, y + 10);
  context.lineTo(x + 17, y + 24);
  context.moveTo(x - 6, y + 10);
  context.lineTo(x - 17, y + 24);
  context.moveTo(x - 10, y - 2);
  context.lineTo(x - 27, y - 8);
  context.stroke();
}

function drawFlask(context: CanvasRenderingContext2D, x: number, y: number) {
  context.beginPath();
  context.moveTo(x - 10, y - 29);
  context.lineTo(x + 10, y - 29);
  context.moveTo(x - 5, y - 29);
  context.lineTo(x - 5, y - 7);
  context.lineTo(x - 25, y + 25);
  context.quadraticCurveTo(x - 28, y + 31, x - 19, y + 31);
  context.lineTo(x + 19, y + 31);
  context.quadraticCurveTo(x + 28, y + 31, x + 25, y + 25);
  context.lineTo(x + 5, y - 7);
  context.lineTo(x + 5, y - 29);
  context.moveTo(x - 18, y + 16);
  context.quadraticCurveTo(x, y + 7, x + 18, y + 16);
  context.stroke();
}

function drawMusic(context: CanvasRenderingContext2D, x: number, y: number) {
  context.beginPath();
  context.moveTo(x - 2, y - 25);
  context.lineTo(x + 22, y - 31);
  context.lineTo(x + 22, y + 13);
  context.moveTo(x - 2, y - 25);
  context.lineTo(x - 2, y + 20);
  context.stroke();
  context.beginPath();
  context.ellipse(x - 12, y + 23, 12, 8, -0.25, 0, Math.PI * 2);
  context.ellipse(x + 12, y + 16, 12, 8, -0.25, 0, Math.PI * 2);
  context.fill();
}

function drawCategoryIcon(context: CanvasRenderingContext2D, categoryName: string) {
  const normalizedName = normalizeCategoryName(categoryName);
  const centerX = TEMPLATE_WIDTH / 2;
  const centerY = 194;

  context.save();
  context.strokeStyle = GOLD;
  context.fillStyle = GOLD;
  context.lineWidth = 3;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (normalizedName.includes("histor")) {
    drawTemple(context, centerX, centerY);
  } else if (normalizedName.includes("geograf") || normalizedName.includes("swiat")) {
    drawGlobe(context, centerX, centerY);
  } else if (normalizedName.includes("sport")) {
    drawBall(context, centerX, centerY);
  } else if (normalizedName.includes("nauk") || normalizedName.includes("technik")) {
    drawFlask(context, centerX, centerY);
  } else if (normalizedName.includes("muzyk") || normalizedName.includes("film")) {
    drawMusic(context, centerX, centerY);
  } else {
    const initials = categoryName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("pl-PL") ?? "")
      .join("") || "?";
    context.font = "700 35px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(initials, centerX, centerY + 1);
  }

  context.restore();
}

export function riskCardOrdinal(code: string, fallbackIndex = 1) {
  const match = code.match(/-(\d+)$/);
  const parsed = match ? Number.parseInt(match[1], 10) : fallbackIndex;
  const ordinal = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackIndex;
  return `#${String(ordinal).padStart(2, "0")}`;
}

export async function renderRiskCardImage(input: {
  qrImage: string;
  categoryName: string;
  difficulty: RiskDifficulty;
  ordinal: string;
}) {
  const [template, qrImage] = await Promise.all([
    loadImage(templateUrlForDifficulty(input.difficulty), true),
    loadImage(input.qrImage),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = TEMPLATE_WIDTH;
  canvas.height = TEMPLATE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Przeglądarka nie obsługuje generatora kart.");
  }

  context.drawImage(template, 0, 0, TEMPLATE_WIDTH, TEMPLATE_HEIGHT);
  context.save();
  context.imageSmoothingEnabled = false;
  context.fillStyle = "#ffffff";
  context.fillRect(QR_LEFT, QR_TOP, QR_SIZE, QR_SIZE);
  context.drawImage(qrImage, QR_LEFT, QR_TOP, QR_SIZE, QR_SIZE);
  context.restore();

  context.save();
  context.fillStyle = LIGHT_TEXT;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.shadowColor = "rgba(0, 0, 0, 0.8)";
  context.shadowBlur = 3;
  drawFittedText(
    context,
    input.categoryName.toLocaleUpperCase("pl-PL"),
    294,
    322,
    230,
  );
  context.font = "500 28px Georgia, \"Times New Roman\", serif";
  context.fillText(input.ordinal, 493, 322, 105);
  context.restore();

  drawCategoryIcon(context, input.categoryName);
  return canvas.toDataURL("image/png");
}
