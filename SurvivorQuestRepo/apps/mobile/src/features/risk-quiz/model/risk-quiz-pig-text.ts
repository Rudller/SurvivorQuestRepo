import type { UiLanguage } from "../../i18n";
import type { RiskPigType } from "../api/risk-quiz.api";

export type RiskPigText = {
  labels: Record<RiskPigType, string>;
  /** Doubles as the briefing card: says what is happening *and* what to do. */
  descriptions: Record<RiskPigType, string>;
  /** Briefing headline, shown before the effect itself appears. */
  incoming: string;
  /** On-screen coaching while an effect that needs a physical action is live. */
  overheadHint: string;
  darknessHint: string;
  silenceHint: string;
  /** Heading over the pig's description, before it has been thrown. */
  heading: (label: string) => string;
  /** Banner above the card: who sent it and how long is left. */
  banner: (label: string, secondsLeft: number, fromName: string | null) => string;
  throwAction: (label: string) => string;
};

/**
 * The pig mechanic in four languages.
 *
 * These were Polish-only, so an English-speaking team got a briefing card they
 * could not read for an effect that hides their screen — the one moment in the
 * mode where not understanding the instruction costs them the card.
 */
export const RISK_PIG_TEXT: Record<UiLanguage, RiskPigText> = {
  polish: {
    labels: {
      FLASHLIGHT: "Latarka",
      UPSIDE_DOWN: "Do góry nogami",
      SHAKE: "Trzęsienie",
      FOG: "Mgła",
      DARKNESS: "Ciemność",
      OVERHEAD: "Nad głową",
      MIRROR: "Lustro",
      SLIDE: "Ślizg",
      SILENCE: "Cisza",
    },
    descriptions: {
      FLASHLIGHT: "Ekran gaśnie. Przesuwaj palcem — świeci tylko krąg pod palcem.",
      UPSIDE_DOWN: "Ekran staje na głowie. Obróćcie tablet.",
      SHAKE: "Ekran się trzęsie. Celujcie uważniej.",
      FOG: "Ekran zachodzi mgłą. Przecierajcie go palcem na boki tam, gdzie chcecie widzieć — przetarte miejsce powoli zachodzi z powrotem.",
      DARKNESS: "Ekran widać tylko w ciemności — im ciemniej, tym wyraźniej. Schowajcie tablet przed światłem.",
      OVERHEAD: "Ekran świeci tylko trzymany nad głową, ekranem w dół.",
      MIRROR: "Ekran w lustrze. Wszystko jest odbite — czytajcie i celujcie na odwrót.",
      SLIDE: "Ekran ucieka po tablecie. Celujcie z wyprzedzeniem.",
      SILENCE: "Ekran widać tylko w ciszy. Im głośniej mówicie, tym ciemniej — tablet was słyszy.",
    },
    heading: (label) => `Świnia: ${label}`,
    incoming: "Dostajesz świnię",
    overheadHint: "Podnieś tablet nad głowę ekranem w dół",
    darknessHint: "Schowajcie tablet przed światłem — im ciemniej, tym więcej widać",
    silenceHint: "Ciszej — im głośniej, tym mniej widać",
    banner: (label, secondsLeft, fromName) =>
      fromName ? `Świnia od ${fromName}: ${label} · ${secondsLeft}s` : `Świnia: ${label} · ${secondsLeft}s`,
    throwAction: (label) => `Rzuć świnię: ${label}`,
  },
  english: {
    labels: {
      FLASHLIGHT: "Flashlight",
      UPSIDE_DOWN: "Upside down",
      SHAKE: "Earthquake",
      FOG: "Fog",
      DARKNESS: "Darkness",
      OVERHEAD: "Overhead",
      MIRROR: "Mirror",
      SLIDE: "Slide",
      SILENCE: "Silence",
    },
    descriptions: {
      FLASHLIGHT: "The screen goes dark. Drag your finger — only the circle under it lights up.",
      UPSIDE_DOWN: "The screen turns over. Rotate the tablet.",
      SHAKE: "The screen shakes. Aim more carefully.",
      FOG: "Fog covers the screen. Wipe it sideways with a finger where you want to see — the cleared patch slowly fogs over again.",
      DARKNESS: "The screen shows only in the dark — the darker it gets, the clearer it is. Hide the tablet from the light.",
      OVERHEAD: "The screen lights up only when held above your head, facing down.",
      MIRROR: "The screen is mirrored. Everything is flipped — read and aim the other way round.",
      SLIDE: "The screen drifts across the tablet. Aim ahead of it.",
      SILENCE: "The screen shows only in silence. The louder you talk, the darker it gets — the tablet hears you.",
    },
    heading: (label) => `Pig: ${label}`,
    incoming: "A pig is coming your way",
    overheadHint: "Hold the tablet above your head, screen facing down",
    darknessHint: "Hide the tablet from the light — the darker it is, the more you see",
    silenceHint: "Quieter — the louder you are, the less you see",
    banner: (label, secondsLeft, fromName) =>
      fromName ? `Pig from ${fromName}: ${label} · ${secondsLeft}s` : `Pig: ${label} · ${secondsLeft}s`,
    throwAction: (label) => `Throw a pig: ${label}`,
  },
  ukrainian: {
    labels: {
      FLASHLIGHT: "Ліхтарик",
      UPSIDE_DOWN: "Догори дриґом",
      SHAKE: "Трясіння",
      FOG: "Туман",
      DARKNESS: "Темрява",
      OVERHEAD: "Над головою",
      MIRROR: "Дзеркало",
      SLIDE: "Ковзання",
      SILENCE: "Тиша",
    },
    descriptions: {
      FLASHLIGHT: "Екран гасне. Ведіть пальцем — світиться лише коло під ним.",
      UPSIDE_DOWN: "Екран перевертається. Оберніть планшет.",
      SHAKE: "Екран трясеться. Цільтеся уважніше.",
      FOG: "Екран затягує туманом. Протирайте його пальцем убік там, де хочете бачити — протерте місце поволі затягується знову.",
      DARKNESS: "Екран видно лише в темряві — що темніше, то чіткіше. Сховайте планшет від світла.",
      OVERHEAD: "Екран світиться лише над головою, екраном донизу.",
      MIRROR: "Екран у дзеркалі. Усе віддзеркалено — читайте й цільтеся навпаки.",
      SLIDE: "Екран тікає по планшету. Цільтеся на випередження.",
      SILENCE: "Екран видно лише в тиші. Що гучніше говорите, то темніше — планшет вас чує.",
    },
    heading: (label) => `Свиня: ${label}`,
    incoming: "До вас летить свиня",
    overheadHint: "Підніміть планшет над головою екраном донизу",
    darknessHint: "Сховайте планшет від світла — що темніше, то більше видно",
    silenceHint: "Тихіше — що гучніше, то менше видно",
    banner: (label, secondsLeft, fromName) =>
      fromName ? `Свиня від ${fromName}: ${label} · ${secondsLeft}с` : `Свиня: ${label} · ${secondsLeft}с`,
    throwAction: (label) => `Кинути свиню: ${label}`,
  },
  russian: {
    labels: {
      FLASHLIGHT: "Фонарик",
      UPSIDE_DOWN: "Вверх ногами",
      SHAKE: "Тряска",
      FOG: "Туман",
      DARKNESS: "Темнота",
      OVERHEAD: "Над головой",
      MIRROR: "Зеркало",
      SLIDE: "Скольжение",
      SILENCE: "Тишина",
    },
    descriptions: {
      FLASHLIGHT: "Экран гаснет. Ведите пальцем — светится только круг под ним.",
      UPSIDE_DOWN: "Экран переворачивается. Переверните планшет.",
      SHAKE: "Экран трясётся. Целитесь внимательнее.",
      FOG: "Экран затягивает туманом. Протирайте его пальцем в стороны там, где хотите видеть — протёртое место медленно затягивается снова.",
      DARKNESS: "Экран виден только в темноте — чем темнее, тем чётче. Спрячьте планшет от света.",
      OVERHEAD: "Экран светится только над головой, экраном вниз.",
      MIRROR: "Экран в зеркале. Всё отражено — читайте и целитесь наоборот.",
      SLIDE: "Экран убегает по планшету. Целитесь с упреждением.",
      SILENCE: "Экран виден только в тишине. Чем громче говорите, тем темнее — планшет вас слышит.",
    },
    heading: (label) => `Свинья: ${label}`,
    incoming: "К вам летит свинья",
    overheadHint: "Поднимите планшет над головой экраном вниз",
    darknessHint: "Спрячьте планшет от света — чем темнее, тем больше видно",
    silenceHint: "Тише — чем громче, тем меньше видно",
    banner: (label, secondsLeft, fromName) =>
      fromName ? `Свинья от ${fromName}: ${label} · ${secondsLeft}с` : `Свинья: ${label} · ${secondsLeft}с`,
    throwAction: (label) => `Бросить свинью: ${label}`,
  },
};
