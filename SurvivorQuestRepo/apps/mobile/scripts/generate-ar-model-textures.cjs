/* global __dirname, Buffer */
// Tekstury modeli 3D stanowisk AR (sejf, bomba, dowód, szkatułka):
// assets/ar/models/*.png. Modele same w sobie składają się z prostych brył
// Viro (ar-models/models/*.tsx), tekstury dodają im szczegóły.
//
// Uruchom: node scripts/generate-ar-model-textures.cjs
const path = require("path");
const fs = require("fs");

const sharp = require(require.resolve("sharp", {
  paths: [path.join(__dirname, "..", "..", "..", "node_modules", ".pnpm", "sharp@0.34.5", "node_modules")],
}));

const OUT = path.join(__dirname, "..", "assets", "ar", "models");

function rng(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Tarcza pokrętła: cyfra d leży d * 36° zgodnie z ruchem wskazówek od góry.
function dialSvg() {
  const size = 512;
  const c = size / 2;
  let marks = "";
  for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * Math.PI * 2;
    const long = i % 5 === 0;
    const r1 = 230;
    const r2 = long ? 196 : 212;
    marks += `<line x1="${c + Math.sin(angle) * r1}" y1="${c - Math.cos(angle) * r1}" x2="${c + Math.sin(angle) * r2}" y2="${c - Math.cos(angle) * r2}" stroke="#e5e7eb" stroke-width="${long ? 6 : 3}"/>`;
  }
  let digits = "";
  for (let d = 0; d < 10; d++) {
    const angle = (d / 10) * Math.PI * 2;
    const r = 160;
    digits += `<text x="${c + Math.sin(angle) * r}" y="${c - Math.cos(angle) * r + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#f8fafc">${d}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs><radialGradient id="g" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#4b5563"/><stop offset="1" stop-color="#111827"/></radialGradient></defs>
  <circle cx="${c}" cy="${c}" r="250" fill="url(#g)" stroke="#9ca3af" stroke-width="8"/>
  ${marks}
  ${digits}
  <circle cx="${c}" cy="${c}" r="70" fill="#1f2937" stroke="#6b7280" stroke-width="6"/>
  <rect x="${c - 12}" y="${c - 60}" width="24" height="120" rx="8" fill="#9ca3af"/>
</svg>`;
}

function safeFrontSvg() {
  const w = 512;
  let rivets = "";
  for (let i = 0; i < 6; i++) {
    const p = 40 + i * 86;
    for (const [x, y] of [[p, 28], [p, w - 28], [28, p], [w - 28, p]]) {
      rivets += `<circle cx="${x}" cy="${y}" r="9" fill="#6b7280" stroke="#d1d5db" stroke-width="2"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${w}">
  <defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#64748b"/><stop offset="0.5" stop-color="#334155"/><stop offset="1" stop-color="#1e293b"/></linearGradient></defs>
  <rect width="${w}" height="${w}" fill="url(#m)"/>
  <rect x="56" y="56" width="${w - 112}" height="${w - 112}" fill="none" stroke="#94a3b8" stroke-width="6"/>
  ${rivets}
  <rect x="156" y="420" width="200" height="44" rx="6" fill="#b45309" stroke="#fbbf24" stroke-width="3"/>
  <text x="256" y="452" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#fef3c7">SEJF</text>
</svg>`;
}

function woodSvg(seed, base, dark) {
  const rand = rng(seed);
  let grain = "";
  for (let i = 0; i < 46; i++) {
    const y = i * 11 + rand() * 6;
    let d = `M0,${y.toFixed(1)}`;
    for (let x = 32; x <= 512; x += 32) {
      d += ` Q${x - 16},${(y + (rand() - 0.5) * 10).toFixed(1)} ${x},${(y + (rand() - 0.5) * 6).toFixed(1)}`;
    }
    grain += `<path d="${d}" fill="none" stroke="${dark}" stroke-width="${(1 + rand() * 3).toFixed(1)}" stroke-opacity="${(0.25 + rand() * 0.4).toFixed(2)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="${base}"/>${grain}</svg>`;
}

function tntSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="512">
  <rect width="256" height="512" fill="#b91c1c"/>
  <rect x="0" y="0" width="22" height="512" fill="#7f1d1d" opacity="0.6"/>
  <rect x="234" y="0" width="22" height="512" fill="#7f1d1d" opacity="0.6"/>
  <text x="128" y="280" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="78" font-weight="900" fill="#fef2f2" transform="rotate(-90 128 256)">TNT</text>
</svg>`;
}

// Symbole szkatułki — kolejność musi zgadzać się z PUZZLE_SYMBOLS.
const SYMBOLS = [
  {
    word: "SŁOŃCE",
    shape: `<circle cx="128" cy="110" r="44" fill="#f59e0b"/>${Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return `<line x1="${128 + Math.cos(a) * 56}" y1="${110 + Math.sin(a) * 56}" x2="${128 + Math.cos(a) * 80}" y2="${110 + Math.sin(a) * 80}" stroke="#f59e0b" stroke-width="10" stroke-linecap="round"/>`;
    }).join("")}`,
  },
  {
    word: "KSIĘŻYC",
    shape: `<circle cx="128" cy="110" r="70" fill="#e2e8f0"/><circle cx="160" cy="92" r="62" fill="#3b2a1a"/>`,
  },
  {
    word: "GWIAZDA",
    shape: `<polygon points="${Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 === 0 ? 82 : 34;
      return `${(128 + Math.cos(a) * r).toFixed(1)},${(112 + Math.sin(a) * r).toFixed(1)}`;
    }).join(" ")}" fill="#fde047"/>`,
  },
  {
    word: "KLUCZ",
    shape: `<circle cx="78" cy="110" r="34" fill="none" stroke="#fbbf24" stroke-width="16"/><rect x="108" y="102" width="110" height="16" fill="#fbbf24"/><rect x="180" y="118" width="14" height="28" fill="#fbbf24"/><rect x="204" y="118" width="14" height="20" fill="#fbbf24"/>`,
  },
];

function symbolSvg(symbol) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
  <rect width="256" height="256" fill="#3b2a1a"/>
  <rect x="10" y="10" width="236" height="236" fill="none" stroke="#d6a756" stroke-width="8"/>
  ${symbol.shape}
  <text x="128" y="226" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-weight="700" fill="#f5deb3">${symbol.word}</text>
</svg>`;
}

async function write(name, svg) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, name));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await write("dial.png", dialSvg());
  await write("safe-front.png", safeFrontSvg());
  await write("wood.png", woodSvg(3, "#7c4a21", "#3b2410"));
  await write("wood-dark.png", woodSvg(7, "#4a2c14", "#1f1208"));
  await write("tnt.png", tntSvg());
  for (let i = 0; i < SYMBOLS.length; i++) {
    await write(`symbol-${i}.png`, symbolSvg(SYMBOLS[i]));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
