/* global __dirname, Buffer */
// Generuje karty dowodowe dla stacji "ar-evidence":
// - assets/ar/dowod-N.png   — obraz wzorcowy ARCore (rozpoznawany przez tablet),
// - assets/ar/slad-uv-N.png — fioletowa poświata odcisku nakładana w AR,
// - assets/ar/holo-N.png    — hologram z wynikiem analizy, unoszący się nad kartą,
// - ar-evidence-print-a4.png (ścieżka z argv[2]) — arkusz A4 do druku, 300 dpi.
// Karta ma 90 x 120 mm; ta szerokość musi zgadzać się z physicalWidth w aplikacji.
//
// Uruchom: node scripts/generate-ar-evidence-cards.cjs <ścieżka-arkusza.png>
const path = require("path");
const fs = require("fs");

const sharp = require(require.resolve("sharp", {
  paths: [path.join(__dirname, "..", "..", "..", "node_modules", ".pnpm", "sharp@0.34.5", "node_modules")],
}));

// clutterSeed: dobrany tak, żeby arcoreimg eval-img dawał >= 80 (domyślnie id).
// match/person muszą zgadzać się z forensic-case.ts — trafiają na hologram AR.
const CARDS = [
  { id: 1, place: "Kieliszek ofiary", signature: "SQ-SLAD-1", core: "loop", clutterSeed: 31, match: 88, person: ["Anna Wiśniewska", "gospodyni"] },
  { id: 2, place: "Klamka gabinetu", signature: "SQ-SLAD-2", core: "whorl", match: 92, person: ["Marek Zając", "ogrodnik"] },
  { id: 3, place: "Fiolka w koszu", signature: "SQ-SLAD-3", core: "arch", match: 79, person: ["Marek Zając", "ogrodnik"] },
  { id: 4, place: "Drzwiczki sejfu", signature: "SQ-SLAD-4", core: "whorl", match: null, person: null },
];

const HOLO_W = 640;
const HOLO_H = 360;

// Hologram nad kartą po analizie: dane z bazy odcisków, pionowa tablica w AR.
function holoSvg(card) {
  const lines = card.person
    ? `<text x="40" y="150" font-family="Arial, sans-serif" font-size="30" fill="#e4d6ff">DOPASOWANIE</text>
  <text x="${HOLO_W - 40}" y="150" text-anchor="end" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff">${card.match}%</text>
  <rect x="40" y="170" width="${HOLO_W - 80}" height="14" rx="7" fill="#ffffff" fill-opacity="0.15"/>
  <rect x="40" y="170" width="${((HOLO_W - 80) * card.match) / 100}" height="14" rx="7" fill="#c4a2ff"/>
  <text x="40" y="260" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#ffffff">${card.person[0]}</text>
  <text x="40" y="310" font-family="Arial, sans-serif" font-size="32" fill="#c4a2ff">${card.person[1]}</text>`
    : `<text x="40" y="190" font-family="Arial, sans-serif" font-size="50" font-weight="700" fill="#fda4af">BRAK DOPASOWANIA</text>
  <text x="40" y="250" font-family="Arial, sans-serif" font-size="30" fill="#e4d6ff">próbka zanieczyszczona</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${HOLO_W}" height="${HOLO_H}" viewBox="0 0 ${HOLO_W} ${HOLO_H}">
  <rect x="6" y="6" width="${HOLO_W - 12}" height="${HOLO_H - 12}" rx="22" fill="#1a0840" fill-opacity="0.82" stroke="#c4a2ff" stroke-width="5"/>
  <rect x="6" y="6" width="${HOLO_W - 12}" height="70" rx="22" fill="#a77bff" fill-opacity="0.35"/>
  <text x="40" y="54" font-family="Courier New, monospace" font-size="26" font-weight="700" fill="#ffffff" letter-spacing="2">DOWÓD NR ${card.id} · ${card.place.toUpperCase()}</text>
  ${lines}
</svg>`;
}

const CARD_W = 600;
const CARD_H = 800;

function rng(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Ridges as perturbed closed curves around a core, with random breaks
// (minutiae) so every card has its own corner features.
function ridgePaths(seed, core, cx, cy, scale) {
  const rand = rng(seed * 17 + 3);
  const paths = [];
  const rings = 19;
  const phaseA = rand() * Math.PI * 2;
  const phaseB = rand() * Math.PI * 2;
  for (let i = 1; i <= rings; i++) {
    const r = i * 9 * scale;
    const points = [];
    const steps = 140;
    for (let k = 0; k <= steps; k++) {
      const t = (k / steps) * Math.PI * 2;
      let rx = r * 0.78;
      let ry = r;
      if (core === "loop") {
        ry = r * (1 + 0.25 * Math.max(0, Math.sin(t)));
      } else if (core === "arch") {
        rx = r * 1.15;
        ry = r * (0.6 + 0.35 * Math.max(0, -Math.sin(t)));
      }
      const wobble = 1 + 0.05 * Math.sin(3 * t + phaseA + i * 0.4) + 0.035 * Math.sin(7 * t + phaseB + i);
      points.push([cx + Math.cos(t) * rx * wobble, cy + Math.sin(t) * ry * wobble]);
    }
    // Cut each ridge into 2–4 arcs.
    const cuts = 2 + Math.floor(rand() * 3);
    const cutAt = Array.from({ length: cuts }, () => Math.floor(rand() * steps)).sort((a, b) => a - b);
    let start = 0;
    for (const cut of [...cutAt, steps]) {
      const gap = 3 + Math.floor(rand() * 6);
      const segment = points.slice(start, Math.max(start + 2, cut - gap));
      if (segment.length > 2) {
        paths.push("M" + segment.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L"));
      }
      start = cut;
    }
  }
  return paths;
}

function barcode(seed, x, y, w, h) {
  const rand = rng(seed * 31 + 7);
  let out = "";
  let cursor = x;
  while (cursor < x + w) {
    const bar = 2 + Math.floor(rand() * 6);
    if (rand() > 0.45) {
      out += `<rect x="${cursor}" y="${y}" width="${bar}" height="${h}" fill="#1d1712"/>`;
    }
    cursor += bar + 1;
  }
  return out;
}

function speckles(seed) {
  const rand = rng(seed * 13 + 11);
  let out = "";
  for (let i = 0; i < 220; i++) {
    const x = rand() * CARD_W;
    const y = rand() * CARD_H;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + rand() * 1.8).toFixed(1)}" fill="#3b2f22" fill-opacity="${(0.15 + rand() * 0.35).toFixed(2)}"/>`;
  }
  return out;
}

function stamp(seed) {
  const rand = rng(seed * 5 + 1);
  const x = 380 + rand() * 120;
  const y = 560 + rand() * 60;
  const angle = -20 + rand() * 40;
  return `<g transform="rotate(${angle.toFixed(1)} ${x} ${y})" opacity="0.75">
    <rect x="${x - 80}" y="${y - 28}" width="160" height="56" fill="none" stroke="#8b1e1e" stroke-width="4"/>
    <text x="${x}" y="${y + 10}" text-anchor="middle" font-family="Courier New, monospace" font-size="26" font-weight="700" fill="#8b1e1e">DOWÓD ${seed}</text>
  </g>`;
}

// ARCore needs many unique, high-contrast corners spread over the whole image
// (arcoreimg score >= 75). Ridges alone are too repetitive, so the card gets a
// forensic scale on the edges, handwritten-looking notes and evidence markers.
function clutter(seed) {
  const rand = rng(seed * 47 + 19);
  let out = "";
  // L-shaped forensic scale along the left and top edge of the print area.
  for (let i = 0; i <= 40; i++) {
    const long = i % 5 === 0;
    const y = 110 + i * 11;
    out += `<line x1="22" y1="${y}" x2="${long ? 48 : 36}" y2="${y}" stroke="#1d1712" stroke-width="${long ? 3 : 2}"/>`;
    if (i % 10 === 0) {
      out += `<text x="52" y="${y + 6}" font-family="Courier New, monospace" font-size="15" fill="#1d1712">${i / 10}</text>`;
    }
  }
  // Scribbles: short irregular polylines like handwritten notes.
  for (let i = 0; i < 160; i++) {
    const x = 70 + rand() * 500;
    const y = 95 + rand() * 680;
    const inPrint = x > 140 && x < 460 && y > 150 && y < 510;
    if (inPrint) {
      continue;
    }
    let d = `M${x.toFixed(1)},${y.toFixed(1)}`;
    let cx = x;
    let cy = y;
    const segments = 3 + Math.floor(rand() * 5);
    for (let s = 0; s < segments; s++) {
      cx += 4 + rand() * 12;
      cy += (rand() - 0.5) * 16;
      d += ` L${cx.toFixed(1)},${cy.toFixed(1)}`;
    }
    out += `<path d="${d}" fill="none" stroke="#2a3f8f" stroke-width="${(1.5 + rand() * 2).toFixed(1)}" stroke-linejoin="round"/>`;
  }
  // Evidence markers: numbered triangles at random spots.
  for (let i = 0; i < 8; i++) {
    const x = rand() < 0.5 ? 95 + rand() * 30 : 480 + rand() * 40;
    const y = 120 + rand() * 440;
    out += `<g transform="rotate(${(rand() * 30 - 15).toFixed(1)} ${x} ${y})">
      <polygon points="${x},${y - 22} ${x + 20},${y + 14} ${x - 20},${y + 14}" fill="#f2b705" stroke="#1d1712" stroke-width="2"/>
      <text x="${x}" y="${y + 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#1d1712">${Math.floor(rand() * 9) + 1}</text>
    </g>`;
  }
  // Checkerboard calibration patch with a per-card random fill.
  const px = 360;
  const py = 690;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 9; c++) {
      if (rand() > 0.5) {
        out += `<rect x="${px + c * 22}" y="${py + r * 16}" width="22" height="16" fill="#1d1712"/>`;
      }
    }
  }
  return out;
}

function cardSvg(card) {
  const ridges = ridgePaths(card.id, card.core, CARD_W / 2, 330, 1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <rect width="${CARD_W}" height="${CARD_H}" fill="#f4eedf"/>
  ${speckles(card.id)}
  ${clutter(card.clutterSeed ?? card.id)}
  <rect x="10" y="10" width="${CARD_W - 20}" height="${CARD_H - 20}" fill="none" stroke="#1d1712" stroke-width="6"/>
  <rect x="10" y="10" width="${CARD_W - 20}" height="70" fill="#1d1712"/>
  <text x="30" y="56" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#f4eedf">DOWÓD NR ${card.id}</text>
  <text x="${CARD_W - 30}" y="56" text-anchor="end" font-family="Courier New, monospace" font-size="18" fill="#f4eedf">LAB. KRYMINALISTYKI</text>
  <g fill="none" stroke="#1d1712" stroke-width="5" stroke-linecap="round">
    ${ridges.map((d) => `<path d="${d}"/>`).join("\n    ")}
  </g>
  ${stamp(card.id)}
  <line x1="30" y1="600" x2="330" y2="600" stroke="#1d1712" stroke-width="2"/>
  <text x="30" y="640" font-family="Georgia, serif" font-size="24" fill="#1d1712">Miejsce: ${card.place}</text>
  <text x="30" y="676" font-family="Courier New, monospace" font-size="20" fill="#1d1712">Sygnatura: ${card.signature}</text>
  ${barcode(card.id, 30, 700, 300, 60)}
  <text x="${CARD_W - 30}" y="760" text-anchor="end" font-family="Courier New, monospace" font-size="16" fill="#3b2f22">Nr akt ${1000 + card.id * 137}/K/${20 + card.id}</text>
</svg>`;
}

// Same ridges, violet on transparent, cropped to the fingerprint area.
function glowSvg(card) {
  const ridges = ridgePaths(card.id, card.core, CARD_W / 2, 330, 1);
  const smudged = card.id === 4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <g fill="none" stroke-linecap="round">
    <g stroke="#a77bff" stroke-width="16" stroke-opacity="0.35">${ridges.map((d) => `<path d="${d}"/>`).join("")}</g>
    <g stroke="#c4a2ff" stroke-width="9" stroke-opacity="0.6">${ridges.map((d) => `<path d="${d}"/>`).join("")}</g>
    <g stroke="#f1e9ff" stroke-width="4" stroke-opacity="${smudged ? 0.45 : 1}">${ridges.map((d) => `<path d="${d}"/>`).join("")}</g>
  </g>
</svg>`;
}

async function main() {
  const sheetPath = process.argv[2];
  const outDir = path.join(__dirname, "..", "assets", "ar");
  fs.mkdirSync(outDir, { recursive: true });

  const cardBuffers = [];
  for (const card of CARDS) {
    const png = await sharp(Buffer.from(cardSvg(card))).png().toBuffer();
    cardBuffers.push(png);
    await sharp(png).toFile(path.join(outDir, `dowod-${card.id}.png`));
    // Crop to the print area around the ridges (x 120..480, y 130..530).
    const glow = await sharp(Buffer.from(glowSvg(card)))
      .extract({ left: 110, top: 120, width: 380, height: 420 })
      .png()
      .toBuffer();
    const blurred = await sharp(glow).blur(10).png().toBuffer();
    await sharp(blurred)
      .composite([{ input: glow }])
      .png()
      .toFile(path.join(outDir, `slad-uv-${card.id}.png`));
    await sharp(Buffer.from(holoSvg(card))).png().toFile(path.join(outDir, `holo-${card.id}.png`));
  }

  if (sheetPath) {
    // A4 at 300 dpi; a 90 mm card is 1063 px wide.
    const mm = 300 / 25.4;
    const cardW = Math.round(90 * mm);
    const cardH = Math.round(120 * mm);
    const marginX = Math.round((2480 - 2 * cardW) / 3);
    const marginY = Math.round((3508 - 2 * cardH) / 3);
    const composites = [];
    for (let i = 0; i < 4; i++) {
      const input = await sharp(cardBuffers[i]).resize(cardW, cardH).png().toBuffer();
      composites.push({
        input,
        left: marginX + (i % 2) * (cardW + marginX),
        top: marginY + Math.floor(i / 2) * (cardH + marginY),
      });
    }
    await sharp({ create: { width: 2480, height: 3508, channels: 3, background: "#ffffff" } })
      .composite(composites)
      .withMetadata({ density: 300 })
      .png()
      .toFile(sheetPath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
