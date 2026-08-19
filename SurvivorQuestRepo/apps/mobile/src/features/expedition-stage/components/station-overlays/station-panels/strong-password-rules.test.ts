import { buildStrongPasswordRules, type StrongPasswordLanguage } from "./strong-password-rules";

function findRule(
  rules: ReturnType<typeof buildStrongPasswordRules>,
  id: string,
) {
  const rule = rules.find((entry) => entry.id === id);
  if (!rule) {
    throw new Error(`"${id}" rule not found in generated rule set`);
  }
  return rule;
}

function findRomanSumRule(stationId: string) {
  return findRule(buildStrongPasswordRules(stationId, "medium", "polish"), "roman-sum");
}

// Mirrors strong-password-rules.ts's own MONTH_NAMES/code alphabet — brute-forcing
// against the public `validate` functions (rather than importing internals) finds
// which candidate the generator actually picked (the "month" rule now requires
// whatever the real current calendar month is, so this needs to cover all 12).
const MONTH_CANDIDATES_BY_LANGUAGE: Record<StrongPasswordLanguage, string[]> = {
  polish: [
    "styczeń",
    "luty",
    "marzec",
    "kwiecień",
    "maj",
    "czerwiec",
    "lipiec",
    "sierpień",
    "wrzesień",
    "październik",
    "listopad",
    "grudzień",
  ],
  english: [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ],
  ukrainian: [
    "січень",
    "лютий",
    "березень",
    "квітень",
    "травень",
    "червень",
    "липень",
    "серпень",
    "вересень",
    "жовтень",
    "листопад",
    "грудень",
  ],
  russian: [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
  ],
};

function findRequiredMonth(rules: ReturnType<typeof buildStrongPasswordRules>, language: StrongPasswordLanguage) {
  const monthRule = findRule(rules, "month");
  const candidate = MONTH_CANDIDATES_BY_LANGUAGE[language].find((word) => monthRule.validate(word));
  if (!candidate) {
    throw new Error("Could not determine the required month from the generated rule set");
  }
  return candidate;
}

function findRequiredCode(rules: ReturnType<typeof buildStrongPasswordRules>) {
  const codeRule = findRule(rules, "code");
  for (const prefix of ["SQ", "QUEST", "SURV"]) {
    for (let suffix = 10; suffix < 100; suffix += 1) {
      const candidate = `${prefix}${suffix}`;
      if (codeRule.validate(candidate)) {
        return candidate;
      }
    }
  }
  throw new Error("Could not determine the required code from the generated rule set");
}

describe("strong password month rule", () => {
  const languages: StrongPasswordLanguage[] = ["polish", "english", "ukrainian", "russian"];

  it.each(languages)("requires the actual current calendar month (%s), not a random pick", (language) => {
    const currentMonthWord = MONTH_CANDIDATES_BY_LANGUAGE[language][new Date().getMonth()];
    const rules = buildStrongPasswordRules("station-current-month", "medium", language);
    const monthRule = findRule(rules, "month");

    expect(monthRule.validate(currentMonthWord)).toBe(true);
    // The label shouldn't hand out the answer — it just points at "current month".
    expect(monthRule.label.toLowerCase()).not.toContain(currentMonthWord);
  });

  it("picks the same required month for every station on the same day", () => {
    const rulesA = buildStrongPasswordRules("station-a", "medium", "polish");
    const rulesB = buildStrongPasswordRules("station-b", "hard", "polish");
    expect(findRule(rulesA, "month").label).toBe(findRule(rulesB, "month").label);
  });
});

describe("strong password digit-sum rule", () => {
  it("stays satisfiable even though the required code and current year already force digits into the password", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const stationId = `station-digit-sum-solvable-${attempt}`;
      // "medium" (not "easy") so the "contains-year" rule — which forces the
      // current year's digits into the password too — is also active, same
      // as the "code" rule that's always on.
      const rules = buildStrongPasswordRules(stationId, "medium", "polish");
      const digitSumRule = findRule(rules, "digit-sum");
      const requiredCode = findRequiredCode(rules);
      const forcedText = `${requiredCode}${new Date().getFullYear()}`;

      // The forced code/year text alone must always be extendable up to the
      // target by padding with single digits — that proves the target was
      // shifted to sit at or above what's already forced in, not picked
      // independently of it.
      let solved = false;
      for (let padding = 0; padding <= 30 && !solved; padding += 1) {
        solved = digitSumRule.validate(`${forcedText}${"1".repeat(padding)}`);
      }

      expect(solved).toBe(true);
    }
  });
});

describe("strong password roman-sum rule", () => {
  it("sums roman numeral letter values regardless of case", () => {
    const rule = findRomanSumRule("station-roman-case");
    expect(rule.validate("xvi")).toBe(rule.validate("XVI"));
    expect(rule.validate("XvI")).toBe(rule.validate("XVI"));
  });

  it("treats visually-identical Cyrillic letters the same as their Latin roman-numeral counterparts", () => {
    const rule = findRomanSumRule("station-roman-cyrillic");
    // С/с (Cyrillic Es), Х/х (Cyrillic Ha), І/і (dotted I), М/м (Cyrillic Em)
    // look identical to Latin C, X, I, M but are different code points.
    expect(rule.validate("СХІМ")).toBe(rule.validate("CXIM"));
    expect(rule.validate("схім")).toBe(rule.validate("CXIM"));
  });

  it("is deterministic for the same station/difficulty/day", () => {
    const first = findRomanSumRule("station-deterministic");
    const second = findRomanSumRule("station-deterministic");
    expect(first.label).toBe(second.label);
    expect(first.validate("XVI")).toBe(second.validate("XVI"));
  });

  const languages: StrongPasswordLanguage[] = ["polish", "english", "ukrainian", "russian"];

  it.each(languages)(
    "stays satisfiable even though the required month/code text (%s) already contains roman letters",
    (language) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const stationId = `station-solvable-${language}-${attempt}`;
        const rules = buildStrongPasswordRules(stationId, "hard", language);
        const romanSumRule = findRule(rules, "roman-sum");
        const requiredMonth = findRequiredMonth(rules, language);
        const requiredCode = findRequiredCode(rules);
        const forcedText = `${requiredMonth}${requiredCode}`;

        // The forced month/code text alone must never already satisfy (or exceed
        // relevant padding) the target on its own for every station — that would
        // indicate the target wasn't actually shifted above the forced amount.
        let solved = false;
        for (let padding = 0; padding <= 60 && !solved; padding += 1) {
          solved = romanSumRule.validate(`${forcedText}${"I".repeat(padding)}`);
        }

        expect(solved).toBe(true);
      }
    },
  );
});
