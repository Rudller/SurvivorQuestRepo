// Stanowiska z modelem 3D zapisują się i sprawdzają jak pytanie otwarte: model
// tylko składa odpowiedź, którą potem sprawdza zwykły przepływ open-quiz.
// Odpowiedź budujemy na wzór poprawnej odpowiedzi z admina (te same separatory),
// więc "4-1-7" i "niebieski, czerwony" porównują się bez dodatkowych reguł.
// Formaty muszą zgadzać się z getOpenAnswerFieldCopy w apps/admin.

export type ArModelKind = "ar-safe" | "ar-bomb" | "ar-artifact" | "ar-puzzle-box";

export function isArModelKind(value: string): value is ArModelKind {
  return value === "ar-safe" || value === "ar-bomb" || value === "ar-artifact" || value === "ar-puzzle-box";
}

export const BOMB_WIRES = [
  { key: "czerwony", color: "#dc2626" },
  { key: "niebieski", color: "#2563eb" },
  { key: "żółty", color: "#facc15" },
  { key: "zielony", color: "#16a34a" },
  { key: "biały", color: "#f1f5f9" },
] as const;

export const PUZZLE_SYMBOLS = ["słońce", "księżyc", "gwiazda", "klucz"] as const;

export const SAFE_DEFAULT_DIGITS = 3;
export const BOMB_DEFAULT_WIRES = 3;

const DIACRITICS: Record<string, string> = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };

function fold(value: string) {
  return value
    .toLowerCase()
    .split("")
    .map((character) => DIACRITICS[character] ?? character)
    .join("");
}

export function countDigits(expected: string) {
  return (expected.match(/[0-9]/g) ?? []).length;
}

// Cyfry wpisane pokrętłem wstawiamy w miejsca cyfr wzoru: "4-1-7" + [3,1,7] -> "3-1-7".
export function buildDigitAnswer(expected: string, digits: number[]) {
  if (countDigits(expected) === 0) {
    return digits.join("");
  }
  let index = 0;
  return expected.replace(/[0-9]/g, () => String(digits[index++] ?? ""));
}

type TokenMatch = { start: number; end: number; key: string };

// Słowa ze słownika (kolory kabli, symbole) w kolejności z odpowiedzi admina,
// bez względu na wielkość liter i polskie znaki.
function findTokens(expected: string, vocabulary: readonly string[]): TokenMatch[] {
  const folded = fold(expected);
  const matches: TokenMatch[] = [];
  for (const key of vocabulary) {
    const needle = fold(key);
    let from = 0;
    for (;;) {
      const start = folded.indexOf(needle, from);
      if (start < 0) {
        break;
      }
      matches.push({ start, end: start + needle.length, key });
      from = start + needle.length;
    }
  }
  return matches.sort((left, right) => left.start - right.start);
}

export function parseTokens(expected: string, vocabulary: readonly string[]) {
  return findTokens(expected, vocabulary).map((match) => match.key);
}

export function buildTokenAnswer(expected: string, vocabulary: readonly string[], chosen: string[]) {
  const matches = findTokens(expected, vocabulary);
  if (matches.length === 0) {
    return chosen.join(", ");
  }
  let result = "";
  let cursor = 0;
  matches.forEach((match, index) => {
    result += expected.slice(cursor, match.start) + (chosen[index] ?? "");
    cursor = match.end;
  });
  // Nadmiarowe wybory (gdyby gracz wybrał więcej niż wzór) też trafiają do
  // odpowiedzi, żeby nie uznać częściowej zgodności za poprawną.
  const extra = chosen.slice(matches.length);
  return result + expected.slice(cursor) + (extra.length > 0 ? `, ${extra.join(", ")}` : "");
}
