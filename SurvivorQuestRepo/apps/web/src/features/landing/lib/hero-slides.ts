export type HeroHighlight = {
  value: string;
  label: string;
};

export type HeroSlide = {
  src: string;
  alt: string;
  /** CSS object-position for photos whose subject is off-centre (e.g. portrait shots); defaults to the centre. */
  focus?: string;
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
 * The first slide is what the server renders and it permanently owns the page's
 * `h1`, so it carries the headline for search engines — keep it a real,
 * landscape photo with the umbrella message. `OG_IMAGE` is cropped from this
 * same photo but lives as its own file, so changing the hero here does not
 * silently change what gets shared on social.
 *
 * Highlights stay on what we can stand behind: the Ryzykanci figures come from
 * the game's own poster, the rest describe how a format works rather than
 * promising numbers nobody has confirmed.
 */
export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    src: "/hero/survivorquest-stoisko.jpg",
    alt: "Tablety z grami Aura AI, SurvivorQuest i Ryzykanci, stojaki z kodami QR i talie kart na stoisku targowym.",
    focus: "50% 30%",
    label: "SurvivorQuest",
    eyebrow: "SurvivorQuest",
    title: "Łączymy teambuilding z nowoczesnymi technologiami.",
    lead:
      "Wciągająca gra zespołowa na tabletach: interaktywne mapy, kody QR i wyzwania związane z Waszą firmą. Nie korzystamy z gotowych schematów – rozwijamy własną aplikację, więc scenariusz, zadania i mechanikę gry dopasowujemy do Was. Przywozimy sprzęt, prowadzimy rozgrywkę i kończymy ją wielkim finałem z ogłoszeniem zwycięzców. Wy dostarczacie energię – my zamieniamy ją w rywalizację i wspomnienia, które zostają na długo.",
    highlights: [
      { value: "3", label: "formaty do wyboru: gra miejska, gra w obiekcie i quiz drużynowy Ryzykanci" },
      { value: "19", label: "typów zadań w naszej aplikacji — od szyfrów po zadania fotograficzne" },
      { value: "Live", label: "ranking drużyn na tabletach i na ekranie przez cały event" },
    ],
    quoteSubject: "Wycena eventu SurvivorQuest",
    secondaryCta: { label: "Zobacz formaty", href: "#formaty" },
  },
  {
    src: "/hero/gra-hotelowa-aura.jpg",
    alt: "Ekran z intro gry hotelowej i tablety drużyn przygotowane na stole w sali.",
    label: "Gra hotelowa",
    eyebrow: "Gra hotelowa i w obiekcie",
    title: "Integracja w hotelu lub centrum konferencyjnym na każdą pogodę.",
    lead:
      "Stanowiska w salach i na korytarzach, polowanie na kody QR i zadania zespołowe między konferencją a kolacją. Przyjeżdżamy, rozstawiamy i prowadzimy — po Waszej stronie zostaje termin i lista uczestników.",
    highlights: [
      { value: "Niezależne od pogody", label: "gra toczy się w salach, na korytarzach i wokół obiektu" },
      { value: "Między sesjami", label: "krótsza wersja jako przerywnik lub dłuższa jako główna atrakcja" },
      { value: "0 sprzętu", label: "tablety przywozimy my, nikt nie instaluje niczego na telefonie" },
    ],
    quoteSubject: "Wycena: gra hotelowa",
    secondaryCta: { label: "Więcej o grze hotelowej", href: "#gra-hotelowa" },
  },
  {
    src: "/hero/gra-terenowa-druzyna.jpg",
    alt: "Drużyna na boisku pochyla się nad drewnianymi listwami i układa z nich konstrukcję według zdjęcia.",
    focus: "50% 22%",
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
    src: "/hero/ryzykanci-stol.jpg",
    alt: "Tablet z zasadami Ryzykantów i pudełko z kartami do gry na stole.",
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
