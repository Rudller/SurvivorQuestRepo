const plugin = require("tailwindcss/plugin");

/**
 * Montserrat jako krój produktu, bez dotykania kodu.
 *
 * W src/ jest 282 klasy wagi (font-semibold i pokrewne) przy 494 elementach
 * tekstowych. Dopisanie fontFamily w każdym z tych miejsc byłoby projektem na
 * kilkaset edycji, więc zamiast tego rodzina dokłada się do samych utility
 * wag: każda istniejąca klasa zaczyna nieść i wagę, i krój.
 *
 * Wagi rozwiązują się natywnie wewnątrz rodziny, bo plugin expo-font generuje
 * na Androidzie XML font family z atrybutem app:fontWeight. Bez tego trzeba by
 * mieć osobną nazwę rodziny na każdą wagę.
 */
const FONT_FAMILY_UI = "Montserrat";

const withProductTypeface = plugin(({ addUtilities }) => {
  // Pełny komplet, bo core'owy plugin fontWeight jest wyłączony niżej — inaczej
  // klasy spoza tej listy przestałyby cokolwiek robić.
  const weights = {
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

  addUtilities(
    Object.fromEntries(
      Object.entries(weights).map(([className, weight]) => [
        `.${className}`,
        { fontFamily: FONT_FAMILY_UI, fontWeight: String(weight) },
      ]),
    ),
  );
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  // Core'owe utility wagi wygrywa kolejnością z tym, co dokłada plugin, więc
  // sama rodzina nie dolatywała do stylu. Wyłączenie go sprawia, że nie ma z
  // czym konkurować — komplet klas wagi dostarcza plugin powyżej.
  corePlugins: {
    fontWeight: false,
  },
  plugins: [withProductTypeface],
};
