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

/** `id` doubles as the anchor a hero slide's second button scrolls to. */
export const EVENT_FORMATS = [
  {
    id: "gra-terenowa",
    title: "Gra terenowa i gra miejska dla firm",
    tagline: "Rywalizacja drużyn w terenie: miasto, park, okolice hotelu.",
    description:
      "Drużyny z tabletami ruszają na trasę, odnajdują punkty na mapie, skanują kody QR i rozwiązują zadania: quizy, szyfry, zagadki, układanki i zadania fotograficzne. Punkty i pozycje drużyn aktualizują się na bieżąco, a koordynator na miejscu pilnuje tempa. Format sprawdza się jako główna atrakcja wyjazdu integracyjnego, jako otwarcie konferencji i jako gra miejska dla firm, które chcą przy okazji pokazać zespołowi nowe miasto.",
    points: [
      "Scenariusz i trasa ułożone pod Waszą lokalizację i termin",
      "Tablety, oznaczone punkty gry i prowadzący w cenie",
      "Trasy startujące równolegle, żeby duża grupa nie stała w kolejce",
      "Ranking na żywo i podsumowanie z wynikami po grze",
    ],
  },
  {
    id: "gra-hotelowa",
    title: "Gra hotelowa i gra w obiekcie",
    tagline: "Integracja w hotelu lub centrum konferencyjnym, niezależna od pogody.",
    description:
      "Stanowiska rozstawiamy w salach, na korytarzach i wokół obiektu. Drużyny polują na kody QR, rozwiązują zadania zespołowe i zbierają punkty między częścią konferencyjną a kolacją. To format na wyjazd firmowy i konferencję, gdzie czas jest policzony co do kwadransa, a integracja zespołu musi zmieścić się między dwiema sesjami — i nie może się posypać dlatego, że akurat zaczęło padać.",
    points: [
      "Zadania dopasowane do obiektu i harmonogramu dnia",
      "Zero logistyki po Waszej stronie: przyjeżdżamy, rozstawiamy, prowadzimy",
      "Wersja krótsza jako przerywnik lub dłuższa jako główna atrakcja",
      "Cała gra toczy się pod dachem, więc pogoda niczego nie zmienia",
    ],
  },
  {
    id: "ryzykanci",
    title: "Ryzykanci — quiz drużynowy dla firm",
    tagline: "Wieczorny finał integracji: karty, kategorie i ryzykowanie punktów.",
    description:
      "Drużyny losują karty z kategorii i poziomu trudności, dostają pytanie lub zadanie na tablecie i decydują, ile punktów stawiają. Prowadzący podkręca emocje, a ranking na ekranie zmienia się po każdej karcie. Mechanika ryzyka robi tu całą robotę: drużyna, która została w tyle, może odrobić stratę jedną odważną decyzją, więc nikt nie odpada z zabawy po pierwszej rundzie.",
    points: [
      "Kategorie i pytania szyte pod Waszą firmę i branżę",
      "Prowadzący, tablety dla drużyn i ekran z rankingiem",
      "Od kameralnych zespołów po całe działy w jednej sali",
      "Jako wieczorna atrakcja po grze terenowej albo samodzielny event",
    ],
  },
] as const;

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
    description:
      "Rozmawiamy o okazji, liczbie osób, miejscu i terminie. Doradzamy format i czas trwania — czasem odradzamy ten, o który pytacie, jeśli do grupy lepiej pasuje inny.",
  },
  {
    title: "2. Scenariusz pod Was",
    description:
      "Układamy trasę lub stanowiska, dobieramy typy zadań do charakteru i kondycji grupy i wplatamy treści o Waszej firmie. Scenariusz dostajecie do akceptacji przed eventem.",
  },
  {
    title: "3. Dzień eventu",
    description:
      "Przyjeżdżamy ze sprzętem, rozstawiamy punkty, dzielimy uczestników na drużyny, prowadzimy grę i pilnujemy tempa. Wy gracie.",
  },
  {
    title: "4. Finał i podsumowanie",
    description:
      "Ogłaszamy wyniki na ekranie, a po evencie przesyłamy ranking i zdjęcia z zadań — materiał, który wraca potem do firmowego newslettera albo na ścianę w biurze.",
  },
] as const;

/**
 * Proof, not decoration. `metrics` replaced a row of grey tiles that literally
 * read "Zdjęcie: start drużyn" — captions standing in for photos that were
 * never taken. Until real photos exist, hard figures carry the section; add a
 * `photos` field back only when there are actual images to put in it.
 */
type CaseStudy = {
  title: string;
  challenge: string;
  outcome: string;
  /** Hard figures shown under the story; empty until the numbers are confirmed. */
  metrics: readonly { value: string; label: string }[];
};

export const CASE_STUDIES: readonly CaseStudy[] = [
  {
    title: "Gra terenowa dla ponad stu uczestników",
    challenge:
      "Firma chciała jednego wydarzenia dla wszystkich działów naraz: wiele drużyn w terenie, bez chaosu i bez czekania w kolejce do stanowisk.",
    outcome:
      "Drużyny ruszyły równolegle różnymi trasami, a ranking na żywo utrzymał rywalizację do ostatniego zadania. Finał z ogłoszeniem wyników zamknął dzień na wspólnym ekranie.",
    metrics: [],
  },
  {
    title: "Wyjazd firmowy w hotelu z wieczornymi Ryzykantami",
    challenge:
      "Po całym dniu konferencji goście potrzebowali atrakcji, która wciągnie wszystkich, a nie tylko najgłośniejszy stolik.",
    outcome:
      "Krótka gra w obiekcie między sesjami rozgrzała zespoły, a wieczorny quiz z ryzykowaniem punktów wyrównał szanse — o zwycięstwie zdecydowała ostatnia karta.",
    metrics: [],
  },
];

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
