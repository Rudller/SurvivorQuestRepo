# Ryzykanci: zdalne uruchomienie karty na tablecie drużyny

## Cel

W panelu edycji drużyny (`CurrentRealizationTeamTasksPanel`, tabela zadań dla realizacji typu Ryzykanci) admin ma dostać przycisk "Uruchom na tablecie" przy każdej grupie kategoria×trudność. Kliknięcie ma wywołać na tablecie drużyny dokładnie to, co realny skan fizycznej karty: wylosowanie nieprzerobionej jeszcze stacji z tej puli i pokazanie pytania/zadania — bez fizycznego skanowania QR.

## Zakres

- Dotyczy wyłącznie realizacji typu `risk-quiz`.
- Nowa tabela `RiskPendingDraw` (backend + migracja Prisma).
- Nowe endpointy w `RiskQuizController`/`RiskQuizService`: wyzwolenie losowania (admin), anulowanie (admin), odbiór oczekującego losowania (urządzenie mobilne).
- Zmiany w `apps/mobile`: nowa pętla odpytywania na ekranie skanowania Ryzykantów (`risk-quiz-screen.tsx`), aktywna tylko gdy ekran jest bezczynny (brak `activeDraw`, po intro, menu testowe zamknięte).
- Zmiany w adminie: `getTeamCardBoard` dostaje pole `pendingDraw`; tabela zadań w `current-realization-team-tasks-panel.tsx` grupuje wiersze po kategorii×trudności i dostaje nagłówek grupy z przyciskiem.
- **Nie** dotyczy klasycznych (nie-Ryzykanci) realizacji ani ich stanowisk.
- **Znane ograniczenie:** serwer nie wie nic o realnym, fizycznym skanie, którego drużyna dokonuje samodzielnie w tej samej chwili — nie ma dziś żadnego stanu "aktualnie pokazywana karta" dla prawdziwych skanów (są w pełni efemeryczne po stronie klienta, aż do wysłania odpowiedzi). Rzadki wyścig między prawdziwym skanem a zdalnym uruchomieniem zostaje nieobsłużony — to świadomy kompromis, nie błąd.

## Model danych

Nowy model, analogiczny do `RiskAttempt`, ale reprezentujący losowanie, które jeszcze nie dotarło na urządzenie:

```prisma
model RiskPendingDraw {
  id         String   @id @default(uuid())
  teamId     String   @unique
  cardId     String
  stationId  String
  createdAt  DateTime @default(now())
  team       Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  card       RiskCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  station    Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
}
```

`teamId` jest `@unique` — drużyna może mieć tylko jedno oczekujące zdalne losowanie naraz. To samo pole daje za darmo blokadę kolizji (patrz niżej) i pozwala tabletowi jednoznacznie zapytać "czy jest coś dla mnie".

Wiersz istnieje od momentu kliknięcia "Uruchom na tablecie" do momentu, gdy tablet go odbierze (odpytanie kasuje wiersz — dostarczenie = konsumpcja, dokładnie jak przy realnym skanie karta nigdy nie jest "pokazywana dwa razy").

## Backend: wyzwolenie losowania (admin)

Nowa metoda `RiskQuizService.triggerRemoteDraw(realizationId, teamId, categoryId, difficulty)`:

1. Sprawdza realizację i drużynę (ten sam wzorzec co `adminCompleteCard`).
2. Jeśli dla drużyny istnieje już `RiskPendingDraw` (niezależnie od kategorii) — rzuca `BadRequestException` z komunikatem wskazującym istniejące losowanie (kategoria + trudność), żeby front mógł pokazać "Anuluj aktywną kartę (Historia — Łatwe)" zamiast surowego błędu.
3. Pobiera stacje puli (`RiskPoolStation` dla `categoryId`+`difficulty`) i już podjęte próby drużyny (`RiskAttempt`), dokładnie jak `scanCard()` — losuje jedną nieprzerobioną stację. Jeśli pula jest wyczerpana, rzuca `BadRequestException` ("Brak dostępnych zadań w tej puli dla tej drużyny").
4. Pobiera dowolną wygenerowaną kartę z tej puli (`riskCard.findFirst`, ten sam wzorzec co `applyCardOutcomeCreate`) — jeśli brak, `BadRequestException` proszący o wygenerowanie kart.
5. Tworzy `RiskPendingDraw { teamId, cardId, stationId }`.

Nowa metoda `RiskQuizService.cancelRemoteDraw(realizationId, teamId)` — usuwa `RiskPendingDraw` drużyny, jeśli istnieje (no-op jeśli nie ma).

Endpointy (`AdminOnly`, wzorem istniejących `admin/realizations/:realizationId/teams/:teamId/...`; `categoryId`/`difficulty` w body, tak jak `assignStationToPool` już to robi zamiast segmentów URL):
- `POST admin/realizations/:realizationId/teams/:teamId/launch` — body `{ categoryId, difficulty }`
- `POST admin/realizations/:realizationId/teams/:teamId/cancel-remote-draw`

`getTeamCardBoard` dostaje dodatkowe pole na poziomie odpowiedzi:
```ts
pendingDraw: { categoryId: string; categoryName: string; difficulty: RiskDifficulty } | null
```

## Backend: odbiór na urządzeniu

Nowa metoda `RiskQuizService.pollPendingDraw(sessionToken)` (device-facing, throttlowana jak `scanCard`/`deck-status`):

1. Resolwuje `team`/`realization` z tokena sesji (`requireTeamSession`, istniejący helper).
2. Szuka `RiskPendingDraw` dla `team.id`. Brak → `{ draw: null }`.
3. Jeśli jest — buduje dokładnie ten sam payload co `scanCard()` dla nie-wyczerpanego losowania (`cardId`, `categoryName`, `difficulty`, `station: toRiskStationPayload(...)`), usuwa wiersz `RiskPendingDraw` (konsumpcja) i zwraca `{ draw: { ...payload } }`.

Endpoint: `POST /mobile/risk-quiz/pending-draw` (ten sam wzorzec co `scan`/`deck-status`: throttle `MOBILE_QR_RESOLVE_THROTTLE`, body `{ sessionToken }`).

## Mobile: pętla odpytywania

W `risk-quiz-screen.tsx`:
- Nowy `useEffect`, aktywny gdy: `!showIntro && !activeDraw && !isTestMenuOpen && !isScannerVisible`.
- `setInterval` co 4s wywołujący nowy `fetchRiskQuizPendingDraw(apiBaseUrl, { sessionToken })` (analogiczny do `fetchRiskQuizDeckStatus`).
- Gdy odpowiedź zawiera `draw` — dokładnie ta sama ścieżka co po realnym skanie: `setActiveDraw(result)`, `setExhaustedNotice(null)`, `setAnswerResult(null)` (czyli de facto reużycie fragmentu `handleDetected`, wydzielonego do wspólnej funkcji `applyDraw(result)`).
- Efekt czyści `setInterval` przy odmontowaniu/zmianie zależności, tak jak istniejący poll `pollUntilStarted`.
- 401 z odpytywania → `onSessionInvalid()`, tak jak reszta wywołań API na tym ekranie.

## Admin UI

`current-realization-team-tasks-panel.tsx`, sekcja Ryzykantów:
- `riskBoard.tasks` grupowane po `categoryId`+`difficulty` (kolejność zachowana z odpowiedzi backendu — już posortowana wg kolejności kategorii w talii, potem trudności).
- Każda grupa dostaje nagłówek: nazwa kategorii, poziom trudności, i przycisk:
  - Jeśli `riskBoard.pendingDraw` jest `null` lub dotyczy innej kategorii/trudności: "Uruchom na tablecie" → `triggerRemoteDraw`.
  - Jeśli `pendingDraw` dotyczy *tej* grupy: "Anuluj aktywną kartę" (czerwony wariant) → `cancelRemoteDraw`.
  - Jeśli `pendingDraw` dotyczy *innej* grupy: przycisk wyłączony, tooltip/tekst "Drużyna ma już aktywną kartę (Historia — Łatwe)".
- Nowe mutacje w `risk-quiz.api.ts`: `triggerRiskRemoteDraw`, `cancelRiskRemoteDraw`, obie `invalidatesTags: ["RiskQuiz"]` (odświeżają `getRiskTeamBoard`).

## Obsługa błędów

- Kolizja (drużyna ma już oczekujące losowanie) → komunikat w `actionError` panelu, tak jak inne akcje na tym panelu.
- Wyczerpana pula → jasny komunikat ("Brak dostępnych zadań w tej puli dla tej drużyny"), przycisk grupy pozostaje aktywny (pula może się zmienić po reset karty).
- Brak wygenerowanych kart dla puli → komunikat proszący o wygenerowanie kart (spójne z `adminCompleteCard`).
- Błąd sieci przy odpytywaniu na mobile → cichy retry przy następnym ticku (bez komunikatu błędu — to tło, nie akcja użytkownika), analogicznie do `pollUntilStarted`.

## Testowanie

Backend (`risk-quiz.service.spec.ts`):
- `triggerRemoteDraw`: tworzy `RiskPendingDraw` z poprawnym losowo wybranym stationId spośród nieprzerobionych; odrzuca gdy drużyna ma już pending draw; odrzuca gdy pula wyczerpana; odrzuca gdy brak wygenerowanych kart.
- `cancelRemoteDraw`: usuwa istniejący wiersz; no-op gdy brak.
- `pollPendingDraw`: zwraca `{ draw: null }` gdy brak; zwraca payload i kasuje wiersz gdy jest (drugie wywołanie zwraca `null`).

Mobile: bez nowych testów jednostkowych (ekran Ryzykantów nie ma dziś pokrycia testowego dla podobnych pętli pollingu — weryfikacja manualna: uruchomić realizację Ryzykantów na dwóch urządzeniach/emulatorach, kliknąć "Uruchom na tablecie" w adminie, sprawdzić że karta pojawia się na drugim urządzeniu w ciągu ~4s bez interakcji użytkownika).

Admin: manualna weryfikacja w przeglądarce (typecheck + lint jak dotychczas, bez frameworku testowego w adminie dla tego typu zmian UI).
