export const TRUST_METRICS = [
  { value: "1", label: "spójny ekosystem: panel admina i aplikacja mobilna" },
  { value: "Live", label: "podgląd statusów zespołów i punktacji w czasie rzeczywistym" },
  { value: "6", label: "typów realizacji obsługiwanych od startu" },
] as const;

export const BENEFITS = [
  {
    title: "Panel admina do pełnej konfiguracji realizacji",
    description:
      "To platforma do eventów firmowych i system do gier terenowych: tworzysz scenariusze, konfigurujesz stanowiska i ustawiasz przebieg imprezy integracyjnej w jednym miejscu.",
    points: [
      "Edycja scenariuszy, stanowisk i kolejności etapów",
      "Zarządzanie zespołami podczas eventu, instruktorami i harmonogramem",
    ],
  },
  {
    title: "Aplikacja mobilna dla uczestników i instruktorów",
    description:
      "Aplikacja do gier terenowych i aplikacja do eventów integracyjnych obsługuje dwa modele pracy: drużyna działa samodzielnie z urządzeniem albo instruktor prowadzi grupę przez kolejne stanowiska.",
    points: [
      "Docelowo przygotowana pod tablety dostarczane przez organizatora",
      "Opcjonalnie uczestnik lub instruktor może korzystać z aplikacji na telefonie",
    ],
  },
  {
    title: "Monitoring i podsumowanie realizacji",
    description:
      "Koordynator widzi monitoring gry terenowej na żywo, reaguje szybciej i kończy event czytelnym podsumowaniem.",
    points: ["Podgląd aktywności, punktów, logów zdarzeń i ranking drużyn na żywo", "Kompletny obraz przebiegu wydarzenia po zakończeniu"],
  },
] as const;

export const REALIZATION_PHOTO_SPOTS = [
  {
    title: "Gry terenowe miejskie",
    description: "Dynamiczne kadry z punktów gry i zadań zespołowych pokazujące, jak działa aplikacja do gry terenowej dla firm.",
    badge: "Miejsce na zdjęcie 16:10",
  },
  {
    title: "Realizacje hotelowe",
    description: "Sceny integracyjne w przestrzeniach konferencyjnych i premium z przykładem, jak działa aplikacja przy grach hotelowych.",
    badge: "Miejsce na zdjęcie 16:10",
  },
  {
    title: "Warsztaty i aktywacje",
    description: "Ujęcia prowadzących, materiałów i efektów pracy zespołów podczas warsztatów firmowych prowadzonych w aplikacji.",
    badge: "Miejsce na zdjęcie 16:10",
  },
  {
    title: "Atrakcje wieczorne",
    description: "Atmosfera finału wydarzenia z akcentem na energię uczestników i sprawną organizację atrakcji wieczornych.",
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
    question: "Czy SurvivorQuest to aplikacja do gier terenowych dla firm?",
    answer:
      "Tak. SurvivorQuest to aplikacja do gier terenowych dla firm i platforma do eventów firmowych, która łączy panel admina z aplikacją mobilną.",
  },
  {
    question: "Czy aplikacja jest prosta w obsłudze dla uczestników?",
    answer:
      "Tak. Interfejs jest prosty i prowadzi uczestników krok po kroku przez zadania. W praktyce wystarcza krótkie wprowadzenie od instruktora lub organizatora przed startem.",
  },
  {
    question: "Na jakich urządzeniach działa aplikacja mobilna?",
    answer:
      "Aplikacja jest projektowana przede wszystkim pod tablety dostarczane przez organizatora wydarzenia, ale w razie potrzeby można ją również uruchomić na telefonie.",
  },
  {
    question: "Kto korzysta z aplikacji podczas eventu?",
    answer:
      "Z aplikacji korzystają uczestnicy i instruktorzy obsługujący wydarzenie. Obie role pracują na tym samym scenariuszu i harmonogramie przygotowanym przez organizatora.",
  },
  {
    question: "Czy jest leaderboard i kiedy pojawia się podczas gry?",
    answer:
      "Tak, w aplikacji można pokazywać leaderboard drużyn i ranking drużyn na żywo. Ranking pojawia się w trakcie realizacji po uruchomieniu punktacji, a opcję można wyłączyć.",
  },
  {
    question: "Czy mogę modyfikować przebieg pod konkretną realizację?",
    answer:
      "Tak. W panelu ustawiasz scenariusz, stanowiska i kolejność etapów dla danej realizacji bez utraty danych historycznych.",
  },
  {
    question: "Czy system obsługuje gry hotelowe, warsztaty firmowe i atrakcje wieczorne?",
    answer:
      "Tak. W jednym środowisku możesz przygotować gry hotelowe, warsztaty firmowe i atrakcje wieczorne, a potem monitorować realizację na żywo.",
  },
] as const;

export const TRUST_CLIENTS = [
  {
    name: "Hard-Team",
    logoSrc: "/hard-team-logo.png",
    logoAlt: "Logo firmy Hard-Team",
  },
] as const;
