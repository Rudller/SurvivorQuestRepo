export const TRUST_METRICS = [
  { value: "1", label: "spójny ekosystem: panel admina i aplikacja mobilna" },
  { value: "Live", label: "podgląd statusów zespołów i punktacji w czasie rzeczywistym" },
  { value: "6", label: "typów realizacji obsługiwanych od startu" },
] as const;

export const BENEFITS = [
  {
    title: "Panel admina do pełnej konfiguracji realizacji",
    description:
      "Tworzysz scenariusze, konfigurujesz stacje i ustawiasz przebieg eventu bez przełączania narzędzi.",
    points: ["Edycja scenariuszy oraz kolejności stacji", "Szybka konfiguracja zespołów, instruktorów i harmonogramu"],
  },
  {
    title: "Aplikacja mobilna dla uczestników wydarzenia",
    description:
      "Zespoły realizują zadania na telefonie, a wyniki natychmiast trafiają do panelu koordynatora.",
    points: ["Obsługa quizów, zadań czasowych i punktowych", "Czytelny status zadania i nawigacja po etapach gry"],
  },
  {
    title: "Monitoring i podsumowanie realizacji",
    description:
      "Koordynator widzi postęp drużyn na żywo, reaguje szybciej i kończy event czytelnym podsumowaniem.",
    points: ["Podgląd aktywności, punktów i logów zdarzeń", "Kompletny obraz przebiegu wydarzenia po zakończeniu"],
  },
] as const;

export const REALIZATION_PHOTO_SPOTS = [
  {
    title: "Gry terenowe miejskie",
    description: "Dynamiczne kadry z punktów gry i zadań zespołowych.",
    badge: "Miejsce na zdjęcie 16:10",
  },
  {
    title: "Realizacje hotelowe",
    description: "Sceny integracyjne w przestrzeniach konferencyjnych i premium.",
    badge: "Miejsce na zdjęcie 16:10",
  },
  {
    title: "Warsztaty i aktywacje",
    description: "Ujęcia prowadzących, materiałów i efektów pracy zespołów.",
    badge: "Miejsce na zdjęcie 16:10",
  },
  {
    title: "Atrakcje wieczorne",
    description: "Atmosfera finału wydarzenia z akcentem na energię uczestników.",
    badge: "Miejsce na zdjęcie 16:10",
  },
] as const;

export const PROCESS_STEPS = [
  {
    title: "1. Konfiguracja w panelu admina",
    description: "Tworzysz realizację, przypisujesz scenariusz i ustawiasz zespoły, stacje oraz instruktorów.",
  },
  {
    title: "2. Gra uczestników w aplikacji mobilnej",
    description: "Drużyny realizują zadania i przechodzą kolejne etapy, a wyniki są aktualizowane na bieżąco.",
  },
  {
    title: "3. Monitoring live i podsumowanie",
    description: "Koordynator śledzi przebieg wydarzenia na żywo i kończy je czytelnym podsumowaniem danych.",
  },
] as const;

export const CASE_STUDIES = [
  {
    title: "Gra terenowa dla 120 uczestników",
    challenge: "Organizator potrzebował kontroli nad wieloma zespołami i stacjami w różnych lokalizacjach.",
    outcome: "Panel pozwolił śledzić status każdej drużyny na żywo i szybko reagować na opóźnienia.",
    photos: ["Miejsce na zrzut: widok zespołów", "Miejsce na zrzut: lista zadań", "Miejsce na zrzut: podsumowanie"],
  },
  {
    title: "Warsztaty hotelowe z rotacją grup",
    challenge: "Wymagana była szybka zmiana zadań i czytelna komunikacja dla prowadzących.",
    outcome: "Aplikacja uprościła prowadzenie etapów i utrzymała spójny przepływ pracy między grupami.",
    photos: ["Miejsce na zrzut: scenariusz", "Miejsce na zrzut: postęp stacji", "Miejsce na zrzut: punkty"],
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "Czy SurvivorQuest ma osobny panel dla organizatora i aplikację dla uczestników?",
    answer:
      "Tak. Organizator pracuje w panelu admina, a uczestnicy korzystają z aplikacji mobilnej połączonej z tym samym scenariuszem.",
  },
  {
    question: "Jakie typy zadań obsługuje aplikacja mobilna?",
    answer:
      "System obsługuje m.in. quizy, zadania czasowe i punktowe oraz kolejne etapy stacji dopasowane do scenariusza realizacji.",
  },
  {
    question: "Czy mogę edytować scenariusz pod konkretną realizację?",
    answer:
      "Tak. W panelu możesz przygotować i modyfikować scenariusz dla danej realizacji bez utraty danych historycznych.",
  },
] as const;

export const TRUST_LOGO_SLOTS = [
  "Miejsce na logo klienta",
  "Miejsce na logo klienta",
  "Miejsce na logo klienta",
  "Miejsce na logo klienta",
  "Miejsce na logo klienta",
] as const;
