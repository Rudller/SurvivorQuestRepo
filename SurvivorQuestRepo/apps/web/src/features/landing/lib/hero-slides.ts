export type HeroHighlight = {
  value: string;
  label: string;
};

export type HeroSlide = {
  src: string;
  alt: string;
  /** Short name shown on the picker at the bottom of the hero — the first slide is the brand, the rest are the offer. */
  label: string;
  /** Copy that swaps together with the photo. */
  eyebrow: string;
  title: string;
  lead: string;
  /** Three figures under the lead — each format argues with its own numbers. */
  highlights: readonly HeroHighlight[];
  /** Subject line of the quote e-mail, so a reply already says which format the visitor was looking at. */
  quoteSubject: string;
  /** Second button: the brand slide points at the offer, a format slide at its own card. */
  secondaryCta: { label: string; href: string };
};

/**
 * One slide per thing we sell, in the order the offer section lists them, with
 * an opening slide that frames the whole thing. The photos live in
 * `public/hero` under the same names as the formats they illustrate.
 *
 * The first slide is what the server renders, so it carries the page's
 * headline for search engines and doubles as the Open Graph image (see
 * `OG_IMAGE`) — keep it a real, landscape photo with the umbrella message.
 *
 * Highlights stay on what we can stand behind: the Ryzykanci figures come from
 * the game's own poster, the rest describe how a format works rather than
 * promising numbers nobody has confirmed.
 */
export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    src: "/hero/survivorquest.png",
    alt: "Drużyna przy stoliku z tabletami SurvivorQuest w hotelowym lobby.",
    label: "SurvivorQuest",
    eyebrow: "Eventy firmowe prowadzone w aplikacji",
    title: "Gra terenowa, gra hotelowa i quiz drużynowy dla Twojej firmy — organizujemy od scenariusza po ranking na żywo.",
    lead:
      "SurvivorQuest (Survivor Quest) to integracje, w których drużyny grają na tabletach: mapa, kody QR, zadania o Waszej firmie i wynik, który zmienia się na oczach wszystkich. Przyjeżdżamy ze sprzętem, prowadzimy grę i kończymy ją finałem z ogłoszeniem zwycięzców.",
    highlights: [
      { value: "3", label: "formaty do wyboru: gra miejska, gra w obiekcie i quiz drużynowy Ryzykanci" },
      { value: "Live", label: "ranking drużyn na tabletach i na ekranie przez cały event" },
      { value: "0", label: "kartek i długopisów — zadania, mapa i punkty na tabletach, które przywozimy" },
    ],
    quoteSubject: "Wycena eventu SurvivorQuest",
    secondaryCta: { label: "Zobacz formaty", href: "#formaty" },
  },
  {
    src: "/hero/gra-terenowa.png",
    alt: "Uczestnicy gry terenowej w lesie konfigurują drużynę na tablecie.",
    label: "Gra terenowa",
    eyebrow: "Gra terenowa miejska i outdoor",
    title: "Drużyny z tabletami ruszają w miasto, park albo wokół hotelu.",
    lead:
      "Mapa, kody QR, zadania na trasie i punkty, które aktualizują się na bieżąco. Układamy trasę pod Waszą lokalizację, przywozimy tablety i prowadzimy grę od startu po finał z ogłoszeniem wyników.",
    highlights: [
      { value: "Mapa + QR", label: "punkty gry na trasie odnajdywane na tablecie i potwierdzane kodem" },
      { value: "Live", label: "pozycje i punkty każdej drużyny u koordynatora przez całą grę" },
      { value: "Foto", label: "zadania fotograficzne, które trafiają do podsumowania po evencie" },
    ],
    quoteSubject: "Wycena: gra terenowa",
    secondaryCta: { label: "Więcej o grze terenowej", href: "#gra-terenowa" },
  },
  {
    src: "/hero/gra-hotelowa.jpg",
    alt: "Uczestnicy gry hotelowej skanują kod QR na ścianie lobby, na tablecie widać ranking drużyn.",
    label: "Gra hotelowa",
    eyebrow: "Gra hotelowa i w obiekcie",
    title: "Integracja w hotelu lub centrum konferencyjnym, niezależna od pogody.",
    lead:
      "Stanowiska w salach i na korytarzach, polowanie na kody QR i zadania zespołowe między konferencją a kolacją. Przyjeżdżamy, rozstawiamy i prowadzimy — po Waszej stronie zostaje termin i lista uczestników.",
    highlights: [
      { value: "Bez pogody", label: "gra toczy się w salach, na korytarzach i wokół obiektu" },
      { value: "Między sesjami", label: "krótsza wersja jako przerywnik lub dłuższa jako główna atrakcja" },
      { value: "0 instalacji", label: "tablety przywozimy my, nikt nie instaluje niczego na telefonie" },
    ],
    quoteSubject: "Wycena: gra hotelowa",
    secondaryCta: { label: "Więcej o grze hotelowej", href: "#gra-hotelowa" },
  },
  {
    src: "/hero/ryzykanci.png",
    alt: "Drużyna pochylona nad tabletem i kartami Ryzykantów przy stole w sali konferencyjnej.",
    label: "Ryzykanci",
    eyebrow: "Ryzykanci — quiz drużynowy",
    title: "Wieczorny finał integracji: karty, kategorie i ryzykowanie punktów.",
    lead:
      "Drużyny losują karty, dostają pytanie na tablecie i stawiają punkty. Ranking na ekranie zmienia się po każdej karcie, a prowadzący podkręca emocje do ostatniej rundy — z pytaniami o Waszą firmę w roli głównej.",
    highlights: [
      { value: "90 min", label: "typowa rozgrywka — akurat na wieczór po części oficjalnej" },
      { value: "3", label: "poziomy ryzyka na kartach: im wyższa stawka, tym więcej można zyskać i stracić" },
      { value: "1", label: "zwycięzca — o wyniku potrafi zdecydować ostatnia karta" },
    ],
    quoteSubject: "Wycena: Ryzykanci",
    secondaryCta: { label: "Więcej o Ryzykantach", href: "#ryzykanci" },
  },
];
