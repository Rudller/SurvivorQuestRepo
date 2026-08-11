export type ChallengeDifficulty = "easy" | "medium" | "hard";
export type StrongPasswordLanguage = "polish" | "english" | "ukrainian" | "russian";

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

const MONTH_POOLS: Record<StrongPasswordLanguage, string[]> = {
  polish: ["styczeń", "marzec", "maj", "lipiec", "październik", "grudzień"],
  english: ["january", "march", "may", "july", "october", "december"],
  ukrainian: ["січень", "березень", "травень", "липень", "жовтень", "грудень"],
  russian: ["январь", "март", "май", "июль", "октябрь", "декабрь"],
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

type RuleContext = {
  digitSum: number;
  romanSum: number;
  requiredEmoji: string;
  requiredMonth: string;
  requiredCode: string;
};

function buildRuleLabels(language: StrongPasswordLanguage, ctx: RuleContext): Record<string, string> {
  if (language === "english") {
    return {
      "not-empty": "Enter a password",
      length: "Password must be at least 8 characters long",
      digit: "Password must contain a digit",
      upper: "Password must contain an uppercase letter",
      special: "Password must contain a special character",
      "digit-sum": `The digits in the password must add up to ${ctx.digitSum}`,
      prime: "Password must contain a prime number",
      emoji: `Password must contain the emoji ${ctx.requiredEmoji}`,
      month: `Password must contain the word "${ctx.requiredMonth}"`,
      code: `Password must contain today's code ${ctx.requiredCode}`,
      "roman-sum": `All Roman numerals in the password must add up to ${ctx.romanSum}`,
      mirror: "Password must contain a fragment and its reverse, e.g. cat and tac",
      "no-space": "Password must not contain spaces",
      "lower-count": "Password must contain at least 5 lowercase letters",
      dash: "Password must contain a dash",
      "ends-number": "Password must end with a digit",
      "contains-year": "Password must contain the current year",
      "double-letter": "Password must contain a double letter",
      long: "Password must be at least 18 characters long",
      "very-long": "Password must be at least 28 characters long",
    };
  }

  if (language === "ukrainian") {
    return {
      "not-empty": "Введіть пароль",
      length: "Пароль має містити щонайменше 8 символів",
      digit: "Пароль має містити цифру",
      upper: "Пароль має містити велику літеру",
      special: "Пароль має містити спеціальний символ",
      "digit-sum": `Сума цифр у паролі має дорівнювати ${ctx.digitSum}`,
      prime: "Пароль має містити просте число",
      emoji: `Пароль має містити емодзі ${ctx.requiredEmoji}`,
      month: `Пароль має містити слово «${ctx.requiredMonth}»`,
      code: `Пароль має містити код дня ${ctx.requiredCode}`,
      "roman-sum": `Сума всіх римських цифр у паролі має дорівнювати ${ctx.romanSum}`,
      mirror: "Пароль має містити фрагмент та його дзеркальне відображення, напр. кіт і тік",
      "no-space": "Пароль не повинен містити пробілів",
      "lower-count": "Пароль має містити щонайменше 5 малих літер",
      dash: "Пароль має містити дефіс",
      "ends-number": "Пароль має закінчуватися цифрою",
      "contains-year": "Пароль має містити поточний рік",
      "double-letter": "Пароль має містити подвоєну літеру",
      long: "Пароль має містити щонайменше 18 символів",
      "very-long": "Пароль має містити щонайменше 28 символів",
    };
  }

  if (language === "russian") {
    return {
      "not-empty": "Введите пароль",
      length: "Пароль должен содержать не менее 8 символов",
      digit: "Пароль должен содержать цифру",
      upper: "Пароль должен содержать заглавную букву",
      special: "Пароль должен содержать специальный символ",
      "digit-sum": `Сумма цифр в пароле должна равняться ${ctx.digitSum}`,
      prime: "Пароль должен содержать простое число",
      emoji: `Пароль должен содержать эмодзи ${ctx.requiredEmoji}`,
      month: `Пароль должен содержать слово «${ctx.requiredMonth}»`,
      code: `Пароль должен содержать код дня ${ctx.requiredCode}`,
      "roman-sum": `Сумма всех римских цифр в пароле должна равняться ${ctx.romanSum}`,
      mirror: "Пароль должен содержать фрагмент и его зеркальное отражение, напр. кот и ток",
      "no-space": "Пароль не должен содержать пробелов",
      "lower-count": "Пароль должен содержать не менее 5 строчных букв",
      dash: "Пароль должен содержать дефис",
      "ends-number": "Пароль должен заканчиваться цифрой",
      "contains-year": "Пароль должен содержать текущий год",
      "double-letter": "Пароль должен содержать двойную букву",
      long: "Пароль должен содержать не менее 18 символов",
      "very-long": "Пароль должен содержать не менее 28 символов",
    };
  }

  return {
    "not-empty": "Wprowadź hasło",
    length: "Hasło ma mieć co najmniej 8 znaków",
    digit: "Hasło ma zawierać cyfrę",
    upper: "Hasło ma zawierać wielką literę",
    special: "Hasło ma zawierać znak specjalny",
    "digit-sum": `Suma cyfr w haśle ma wynosić ${ctx.digitSum}`,
    prime: "Hasło ma zawierać liczbę pierwszą",
    emoji: `Hasło ma zawierać emoji ${ctx.requiredEmoji}`,
    month: `Hasło ma zawierać słowo „${ctx.requiredMonth}”`,
    code: `Hasło ma zawierać kod dnia ${ctx.requiredCode}`,
    "roman-sum": `Wszystkie rzymskie cyfry w haśle mają mieć sumę ${ctx.romanSum}`,
    mirror: "Hasło ma zawierać fragment oraz jego odwrócenie, np. kot i tok",
    "no-space": "Hasło nie może zawierać spacji",
    "lower-count": "Hasło ma zawierać co najmniej 5 małych liter",
    dash: "Hasło ma zawierać myślnik",
    "ends-number": "Hasło ma kończyć się cyfrą",
    "contains-year": "Hasło ma zawierać aktualny rok",
    "double-letter": "Hasło ma zawierać podwójną literę",
    long: "Hasło ma mieć co najmniej 18 znaków",
    "very-long": "Hasło ma mieć co najmniej 28 znaków",
  };
}

export function buildStrongPasswordRules(
  stationId: string,
  difficulty: ChallengeDifficulty,
  language: StrongPasswordLanguage = "polish",
): StrongPasswordRule[] {
  const random = createRandom(`${todayKey()}:${stationId}:${difficulty}`);
  const digitSum = 12 + Math.floor(random() * 16);
  const romanSum = 20 + Math.floor(random() * 31);
  const requiredEmoji = pick(["🔥", "🧠", "🚀", "🌲", "⚡", "🏕️"], random);
  const requiredMonth = pick(MONTH_POOLS[language], random).toLowerCase();
  const requiredCode = `${pick(["SQ", "QUEST", "SURV"], random)}${10 + Math.floor(random() * 90)}`;
  const labels = buildRuleLabels(language, { digitSum, romanSum, requiredEmoji, requiredMonth, requiredCode });

  const baseRules: StrongPasswordRule[] = [
    { id: "not-empty", label: labels["not-empty"], validate: (password) => password.length > 0 },
    { id: "length", label: labels.length, validate: (password) => password.length >= 8 },
    { id: "digit", label: labels.digit, validate: (password) => /\d/.test(password) },
    { id: "upper", label: labels.upper, validate: (password) => /\p{Lu}/u.test(password) },
    { id: "special", label: labels.special, validate: (password) => /[^\p{L}\p{N}\s]/u.test(password) },
    { id: "digit-sum", label: labels["digit-sum"], validate: (password) => sumDigits(password) === digitSum },
    { id: "prime", label: labels.prime, validate: hasPrimeNumber },
    {
      id: "emoji",
      label: labels.emoji,
      validate: (password) => password.replace(/️/g, "").includes(requiredEmoji.replace(/️/g, "")),
    },
    { id: "month", label: labels.month, validate: (password) => password.toLowerCase().includes(requiredMonth) },
    { id: "code", label: labels.code, validate: (password) => password.toUpperCase().includes(requiredCode) },
  ];
  const absurdRules: StrongPasswordRule[] = [
    {
      id: "roman-sum",
      label: labels["roman-sum"],
      validate: (password) => sumRomanNumerals(password) === romanSum,
    },
    {
      id: "mirror",
      label: labels.mirror,
      validate: (password) => /(.{3}).*\1/.test(`${password}${Array.from(password).reverse().join("")}`),
    },
    { id: "no-space", label: labels["no-space"], validate: (password) => !/\s/.test(password) },
    {
      id: "lower-count",
      label: labels["lower-count"],
      validate: (password) => (password.match(/\p{Ll}/gu) ?? []).length >= 5,
    },
    { id: "dash", label: labels.dash, validate: (password) => password.includes("-") },
    { id: "ends-number", label: labels["ends-number"], validate: (password) => /\d$/.test(password) },
    {
      id: "contains-year",
      label: labels["contains-year"],
      validate: (password) => password.includes(String(new Date().getFullYear())),
    },
    {
      id: "double-letter",
      label: labels["double-letter"],
      validate: (password) => /(\p{L})\1/u.test(password),
    },
    { id: "long", label: labels.long, validate: (password) => password.length >= 18 },
    { id: "very-long", label: labels["very-long"], validate: (password) => password.length >= 28 },
  ];
  const pool = [...baseRules, ...absurdRules, ...absurdRules.map((rule, index) => ({ ...rule, id: `${rule.id}-${index}` }))];
  return pool.slice(0, getStrongPasswordRuleCount(difficulty));
}
