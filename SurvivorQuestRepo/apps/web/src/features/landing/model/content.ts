/**
 * Every word of landing copy lives here, so the sales story can be rewritten
 * without touching layout. The page sells events that SurvivorQuest organises;
 * the app shows up only as the thing that makes those events better.
 *
 * Group sizes, durations and reach are kept descriptive on purpose — swap them
 * for hard numbers here once they are confirmed, nowhere else.
 */

/** `id` doubles as the anchor a hero slide's second button scrolls to. */
export const EVENT_FORMATS = [
  {
    id: "gra-terenowa",
    title: "Gra terenowa miejska i outdoor",
    tagline: "Rywalizacja drużyn w terenie: miasto, park, okolice hotelu.",
    description:
      "Drużyny z tabletami ruszają na trasę, odnajdują punkty na mapie, skanują kody QR i rozwiązują zadania: quizy, szyfry, zagadki, zadania fotograficzne. Punkty i pozycje drużyn aktualizują się na bieżąco, a koordynator na miejscu pilnuje tempa.",
    points: [
      "Scenariusz i trasa ułożone pod Waszą lokalizację i termin",
      "Tablety, oznaczone punkty gry i prowadzący w cenie",
      "Ranking na żywo i podsumowanie z wynikami po grze",
    ],
  },
  {
    id: "gra-hotelowa",
    title: "Gra hotelowa i w obiekcie",
    tagline: "Integracja w hotelu lub centrum konferencyjnym, niezależna od pogody.",
    description:
      "Stanowiska rozstawiamy w salach, na korytarzach i wokół obiektu. Drużyny polują na kody QR, rozwiązują zadania zespołowe i zbierają punkty między częścią konferencyjną a kolacją. Dobre na wyjazdy firmowe i konferencje, gdzie czas jest policzony.",
    points: [
      "Zadania dopasowane do obiektu i harmonogramu dnia",
      "Zero logistyki po Waszej stronie: przyjeżdżamy, rozstawiamy, prowadzimy",
      "Wersja krótsza jako przerywnik lub dłuższa jako główna atrakcja",
    ],
  },
  {
    id: "ryzykanci",
    title: "Ryzykanci — quiz drużynowy",
    tagline: "Wieczorny finał integracji: karty, kategorie i ryzykowanie punktów.",
    description:
      "Drużyny losują karty z kategorii i poziomu trudności, dostają pytanie lub zadanie na tablecie i decydują, ile punktów stawiają. Prowadzący podkręca emocje, ranking na ekranie zmienia się po każdej karcie. Sprawdza się jako wieczorna atrakcja po grze terenowej albo samodzielny event w sali.",
    points: [
      "Kategorie i pytania szyte pod Waszą firmę i branżę",
      "Prowadzący, tablety dla drużyn i ekran z rankingiem",
      "Od kameralnych zespołów po całe działy w jednej sali",
    ],
  },
] as const;

export const WHY_APP = [
  {
    title: "Ranking na żywo, który napędza rywalizację",
    description:
      "Każde zadanie od razu zmienia wynik. Drużyny widzą na tablecie, kto prowadzi, a na ekranie w sali finał rozgrywa się na oczach wszystkich — bez liczenia punktów na kartce po zakończeniu.",
  },
  {
    title: "Zadania o Waszej firmie, nie z gotowca",
    description:
      "Pytania o historię firmy, produkty, ludzi i wewnętrzne żarty wplatamy w scenariusz. Zespoły międzynarodowe grają w swoim języku — aplikacja obsługuje polski, angielski, ukraiński i rosyjski.",
  },
  {
    title: "Koordynator widzi każdą drużynę",
    description:
      "Pozycja na mapie, postęp zadań i czas są u nas na podglądzie w trakcie gry, więc żadna grupa nie ginie w terenie ani nie utyka na stanowisku. Po evencie dostajecie czytelne podsumowanie: wyniki, zdjęcia z zadań, ranking.",
  },
] as const;

export const PROCESS_STEPS = [
  {
    title: "1. Brief",
    description: "Rozmawiamy o okazji, liczbie osób, miejscu i terminie. Doradzamy format i czas trwania.",
  },
  {
    title: "2. Scenariusz pod Was",
    description: "Układamy trasę lub stanowiska, dobieramy zadania i wplatamy treści o Waszej firmie.",
  },
  {
    title: "3. Dzień eventu",
    description: "Przyjeżdżamy ze sprzętem, rozstawiamy punkty, prowadzimy grę i pilnujemy tempa. Wy gracie.",
  },
  {
    title: "4. Finał i podsumowanie",
    description: "Ogłaszamy wyniki na ekranie, a po evencie przesyłamy ranking i zdjęcia z zadań.",
  },
] as const;

export const CASE_STUDIES = [
  {
    title: "Gra terenowa dla ponad stu uczestników",
    challenge:
      "Firma chciała jednego wydarzenia dla wszystkich działów naraz: wiele drużyn w terenie, bez chaosu i bez czekania w kolejce do stanowisk.",
    outcome:
      "Drużyny ruszyły równolegle różnymi trasami, a ranking na żywo utrzymał rywalizację do ostatniego zadania. Finał z ogłoszeniem wyników zamknął dzień na wspólnym ekranie.",
    photos: ["Zdjęcie: start drużyn", "Zdjęcie: zadanie w terenie", "Zdjęcie: finał i ranking"],
  },
  {
    title: "Wyjazd firmowy w hotelu z wieczornymi Ryzykantami",
    challenge:
      "Po całym dniu konferencji goście potrzebowali atrakcji, która wciągnie wszystkich, a nie tylko najgłośniejszy stolik.",
    outcome:
      "Krótka gra w obiekcie między sesjami rozgrzała zespoły, a wieczorny quiz z ryzykowaniem punktów wyrównał szanse — o zwycięstwie zdecydowała ostatnia karta.",
    photos: ["Zdjęcie: stanowisko w hotelu", "Zdjęcie: drużyna z tabletem", "Zdjęcie: Ryzykanci na scenie"],
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
      "W mieście, w parku, w hotelu lub centrum konferencyjnym, w którym organizujecie wyjazd. Scenariusz i trasę układamy pod konkretne miejsce, więc gra działa tam, gdzie jesteście.",
  },
  {
    question: "Co zapewniacie, a co jest po naszej stronie?",
    answer:
      "Przywozimy tablety, oznaczenia punktów, prowadzących i cały scenariusz. Po Waszej stronie zostaje termin, miejsce i lista uczestników. Nie trzeba instalować niczego na prywatnych telefonach.",
  },
  {
    question: "Czy zadania mogą dotyczyć naszej firmy?",
    answer:
      "Tak, i tak jest najlepiej. Pytania o historię firmy, produkty, zespół czy wartości wplatamy w scenariusz, a przy Ryzykantach można zbudować z nich całą kategorię.",
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
