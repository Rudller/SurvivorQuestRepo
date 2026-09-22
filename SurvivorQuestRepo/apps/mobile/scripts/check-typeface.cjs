/**
 * Bramka strategii typograficznej.
 *
 * W src/ jest 282 klasy wagi przy 494 elementach tekstowych. Dopisanie kroju w
 * każdym z tych miejsc byłoby projektem na kilkaset edycji, więc rodzina
 * dokłada się do samych utility wag w tailwind.config.js — każda istniejąca
 * klasa niesie i wagę, i krój, bez jednej edycji w kodzie.
 *
 * Dlaczego skrypt, a nie test jednostkowy: środowisko jest nie uruchamia tej
 * konfiguracji. Mapuje `font-semibold` na samą wagę ścieżką wbudowaną w
 * NativeWind, a próby wstrzyknięcia konfiguracji do kompilatora wewnątrz jest
 * kończyły się pustym wynikiem. Tutaj kompilujemy dokładnie to, co zobaczy
 * bundler, i sprawdzamy wynik.
 *
 * Uruchomienie: pnpm --filter mobile check:typeface
 */
const postcss = require("postcss");
const tailwind = require("tailwindcss");
const config = require("../tailwind.config.js");

const EXPECTED_FAMILY = "Montserrat";
const WEIGHTS = {
  "font-thin": 100,
  "font-extralight": 200,
  "font-light": 300,
  "font-normal": 400,
  "font-medium": 500,
  "font-semibold": 600,
  "font-bold": 700,
  "font-extrabold": 800,
  "font-black": 900,
};

const classNames = Object.keys(WEIGHTS);

postcss([
  tailwind({
    ...config,
    content: [{ raw: `<Text className="${classNames.join(" ")}" />`, extension: "tsx" }],
  }),
])
  .process("@tailwind utilities;", { from: undefined })
  .then((result) => {
    const problems = [];

    for (const [className, weight] of Object.entries(WEIGHTS)) {
      // Zwykłe wyszukiwanie zamiast wyrażenia regularnego: w literale
      // szablonowym `\.` i `\s` zwijają się do `.` i `s`, więc wzorzec budowany
      // z nazwy klasy po cichu przestawał pasować i skrypt zgłaszał brak reguły
      // tam, gdzie reguła była.
      const marker = `.${className} {`;
      const start = result.css.indexOf(marker);
      const end = start >= 0 ? result.css.indexOf("}", start) : -1;
      const rule = start >= 0 && end >= 0 ? result.css.slice(start, end + 1) : null;

      if (!rule) {
        problems.push(`${className}: brak reguły — core'owy plugin wagi jest wyłączony, więc ta klasa nic nie robi`);
        continue;
      }

      const body = rule.replace(/\s+/g, " ");

      if (!body.includes(`font-family: ${EXPECTED_FAMILY}`)) {
        problems.push(`${className}: brak rodziny ${EXPECTED_FAMILY} — ${body}`);
      }

      if (!body.includes(`font-weight: ${weight}`)) {
        problems.push(`${className}: zła waga, oczekiwano ${weight} — ${body}`);
      }
    }

    if (problems.length > 0) {
      console.error("Krój produktu NIE dolatuje na klasy wagi:");
      problems.forEach((problem) => console.error(`  - ${problem}`));
      process.exit(1);
    }

    console.log(`Krój produktu OK: ${classNames.length} klas wagi niesie rodzinę ${EXPECTED_FAMILY}.`);
  })
  .catch((error) => {
    console.error("Kompilacja konfiguracji Tailwinda nie powiodła się:", error.message);
    process.exit(1);
  });
