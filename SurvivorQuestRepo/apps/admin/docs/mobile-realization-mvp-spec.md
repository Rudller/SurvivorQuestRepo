# Mobile Realization MVP Spec

Status: draft (accepted constraints)
Date: 2026-02-21
Scope: mock-first API contract for mobile app integration with realizations

## 1) Zaakceptowane wymagania

1. Liczba drużyn w realizacji jest stała i równa wartości zdefiniowanej w admin panelu (`teamCount`).
2. Nazwy drużyn są unikalne w obrębie jednej realizacji.
3. Kolory drużyn pochodzą ze stałej palety 10 kolorów i są unikalne w obrębie jednej realizacji.
4. Drużyna może mieć przypisaną flagę/obrazek (`badgeKey` lub `badgeImageUrl`).
5. Lokalizacja drużyny jest obowiązkowa tylko wtedy, gdy admin ustawi `locationRequired = true` dla realizacji.
6. Wszystkie istotne akcje zapisujemy do logu zdarzeń (`event log`).

---

## 2) Model domenowy (MVP)

## `Realization`
- `id: string`
- `companyName: string`
- `status: "planned" | "in-progress" | "done"`
- `scheduledAt: string` (ISO)
- `teamCount: number`
- `locationRequired: boolean`
- `gameIds: string[]`
- `createdAt: string` (ISO)
- `updatedAt: string` (ISO)

## `Team`
- `id: string`
- `realizationId: string`
- `slotNumber: number` (1..teamCount)
- `name: string | null`
- `color: TeamColor | null`
- `badgeKey: string | null` (np. predefiniowany symbol)
- `badgeImageUrl: string | null` (opcjonalnie, jeśli wybieramy custom)
- `points: number`
- `taskStats: { total: number; done: number }`
- `lastLocation: { lat: number; lng: number; accuracy?: number; at: string } | null`
- `status: "unassigned" | "active" | "offline"`
- `createdAt: string` (ISO)
- `updatedAt: string` (ISO)

## `TeamAssignment` (urządzenie -> drużyna)
- `id: string`
- `realizationId: string`
- `teamId: string`
- `deviceId: string`
- `memberName: string | null`
- `sessionToken: string`
- `lastSeenAt: string` (ISO)
- `createdAt: string` (ISO)

## `TeamTaskProgress`
- `id: string`
- `realizationId: string`
- `teamId: string`
- `gameId: string`
- `status: "todo" | "in-progress" | "done"`
- `pointsAwarded: number`
- `startedAt: string | null`
- `finishedAt: string | null`
- `updatedAt: string` (ISO)

## `EventLog`
- `id: string`
- `realizationId: string`
- `teamId: string | null`
- `actorType: "admin" | "mobile-device" | "system"`
- `actorId: string` (email/deviceId/system)
- `eventType: string`
- `payload: Record<string, unknown>`
- `createdAt: string` (ISO)

---

## 3) Stała paleta kolorów (10)

`TeamColor` (enum):
1. `red`
2. `orange`
3. `amber`
4. `yellow`
5. `lime`
6. `emerald`
7. `cyan`
8. `blue`
9. `violet`
10. `rose`

Reguła: jeden kolor może być przypisany tylko do jednej drużyny w danej realizacji.

---

## 4) Reguły biznesowe (twarde)

1. **Team slots**: po starcie realizacji istnieje dokładnie `teamCount` slotów drużyn (`slotNumber` 1..N).
2. **Unikalna nazwa**: `team.name` musi być unikalna case-insensitive w obrębie `realizationId`.
3. **Unikalny kolor**: `team.color` musi być unikalny w obrębie `realizationId`.
4. **Lokalizacja warunkowa**:
   - `locationRequired = true` -> mobilka nie może wejść w flow zadań bez pierwszego `location update`.
   - `locationRequired = false` -> lokalizacja opcjonalna.
5. **Punkty**:
   - punkty drużyny = suma `pointsAwarded` z `TeamTaskProgress` o statusie `done`.
   - nie można drugi raz zaliczyć tego samego `gameId` dla tej samej drużyny (idempotencja).
6. **Flaga drużyny**:
   - można ustawić `badgeKey` z predefiniowanej listy,
   - lub `badgeImageUrl` (jeśli admin to dopuści w konfiguracji; w MVP może być tylko `badgeKey`).
7. **Audyt**: każda zmiana nazwy, koloru, flagi, statusu zadania, punktów, lokalizacji -> wpis w `EventLog`.

---

## 5) API contract (MVP, mock-first)

Base dla mock: `/api/mobile/*`

## `POST /api/mobile/session/join`
Cel: wejście urządzenia do realizacji i przypisanie do slotu drużyny.

Request:
```json
{
  "joinCode": "AB12CD",
  "deviceId": "ios-uuid-123",
  "memberName": "Kuba"
}
```

Response 200:
```json
{
  "sessionToken": "mob_xxx",
  "realizationId": "r-3",
  "team": {
    "id": "t-2",
    "slotNumber": 2,
    "name": null,
    "color": null,
    "badgeKey": null,
    "points": 0
  },
  "locationRequired": true
}
```

Błędy:
- `404` invalid join code
- `409` brak wolnych slotów drużyn

## `POST /api/mobile/team/claim`
Cel: przypisanie/aktualizacja tożsamości drużyny (nazwa, kolor, flaga).

Request:
```json
{
  "sessionToken": "mob_xxx",
  "name": "Turbo Bobry",
  "color": "emerald",
  "badgeKey": "beaver-01"
}
```

Response 200:
```json
{
  "teamId": "t-2",
  "name": "Turbo Bobry",
  "color": "emerald",
  "badgeKey": "beaver-01"
}
```

Błędy:
- `409` nazwa już zajęta
- `409` kolor już zajęty
- `400` nieprawidłowy kolor

## `POST /api/mobile/team/randomize`
Cel: losowanie nazwy (i opcjonalnie badge) dla drużyny.

Request:
```json
{
  "sessionToken": "mob_xxx"
}
```

Response 200:
```json
{
  "teamId": "t-2",
  "name": "Galaktyczne Kapibary",
  "badgeKey": "capybara-02"
}
```

Błędy:
- `409` brak dostępnych unikalnych nazw

## `POST /api/mobile/team/location`
Cel: aktualizacja pozycji drużyny.

Request:
```json
{
  "sessionToken": "mob_xxx",
  "lat": 52.2297,
  "lng": 21.0122,
  "accuracy": 12.5,
  "at": "2026-02-21T10:20:30.000Z"
}
```

Response 200:
```json
{
  "ok": true,
  "lastLocationAt": "2026-02-21T10:20:30.000Z"
}
```

Błędy:
- `400` brak wymaganej lokalizacji przy `locationRequired=true` (np. podczas próby przejścia dalej bez tej akcji)

## `POST /api/mobile/task/complete`
Cel: zaliczenie zadania dla drużyny.

Request:
```json
{
  "sessionToken": "mob_xxx",
  "gameId": "g-2",
  "pointsAwarded": 120,
  "finishedAt": "2026-02-21T10:30:00.000Z"
}
```

Response 200:
```json
{
  "teamId": "t-2",
  "gameId": "g-2",
  "pointsTotal": 340,
  "taskStatus": "done"
}
```

Błędy:
- `409` zadanie już zaliczone

## `GET /api/mobile/session/state?sessionToken=mob_xxx`
Cel: pełny snapshot stanu dla mobilki.

Response 200:
```json
{
  "realization": {
    "id": "r-3",
    "status": "in-progress",
    "locationRequired": true,
    "scheduledAt": "2026-02-22T09:00:00.000Z"
  },
  "team": {
    "id": "t-2",
    "slotNumber": 2,
    "name": "Turbo Bobry",
    "color": "emerald",
    "badgeKey": "beaver-01",
    "points": 340,
    "lastLocation": {
      "lat": 52.2297,
      "lng": 21.0122,
      "at": "2026-02-21T10:20:30.000Z"
    }
  },
  "tasks": [
    { "gameId": "g-1", "status": "done", "pointsAwarded": 220 },
    { "gameId": "g-2", "status": "done", "pointsAwarded": 120 },
    { "gameId": "g-3", "status": "todo", "pointsAwarded": 0 }
  ]
}
```

---

## 6) Event log – minimalne eventType

- `team_joined`
- `team_name_set`
- `team_name_randomized`
- `team_color_set`
- `team_badge_set`
- `team_location_updated`
- `task_completed`
- `points_recalculated`

Każdy event zawiera: `actorType`, `actorId`, `realizationId`, opcjonalnie `teamId`, `payload`, `createdAt`.

---

## 7) Walidacje i idempotencja

1. `team_claim` idempotentny po `sessionToken` (kolejne wywołanie może nadpisać tylko własną drużynę).
2. `task_complete` idempotentny po `(teamId, gameId)`.
3. Wszystkie endpointy mobile (poza `join`) wymagają poprawnego `sessionToken`.
4. `sessionToken` TTL: 12h (MVP), odnawiany na aktywności `state/location/task`.

---

## 8) Plan implementacji (kolejność)

1. Rozszerzyć model realizacji o `locationRequired` + `joinCode`.
2. Dodać mock store dla `teams`, `assignments`, `taskProgress`, `eventLogs`.
3. Dodać endpointy `/api/mobile/session/join`, `/state`.
4. Dodać endpointy `/api/mobile/team/claim`, `/randomize`, `/location`.
5. Dodać endpoint `/api/mobile/task/complete` + przeliczanie punktów.
6. Dodać minimalny widok admin (read-only) do podglądu drużyn i event logów.

---

## 9) Otwarte decyzje (na później)

1. Czy `badgeImageUrl` dopuszczamy w MVP, czy tylko `badgeKey` z katalogu?  
2. Czy randomizacja ma losować też kolor, jeśli nie wybrany ręcznie?  
3. Czy przy `locationRequired=true` blokujemy tylko `task_complete`, czy cały dostęp do gry?
