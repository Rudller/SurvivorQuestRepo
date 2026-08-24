# Ryzykanci: talia i karty edytowalne w realizacji

Data: 2026-08-24

## Problem

W edycji realizacji typu Ryzykanci można dziś wyłącznie **wybrać talię z listy**. Cała
edycja (nazwa talii, skład kategorii, zadania w pulach, edycja pojedynczego stanowiska)
żyje na osobnej stronie `/risk-quiz` i operuje na **współdzielonej bibliotece** — zmiana
zadania dla jednej realizacji zmienia je dla wszystkich, które używają tej samej talii.

Cel: pełna edycja talii i poszczególnych kart z poziomu realizacji, przy czym zmiany
**nie wyciekają** do innych realizacji.

## Rozwiązanie

Odwzorowanie istniejącego wzorca `Scenario` → `Realization`: talia jest **klonowana na
własność realizacji**, a biblioteka `/risk-quiz` przechowuje wyłącznie szablony.

Klonowane są: `RiskScheme` → `RiskCategory` → `RiskPoolStation` → `Station`.
`RiskCard` jest już per-realizacja i pozostaje bez zmian strukturalnych.

## Decyzje projektowe

| Decyzja | Wybór |
|---|---|
| Moment klonowania | Przy tworzeniu realizacji; leniwie przy pierwszej edycji dla realizacji istniejących |
| Stary klon po zmianie talii | Zawsze zostaje (osierocony), nigdy nie kasujemy automatycznie |
| Tworzenie nowych stanowisk w realizacji | Tak — pełna edycja, jak w `/risk-quiz` |

## 1. Schemat bazy

### Nowe pola

```prisma
model RiskScheme {
  realizationId    String?
  sourceTemplateId String?
  realization      Realization? @relation(fields: [realizationId], references: [id], onDelete: Cascade)
}

model RiskCategory {
  realizationId    String?
  sourceTemplateId String?
  realization      Realization? @relation(fields: [realizationId], references: [id], onDelete: Cascade)
}
```

### Unikalność — indeksy częściowe

`RiskScheme.name`, `RiskCategory.name` i `RiskCategory.codeSlug` są dziś `@unique`
globalnie. Klon natychmiast łamie te ograniczenia (ta sama nazwa, **ten sam slug**).

Prisma nie wspiera indeksów częściowych w DSL, więc migracja robi to surowym SQL:

```sql
DROP INDEX "RiskScheme_name_key";
CREATE UNIQUE INDEX "RiskScheme_name_template_key"
  ON "RiskScheme"("name") WHERE "realizationId" IS NULL;
-- analogicznie RiskCategory_name_key oraz RiskCategory_codeSlug_key
```

Efekt: **szablony** zachowują dotychczasową unikalność, **klony** są od niej wolne.

### Dlaczego klon dziedziczy `codeSlug`

`codeSlug` generuje kody kart: `<codeSlug>-<trudność>-<n>`. Kod jest celowo stabilny,
żeby ta sama fizyczna naklejka QR działała w każdej realizacji zbudowanej z tej talii
(patrz komentarz przy `generateMissingCards`). Gdyby klon dostawał nowy slug, każda
realizacja wymagałaby własnego kompletu wydruków — to zniszczyłoby cały sens tego
projektu. Dlatego klon kopiuje `codeSlug` źródła 1:1, a `RiskCard` i tak ma
`@@unique([realizationId, code])`, więc kody nie kolidują między realizacjami.

## 2. Cykl życia klonu

**Nowa realizacja** (`createRealization`, typ `risk-quiz`, wybrana talia):
klonuje szablon w całości, `realization.riskSchemeId` wskazuje na klon.

**Realizacja istniejąca** (wskazuje dziś na szablon): leniwy klon wykonywany
automatycznie przed pierwszą mutacją edycyjną z poziomu realizacji. Realizacje, których
nikt nie edytuje, dalej używają szablonu — bez migracji danych.

**Zmiana talii w edycji**: klonuje nowo wybrany szablon. Poprzedni klon **zostaje**
w bazie osierocony (decyzja projektowa — nie tracimy historii `RiskAttempt`).

**Kasowanie realizacji**: kaskada usuwa jej klony schematu i kategorii.

> Znane ograniczenie: `Station.realizationId` nie ma dziś relacji z kaskadą, więc
> sklonowane stanowiska przetrwają usunięcie realizacji jako osierocone wiersze.
> To istniejące zachowanie (dotyczy też stanowisk scenariuszowych) — nie naprawiamy
> tego w tym zakresie.

## 3. Backend

- `listSchemes()` / `listCategories()` → dokładają `where: { realizationId: null }`.
  Biblioteka `/risk-quiz` pokazuje wyłącznie szablony.
- Nowe endpointy zakresowane na realizację, zwracające jej własną talię i kategorie
  oraz przyjmujące te same operacje co biblioteka (rename, assign/remove kategorii,
  assign/remove stanowiska w puli).
- `assignStationToPool` — guard zmienia sens. Dziś: „tylko czysty szablon"
  (`scenarioInstanceId === null && realizationId === null`). Po zmianie warunek brzmi
  konkretnie: odrzuć, gdy `station.scenarioInstanceId !== null` (stanowisko należy do
  instancji scenariusza, więc jego postęp śledzi `TeamTaskProgress`); dopuść, gdy
  `station.realizationId` jest `null` (szablon) **albo** równa się `realizationId`
  kategorii, do której przypisujemy. To utrzymuje pierwotny cel guardu — `RiskAttempt`
  i `TeamTaskProgress` nigdy nie wskazują tego samego wiersza `Station`.
- `ensureCategoryCodeSlug()` / `generateUniqueCategoryCodeSlug()` — nie wolno im
  przegenerować sluga klonu; dla klonu slug jest dziedziczony i traktowany jako ustalony.
- `generateMissingCards()` — logika bez zmian; dzięki dziedziczonemu slugowi kody
  wychodzą identyczne jak dla szablonu.

## 4. Admin UI

Zakładka **Ryzykanci** w edycji realizacji dostaje pełny edytor:

- nazwa talii (klonu),
- kategorie: dodaj z biblioteki / usuń / utwórz nową,
- pule zadań per trudność: dodaj istniejące stanowisko (klonuje się do realizacji),
  utwórz nowe od zera, usuń, edytuj (istniejący `EditStationModal`),
- panel kodów QR kart (istniejący `RiskCardsQrPanel`).

Komponenty (`SchemeCard`, `EditCategoryModal`, `CategoryListRow`) są parametryzowane
zakresem: biblioteka (`/risk-quiz`) albo realizacja. Strona `/risk-quiz` bez zmian
funkcjonalnych — nadal zarządza szablonami.

## 5. Testy

Backend (`risk-quiz.service.spec.ts`, obecne 52 testy muszą przejść):

- klon zawiera własne wiersze scheme/kategorii/pul/stanowisk, odrębne od szablonu,
- klon dziedziczy `codeSlug` źródła,
- edycja klonu nie zmienia szablonu ani innej realizacji używającej tego szablonu,
- `listSchemes`/`listCategories` nie zwracają klonów,
- guard `assignStationToPool`: przepuszcza stanowisko tej samej realizacji, odrzuca
  stanowisko należące do scenariusza,
- `generateMissingCards` dla klonu produkuje te same kody co dla szablonu.

## Ustalenia z implementacji

- Klonowanie stanowisk reużywa `StationService.cloneStationsForScenario` z samym
  `realizationId` (bez `scenarioInstanceId`) — dokładnie to rozróżnienie utrzymuje
  rozłączność `RiskAttempt` i `TeamTaskProgress`, na której opiera się guard.
- `generateUniqueCategoryCodeSlug` musiało przejść z `findUnique` na `findFirst`
  zawężony do szablonów: `codeSlug` przestał być kolumną unikalną, a liczenie
  klonów jako kolizji spychałoby każdy nowy szablon na sufiks `-2`.
- Skrypty seed (`seed-risk-categories`, `seed-risk-history`, `seed-risk-test-deck`)
  używały `upsert({ where: { name } })` — po zmianie unikalności musiały przejść na
  `findFirst({ name, realizationId: null }) ?? create`.
- `RiskScheme` ma teraz dwie relacje do `Realization` (wybrana talia + posiadane
  klony), więc obie wymagają nazwanych relacji w Prisma.

## Poza zakresem

- Migracja istniejących realizacji na klony „w tle" (świadomie leniwa).
- Sprzątanie osieroconych klonów po zmianie talii.
- Kaskadowe kasowanie sklonowanych `Station` przy usuwaniu realizacji.
