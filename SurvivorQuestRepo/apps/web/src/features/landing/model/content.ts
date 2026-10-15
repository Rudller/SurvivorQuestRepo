/**
 * Every word of landing copy lives here, so the sales story can be rewritten
 * without touching layout. The page sells events that SurvivorQuest organises;
 * the app shows up as the reason those events beat a printed scavenger hunt —
 * and as something we wrote ourselves, which nobody reselling a licensed kit
 * can say.
 *
 * Group sizes, durations and reach stay descriptive on purpose — swap them for
 * hard numbers here once they are confirmed, nowhere else. The one hard number
 * quoted is the count of station types, which is checkable against the station
 * registry in the backend (see CLAUDE.md).
 */

export type EventGame = {
  /** Anchor of the game's row, and the file name of its photo in `public/formaty`. */
  id: string;
  /** Small label above the name — what kind of game it is. */
  kind: string;
  title: string;
  description: string;
  points: readonly string[];
  /** `null` until a photo exists — the row then shows a branded placeholder. */
  image: { src: string; alt: string } | null;
  /** A scenario written by somebody else, credited next to the game. */
  partner?: { name: string; logoSrc: string };
  /** Decoration drawn over the photo. */
  photoEffect?: "snow";
  /** Ways the same game can be run, shown side by side under the points. */
  variants?: readonly { title: string; description: string }[];
};

export type EventFormat = {
  /** Anchor of the category header — the hero slides' second buttons scroll here. */
  id: string;
  title: string;
  /** One sentence under the category name; also the description in the JSON-LD offer catalog. */
  tagline: string;
  games: readonly EventGame[];
};

/**
 * Categories in the order the offer section lists them, each with the games
 * we run in it. Do not rename the category ids: the hero slides link to them.
 */
export const EVENT_FORMATS: readonly EventFormat[] = [
  {
    id: "gra-hotelowa",
    title: "Gry hotelowe",
    tagline:
      "Integracja w hotelu lub centrum konferencyjnym, niezależna od pogody — stanowiska w salach, na korytarzach i wokół obiektu.",
    games: [
      {
        id: "aura-restart-challenge",
        kind: "Gra hotelowa",
        title: "Aura Restart Challenge",
        description:
          "Drużyny ruszają po całym obiekcie, polują na kody QR i rozwiązują zadania zespołowe, zbierając punkty między częścią konferencyjną a kolacją. Krótsza wersja sprawdza się jako przerywnik, dłuższa jako główna atrakcja wyjazdu.",
        points: [
          "Zadania dopasowane do obiektu i harmonogramu dnia",
          "Cała gra pod dachem, więc pogoda niczego nie zmienia",
          "Ranking na żywo na tabletach i na ekranie w sali",
        ],
        image: {
          src: "/formaty/aura-restart-challenge.jpg",
          alt: "Ekran z intro gry Aura Restart Challenge i tablety drużyn przygotowane na stole w sali.",
        },
      },
      {
        id: "black-file",
        kind: "Gra kryminalna",
        title: "Black File",
        description:
          "W hotelu wydarzyło się coś, czego nikt nie potrafi wyjaśnić. Drużyny dostają teczkę sprawy, zbierają poszlaki w salach i na korytarzach, łamią szyfry i łączą fakty, zanim zrobi to konkurencja. Wygrywa zespół, który jako pierwszy wskaże sprawcę — i udowodni to dowodami.",
        points: [
          "Fabuła kryminalna rozpisana na cały obiekt",
          "Poszlaki, szyfry i dowody odblokowywane na tablecie",
          "Finał z rozwiązaniem sprawy na oczach wszystkich",
        ],
        image: {
          src: "/formaty/black-file.jpg",
          alt: "Drużyna przy hotelowym barze przesłuchuje barmana w trakcie gry kryminalnej Black File.",
        },
      },
      {
        id: "ho-ho-hotel",
        kind: "Gra świąteczna",
        title: "Ho-ho-hotel",
        description:
          "Świąteczna gra na firmową wigilię i grudniowe wyjazdy. Drużyny ratują święta w hotelu: szukają zagubionych prezentów, rozwiązują zimowe zagadki i zbierają punkty przed kolacją. Lekka, rodzinna w klimacie i wciągająca nawet tych, którzy na integracje zwykle nie chodzą.",
        points: [
          "Gotowa na sezon firmowych wigilii",
          "Zadania w świątecznym klimacie, bez wychodzenia na mróz",
          "Idealny wstęp do wieczornej kolacji",
        ],
        image: {
          src: "/formaty/ho-ho-hotel.jpg",
          alt: "Święty Mikołaj z pluszowym misiem w drewnianej, świątecznie udekorowanej chatce.",
        },
        photoEffect: "snow",
      },
    ],
  },
  {
    id: "gra-terenowa",
    title: "Gry terenowe",
    tagline:
      "Rywalizacja drużyn w terenie: miasto, park, las albo okolice hotelu — z mapą, kodami QR i rankingiem na żywo.",
    games: [
      {
        id: "cztery-zywioly",
        kind: "Gra terenowa",
        title: "Cztery żywioły",
        description:
          "Ogień, woda, ziemia i powietrze — cztery strefy, cztery rodzaje wyzwań. Drużyny przechodzą przez kolejne żywioły, łącząc zadania w terenie z zadaniami na tablecie, a o zwycięstwie decyduje to, jak zespół radzi sobie w każdym z nich. Scenariusz przygotowany wspólnie z HardTeam.",
        points: [
          "Cztery strefy z różnym typem wyzwań",
          "Zadania fizyczne i logiczne w jednej grze",
          "Scenariusz i zaplecze HardTeam, prowadzenie w naszej aplikacji",
        ],
        image: {
          src: "/formaty/cztery-zywioly.jpg",
          alt: "Drużyna na trawie wspólnie trzyma liny i ustawia wieżę z klocków w zadaniu zespołowym.",
        },
        partner: { name: "HardTeam", logoSrc: "/hard-team-logo.png" },
      },
      {
        id: "aura-restart-challenge-outdoor",
        kind: "Gra terenowa",
        title: "Aura Restart Challenge Outdoor",
        description:
          "Terenowa wersja Aury: drużyny z tabletami ruszają na trasę, odnajdują punkty na mapie, skanują kody QR i rozwiązują quizy, szyfry i zadania fotograficzne. Grę prowadzimy w dwóch wersjach — z instruktorami na stanowiskach albo jako samodzielna wyprawa drużyn.",
        points: [
          "Trasa ułożona pod Waszą lokalizację i termin",
          "Trasy startujące równolegle, żeby duża grupa nie stała w kolejce",
          "Podsumowanie z wynikami i zdjęciami po grze",
        ],
        variants: [
          {
            title: "Z instruktorami",
            description:
              "Na trasie czekają stanowiska manualne prowadzone przez naszych instruktorów — zadania ruchowe i zręcznościowe obok zadań na tablecie.",
          },
          {
            title: "Bez instruktorów",
            description:
              "Drużyny same wyruszają na trasę i mierzą się z zagadkami i wyzwaniami ukrytymi w terenie. Więcej swobody i odkrywania na własną rękę, a nasz prowadzący czuwa nad przebiegiem gry od startu po finał.",
          },
        ],
        image: {
          src: "/formaty/aura-restart-challenge-outdoor.jpg",
          alt: "Instruktor SurvivorQuest przy boisku, na którym uczestnicy grają w bumper ball.",
        },
      },
    ],
  },
  {
    id: "ryzykanci",
    title: "Ryzykanci",
    tagline: "Quiz drużynowy na wieczorny finał integracji: karty, kategorie i ryzykowanie punktów.",
    games: [
      {
        id: "ryzykanci-quiz",
        kind: "Quiz drużynowy",
        title: "Ryzykanci",
        description:
          "Drużyny losują karty z kategorii i poziomu trudności, dostają pytanie lub zadanie na tablecie i decydują, ile punktów stawiają. Ranking na ekranie zmienia się po każdej karcie, a drużyna, która została w tyle, może odrobić stratę jedną odważną decyzją.",
        points: [
          "Kategorie i pytania szyte pod Waszą firmę i branżę",
          "Prowadzący, tablety dla drużyn i ekran z rankingiem",
          "Jako wieczorna atrakcja po grze terenowej albo samodzielny event",
        ],
        image: {
          src: "/formaty/ryzykanci-quiz.jpg",
          alt: "Tablet z zasadami Ryzykantów i pudełko z kartami do gry na stole.",
        },
      },
    ],
  },
];

export const WHY_APP = [
  {
    title: "Aplikację napisaliśmy sami — i wciąż ją rozwijamy",
    description:
      "Nie kupiliśmy licencji na cudzy system i nie sklejamy gry z darmowych narzędzi. SurvivorQuest to nasza aplikacja: mamy w niej 19 typów zadań, od quizów i szyfrów po zadania fotograficzne i polowanie na kody QR, a kiedy scenariusz tego potrzebuje, dokładamy kolejny. Nie kupicie jej od nikogo — przyjeżdża z nami.",
  },
  {
    title: "Zadania o Waszej firmie, nie z gotowca",
    description:
      "Pytania o historię firmy, produkty, ludzi i wewnętrzne żarty wplatamy w scenariusz, a przy Ryzykantach budujemy z nich całą kategorię. Zespoły międzynarodowe grają w swoim języku — aplikacja prowadzi zadania po polsku, angielsku, ukraińsku i rosyjsku, więc jedna drużyna nie czeka, aż druga skończy tłumaczyć.",
  },
  {
    title: "Ranking na żywo, który napędza rywalizację",
    description:
      "Każde zadanie od razu zmienia wynik. Drużyny widzą na tablecie, kto prowadzi, a na ekranie w sali finał rozgrywa się na oczach wszystkich. Nikt nie liczy punktów na kartce po zakończeniu i nikt nie spiera się o to, czy poprzednie zadanie na pewno zaliczono.",
  },
  {
    title: "Koordynator widzi każdą drużynę",
    description:
      "Pozycja na mapie, postęp zadań i czas są u nas na podglądzie przez całą grę, więc żadna grupa nie ginie w terenie ani nie utyka na stanowisku. Po evencie dostajecie czytelne podsumowanie: wyniki, ranking i zdjęcia, które drużyny zrobiły przy zadaniach.",
  },
] as const;

export const PROCESS_STEPS = [
  {
    title: "1. Brief",
    icon: "brief",
    description:
      "Rozmawiamy o okazji, liczbie osób, miejscu i terminie. Doradzamy format i czas trwania — czasem odradzamy ten, o który pytacie, jeśli do grupy lepiej pasuje inny.",
  },
  {
    title: "2. Scenariusz pod Was",
    icon: "scenario",
    description:
      "Układamy trasę lub stanowiska, dobieramy typy zadań do charakteru i kondycji grupy i wplatamy treści o Waszej firmie. Scenariusz dostajecie do akceptacji przed eventem.",
  },
  {
    title: "3. Dzień eventu",
    icon: "event",
    description:
      "Przyjeżdżamy ze sprzętem, rozstawiamy punkty, dzielimy uczestników na drużyny, prowadzimy grę i pilnujemy tempa. Wy gracie.",
  },
  {
    title: "4. Finał i podsumowanie",
    icon: "finale",
    description:
      "Ogłaszamy wyniki na ekranie, a po evencie przesyłamy ranking i zdjęcia z zadań — materiał, który wraca potem do firmowego newslettera albo na ścianę w biurze.",
  },
] as const;

/**
 * Custom builds — not a new task type inside the game app, but something made
 * from scratch for one event or brand.
 */
export const CUSTOM_TECH = [
  {
    icon: "mobile",
    title: "Aplikacje mobilne i na tablety",
    description:
      "Własna aplikacja pod Wasz event albo markę — od rejestracji uczestników po interaktywną grę z Waszą fabułą. Projektujemy, piszemy i wdrażamy ją na urządzeniach.",
  },
  {
    icon: "web",
    title: "Aplikacje webowe",
    description:
      "Systemy działające w przeglądarce: rankingi na żywo na dużym ekranie, głosowania i quizy dla całej sali, panele dla prowadzących. Bez instalowania czegokolwiek.",
  },
  {
    icon: "chip",
    title: "Urządzenia na ESP32",
    description:
      "Fizyczne rekwizyty, które reagują: przyciski do quizów, skrzynie otwierane kodem, czujniki, światła i dźwięk — połączone z grą albo działające samodzielnie.",
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "Dla ilu osób organizujecie eventy?",
    answer:
      "Od kilkunastu do kilkuset uczestników. Dzielimy grupę na drużyny, a liczbę tras, stanowisk i tabletów dobieramy do wielkości zespołu, żeby nikt nie czekał w kolejce.",
  },
  {
    question: "Ile trwa gra?",
    answer:
      "Zwykle kilka godzin. Grę terenową i hotelową skracamy lub wydłużamy pod Wasz harmonogram, a Ryzykanci sprawdzają się jako wieczorna atrakcja po części oficjalnej.",
  },
  {
    question: "Gdzie może odbyć się event?",
    answer:
      "W mieście, w parku, w hotelu lub centrum konferencyjnym, w którym organizujecie wyjazd integracyjny. Scenariusz i trasę układamy pod konkretne miejsce, więc gra działa tam, gdzie jesteście — nie przenosimy Was do naszej lokalizacji.",
  },
  {
    question: "Czy aplikacja, w której gramy, jest Wasza?",
    answer:
      "Tak. Napisaliśmy ją sami i sami ją rozwijamy — to nie jest licencja na cudzy system ani zestaw gotowych scenariuszy kupiony od dostawcy. Dlatego możemy dołożyć typ zadania pod konkretny pomysł albo przebudować mechanikę pod Waszą grupę, zamiast tłumaczyć, że tak się nie da.",
  },
  {
    question: "Co zapewniacie, a co jest po naszej stronie?",
    answer:
      "Przywozimy tablety, oznaczenia punktów, prowadzących i cały scenariusz. Po Waszej stronie zostaje termin, miejsce i lista uczestników. Nie trzeba instalować niczego na prywatnych telefonach.",
  },
  {
    question: "Czy zadania mogą dotyczyć naszej firmy?",
    answer:
      "Tak, i tak jest najlepiej. Pytania o historię firmy, produkty, zespół czy wartości wplatamy w scenariusz, a przy Ryzykantach można zbudować z nich całą kategorię. Wystarczy, że na briefie podrzucicie materiały — resztę układamy my.",
  },
  {
    question: "Czy można połączyć dwa formaty w jednym dniu?",
    answer:
      "Tak, to najczęstszy układ przy wyjazdach dwudniowych: gra terenowa lub hotelowa w ciągu dnia, Ryzykanci wieczorem po kolacji. Punkty z obu części da się zsumować w jeden ranking, więc rywalizacja trzyma grupę od rana do końca wieczoru.",
  },
  {
    question: "Ilu prowadzących jest na miejscu?",
    answer:
      "Zależnie od formatu i wielkości grupy — od jednego prowadzącego przy kameralnych Ryzykantach po zespół koordynatorów rozstawionych na trasie przy dużej grze terenowej. Liczbę ustalamy na briefie i jest wliczona w wycenę.",
  },
  {
    question: "Co, jeśli pogoda pokrzyżuje plany?",
    answer:
      "Gra terenowa ma zawsze wariant zapasowy w obiekcie, a gra hotelowa i Ryzykanci są niezależne od pogody. Ustalamy to na etapie briefu, więc w dniu eventu nikt nie improwizuje.",
  },
  {
    question: "Czym są Ryzykanci?",
    answer:
      "To quiz drużynowy: zespoły losują karty z kategorii i poziomu trudności, dostają pytanie lub zadanie na tablecie i stawiają punkty. Ranking na ekranie zmienia się po każdej karcie, a wynik może się odwrócić do ostatniej rundy.",
  },
  {
    question: "Czy zespoły międzynarodowe mogą grać razem?",
    answer:
      "Tak. Każda drużyna gra w swoim języku — aplikacja prowadzi zadania po polsku, angielsku, ukraińsku i rosyjsku, a prowadzący dostosowuje przebieg do grupy.",
  },
  {
    question: "Jak wygląda wycena?",
    answer:
      "Napisz lub zadzwoń, podaj liczbę osób, termin i miejsce. Odpowiadamy zwykle w ten sam dzień roboczy z propozycją formatu i ceną. Cena zależy od liczby uczestników, długości gry i lokalizacji.",
  },
] as const;

export const TRUST_CLIENTS = [
  {
    name: "Hard-Team",
    logoSrc: "/hard-team-logo.png",
    logoAlt: "Logo firmy Hard-Team",
  },
] as const;
