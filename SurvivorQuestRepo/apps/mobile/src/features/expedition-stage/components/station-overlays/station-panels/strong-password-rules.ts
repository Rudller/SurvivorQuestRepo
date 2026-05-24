export type ChallengeDifficulty = "easy" | "medium" | "hard";

export type StrongPasswordRule = {
  id: string;
  label: string;
  validate: (password: string) => boolean;
};

const ROMAN_VALUES: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function pick<T>(items: T[], random: () => number) {
  return items[Math.floor(random() * items.length) % items.length];
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function sumDigits(password: string) {
  return Array.from(password).reduce((sum, character) => sum + (/\d/.test(character) ? Number(character) : 0), 0);
}

function sumRomanNumerals(password: string) {
  return Array.from(password.toUpperCase()).reduce((sum, character) => sum + (ROMAN_VALUES[character] ?? 0), 0);
}

function hasPrimeNumber(password: string) {
  const numbers = password.match(/\d+/g) ?? [];
  return numbers.some((value) => {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 2 || number > 997) {
      return false;
    }
    for (let divisor = 2; divisor <= Math.sqrt(number); divisor += 1) {
      if (number % divisor === 0) {
        return false;
      }
    }
    return true;
  });
}

export function getStrongPasswordRuleCount(difficulty: ChallengeDifficulty) {
  if (difficulty === "easy") return 10;
  if (difficulty === "hard") return 30;
  return 20;
}

export function getDifficultyPointsMultiplier(difficulty: ChallengeDifficulty) {
  if (difficulty === "easy") return 0.5;
  if (difficulty === "hard") return 1.5;
  return 1;
}

export function buildStrongPasswordRules(stationId: string, difficulty: ChallengeDifficulty): StrongPasswordRule[] {
  const random = createRandom(`${todayKey()}:${stationId}:${difficulty}`);
  const digitSum = 12 + Math.floor(random() * 16);
  const romanSum = 20 + Math.floor(random() * 31);
  const requiredEmoji = pick(["🔥", "🧠", "🚀", "🌲", "⚡", "🏕️"], random);
  const requiredMonth = pick(["maj", "mars", "july", "luty", "april", "grudzień"], random).toLowerCase();
  const requiredCode = `${pick(["SQ", "QUEST", "SURV"], random)}${10 + Math.floor(random() * 90)}`;
  const baseRules: StrongPasswordRule[] = [
    { id: "not-empty", label: "Wprowadź hasło", validate: (password) => password.length > 0 },
    { id: "length", label: "Hasło ma mieć co najmniej 8 znaków", validate: (password) => password.length >= 8 },
    { id: "digit", label: "Hasło ma zawierać cyfrę", validate: (password) => /\d/.test(password) },
    { id: "upper", label: "Hasło ma zawierać wielką literę", validate: (password) => /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(password) },
    { id: "special", label: "Hasło ma zawierać znak specjalny", validate: (password) => /[^\p{L}\p{N}\s]/u.test(password) },
    { id: "digit-sum", label: `Suma cyfr w haśle ma wynosić ${digitSum}`, validate: (password) => sumDigits(password) === digitSum },
    { id: "prime", label: "Hasło ma zawierać liczbę pierwszą", validate: hasPrimeNumber },
    { id: "emoji", label: `Hasło ma zawierać emoji ${requiredEmoji}`, validate: (password) => password.includes(requiredEmoji) },
    { id: "month", label: `Hasło ma zawierać słowo „${requiredMonth}”`, validate: (password) => password.toLowerCase().includes(requiredMonth) },
    { id: "code", label: `Hasło ma zawierać kod dnia ${requiredCode}`, validate: (password) => password.toUpperCase().includes(requiredCode) },
  ];
  const absurdRules: StrongPasswordRule[] = [
    { id: "roman-sum", label: `Wszystkie rzymskie cyfry w haśle mają mieć sumę ${romanSum}`, validate: (password) => sumRomanNumerals(password) === romanSum },
    { id: "mirror", label: "Hasło ma zawierać fragment oraz jego odwrócenie, np. kot i tok", validate: (password) => /(.{3}).*\1/.test(`${password}${Array.from(password).reverse().join("")}`) },
    { id: "no-space", label: "Hasło nie może zawierać spacji", validate: (password) => !/\s/.test(password) },
    { id: "lower-count", label: "Hasło ma zawierać co najmniej 5 małych liter", validate: (password) => (password.match(/[a-ząćęłńóśźż]/g) ?? []).length >= 5 },
    { id: "dash", label: "Hasło ma zawierać myślnik", validate: (password) => password.includes("-") },
    { id: "ends-number", label: "Hasło ma kończyć się cyfrą", validate: (password) => /\d$/.test(password) },
    { id: "contains-year", label: "Hasło ma zawierać aktualny rok", validate: (password) => password.includes(String(new Date().getFullYear())) },
    { id: "double-letter", label: "Hasło ma zawierać podwójną literę", validate: (password) => /([a-ząćęłńóśźż])\1/i.test(password) },
    { id: "long", label: "Hasło ma mieć co najmniej 18 znaków", validate: (password) => password.length >= 18 },
    { id: "very-long", label: "Hasło ma mieć co najmniej 28 znaków", validate: (password) => password.length >= 28 },
  ];
  const pool = [...baseRules, ...absurdRules, ...absurdRules.map((rule, index) => ({ ...rule, id: `${rule.id}-${index}` }))];
  return pool.slice(0, getStrongPasswordRuleCount(difficulty));
}
