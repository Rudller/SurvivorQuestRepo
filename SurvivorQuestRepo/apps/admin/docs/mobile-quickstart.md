# Mobile Quickstart (MVP)

Minimalny flow do odpalenia aplikacji mobilnej na mock API.

## 1) Bootstrap

`GET /api/mobile/bootstrap`

Zwraca:
- listę realizacji z `joinCode`
- paletę 10 kolorów (`teamColors`)
- listę flag (`badgeKeys`)

## 2) Dołączenie urządzenia

`POST /api/mobile/session/join`

Body:
```json
{
  "joinCode": "BL2026",
  "deviceId": "android-emulator-001",
  "memberName": "Jan"
}
```

Response zawiera `sessionToken` i przypisaną drużynę (slot).

## 3) Ustawienie drużyny

Opcja A: ręcznie
- `POST /api/mobile/team/claim` (nazwa + unikalny kolor + flaga)

Opcja B: automatycznie
- `POST /api/mobile/team/randomize`

## 4) Lokalizacja (jeśli wymagana)

`POST /api/mobile/team/location`

Wymagane przed `task/complete`, jeśli realizacja ma `locationRequired = true`.

## 5) Realizacja zadań

`POST /api/mobile/task/complete`

Zaleca się wysyłać `pointsAwarded` i `finishedAt`.

## 6) Synchronizacja stanu

`GET /api/mobile/session/state?sessionToken=...`

Wywołuj cyklicznie (np. co 10s) dla prostego live-view.

## Minimalne wymagania po stronie mobilki

- przechowuj `sessionToken` lokalnie
- po starcie aplikacji odczytaj `bootstrap`
- blokuj submit zadania, jeśli lokalizacja wymagana i brak `lastLocation`
- pokazuj statusy i punkty wyłącznie ze `state`

## Uwaga pod migrację na backend

Nie hardkoduj pól z mocków. Używaj kontraktu endpointów (`bootstrap`, `join`, `state`, `claim`, `randomize`, `location`, `task/complete`).
