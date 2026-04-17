# SurvivorQuest Backend (apps/backend)

Backend API dla aplikacji **admin** (Next.js) i **mobile** (Expo).
Jest oparty o **NestJS + Prisma + PostgreSQL** i trzyma stan trwale w bazie danych (bez in-memory mockow).

## 0. Aktualny stan architektury

- Dane sa trwale zapisywane w PostgreSQL przez Prisma.
- Bledy HTTP sa ujednolicone globalnym exception filtrem (`success: false`, `error`, `meta`).
- Endpointy administracyjne sa chronione sesja admina oparta o cookie `sq_session`.
- Male moduly backendu sa celowo uproszczone:
  - `auth`: `controller + service + dto + cookies + guard`
  - `users`: `controller + service + dto`
  - `station`: `controller + service + dto`
  - `scenario`: `controller + service + dto`
- Wieksze moduly trzymaja bardziej rozbudowany podzial:
  - `realization`: `controller + service + dto + entities + mappers`
  - `mobile`: nadal pozostaje najwiekszym modulem do dalszego porzadkowania

Taki uklad ma ulatwiac dokladanie niewielkich pol bez rozlewania zmian po wielu plikach, ale bez przesadnego rozbijania malych feature'ow.

## 1. Co robi backend

Backend udostepnia REST API dla:
- logowania i sesji (`auth`)
- zarzadzania uzytkownikami (`users`)
- czatu (`chat/messages`)
- stanowisk (`station` + alias `api/station`)
- scenariuszy (`scenario`)
- realizacji (`realizations`)
- mobilnych sesji druzyn i telemetry (`mobile/*` + alias `api/mobile/*`)

Wszystkie dane domenowe sa przechowywane w PostgreSQL przez Prisma.

W odpowiedziach domenowych dla `station` i `scenario` backend zwraca jawne pola rozrozniajace template i instance:
- `kind`
- `isTemplate`
- `isInstance` (dla `scenario`)

## 2. Data flow

```text
Admin (Next.js, RTK Query)      Mobile (Expo)
            |                        |
            +--------- REST ----------+
                        |
                apps/backend (NestJS)
                        |
                 Prisma ORM Client
                        |
                  PostgreSQL DB
```

- Admin i mobile czytaja/zapisuja dane przez backend.
- Backend mapuje payloady HTTP na logike modulow i zapisuje/odczytuje dane przez Prisma.
- Auth sesja oparta jest o cookie `sq_session` + tabele `AuthSession`.

Obecnie auth jest nadal w trybie MVP:
- hasla sa haszowane przed zapisem,
- login akceptuje jeszcze stare konta zapisane plaintext i migruje je do hasha przy udanym logowaniu,
- token sesji jest nadal przechowywany w bazie w prostej postaci.

To wystarcza do lokalnego developmentu i stagingu, ale przed produkcja nadal warto zahaszowac tokeny sesji.

## 3. Moduly API (high level)

- `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- `GET/POST/PUT /users`
- `GET/POST /chat/messages`
- `GET/POST/PUT/DELETE /station` oraz `/api/station`
- `GET/POST/PUT/DELETE/PATCH /scenario`
- `GET/POST/PUT /realizations`
- mobilne endpointy:
  - `GET /mobile/bootstrap`
  - `POST /mobile/session/join`
  - `POST /mobile/session/state`
  - `POST /mobile/team/claim|select|randomize|location`
  - `POST /mobile/station/resolve-qr`
  - `POST /mobile/task/complete`
  - `GET /mobile/admin/realizations/current`
  - `GET /mobile/admin/realizations/:realizationId`
  - `GET /mobile/admin/realizations/:realizationId/station-qr`
  - oraz aliasy `GET/POST /api/mobile/...`

### Dostep i autoryzacja

- Publiczne pozostaja endpointy logowania oraz endpointy mobilne dla urzadzen (`/mobile/session/*`, `/mobile/team/*`, `/mobile/task/*`, `/mobile/bootstrap`).
- Mobilne sesje urzadzen zwracaja surowy token tylko do aplikacji mobilnej, ale backend zapisuje w `TeamAssignment` wylacznie jego hash i umie odczytac oraz zmigrowac starsze rekordy zapisane jawnie.
- Endpointy administracyjne wymagaja zalogowanej sesji admina:
  - `/users`
  - `/station`, `/api/station`
  - `/scenario`
  - `/realizations`
  - `/chat/messages`
  - `/mobile/admin/*`
- Mutujace endpointy administracyjne (`POST/PUT/PATCH/DELETE`) wymagaja poprawnego `Origin` lub `Referer` zgodnego z CORS allowlista.

## 4. Wymagania

- Node.js + pnpm
- PostgreSQL (lokalnie lub zdalnie)

Bez dostepnej bazy danych backend wystartuje, ale endpointy zwroca `500` przy probie zapisu/odczytu.

## 5. Konfiguracja (.env)

Skopiuj i uzupelnij:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Najwazniejsze zmienne:

- `DATABASE_URL` - polaczenie Prisma do PostgreSQL
- `PORT` - port API (domyslnie `3001`)
- `CORS_ORIGIN_ALLOWLIST` - lista originow frontendow rozdzielona przecinkami
- `CORS_ALLOW_ALL_DEV_ORIGINS` - opcjonalnie `true` tylko lokalnie, aby dopuscic dowolny origin w dev bez allowlisty
- `AUTH_COOKIE_SAME_SITE` - `lax` / `strict` / `none`
- `AUTH_COOKIE_SECURE` - `true` dla HTTPS, `false` dla lokalnego HTTP
- `STATION_QR_SECRET` - sekret HMAC do podpisywania tokenow QR stanowisk (min. 32 znaki)
- `JOIN_CODE_PEPPER` - pepper do generowania kodow dolaczenia realizacji (min. 32 znaki)
- `JOIN_CODE_LEGACY_PEPPER` - opcjonalny poprzedni pepper do odczytu starszych kodow po rotacji
- `MOBILE_QR_ENTRY_BASE_URL` - bazowy deeplink/URL kodowany do QR (domyslnie `sq://station-entry`)

## 6. Szybki start (lokalnie)

Z roota monorepo:

```bash
pnpm install
cp apps/backend/.env.example apps/backend/.env
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate:dev
pnpm --filter backend prisma:seed
pnpm dev:backend
```

Po starcie API jest pod `http://localhost:3001` (lub `PORT` z env).

## 7. Jak pracowac z backendem (admin + mobile)

### Admin
W `apps/admin/.env.local` ustaw:

```bash
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Mobile
W `apps/mobile/.env.local` ustaw:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP_ALBO_HOST>:3001
```

Dla prawdziwego telefonu uzywaj IP maszyny w sieci LAN, nie `localhost`.

## 8. Auth i konto testowe

Seed tworzy konto testowe kompatybilne z frontendem:
- email: `test@mail.com`
- haslo: wartosc z `SEED_TEST_USER_PASSWORD` (domyslnie `change-me-seed-pass-123`)

Flow:
1. `POST /auth/login` ustawia cookie `sq_session`.
2. `GET /auth/me` zwraca usera z aktywnej sesji.
3. `POST /auth/logout` uniewaznia sesje.

### Tworzenie uzytkownika z haslem

`POST /users` i `PUT /users` obsluguja teraz opcjonalne pole `password`.

Przyklad create:

```json
{
  "displayName": "Admin testowy",
  "email": "admin2@survivorquest.app",
  "role": "admin",
  "status": "active",
  "password": "haslo1234"
}
```

Odpowiedz uzytkownika zawiera pole `hasPassword`, aby frontend wiedzial, czy konto ma ustawione haslo.

Backend haszuje nowe hasla zapisywane przez `POST /users`, `PUT /users` i przez seed. Pole `password` musi miec minimum 8 znakow.
Cookie `sq_session` nadal przechowuje surowy token po stronie przegladarki, ale w tabeli `AuthSession` backend zapisuje juz tylko jego hash i podczas odczytu umie tez zmigrowac starsze rekordy zapisane w postaci jawnej.

## 8.1. Format bledow API

Backend zwraca teraz ujednolicony ksztalt bledow, np.:

```json
{
  "success": false,
  "error": {
    "code": "bad_request",
    "message": "Invalid payload"
  },
  "meta": {
    "statusCode": 400,
    "timestamp": "2026-03-07T12:00:00.000Z",
    "path": "/users"
  }
}
```

Mapowane kody:
- `400` -> `bad_request`
- `401` -> `unauthorized`
- `403` -> `forbidden`
- `404` -> `not_found`
- `409` -> `conflict`
- pozostale -> `internal_server_error`

## 9. Przydatne komendy backendu

```bash
pnpm --filter backend build
pnpm --filter backend test
pnpm --filter backend test:e2e
pnpm --filter backend exec eslint "{src,apps,libs,test}/**/*.ts"
pnpm --filter backend prisma:seed
pnpm --filter backend prisma:studio
```

## 10. Typowe problemy

- `PrismaClientInitializationError` / "Can't reach database server"
  - sprawdz czy PostgreSQL dziala i czy `DATABASE_URL` jest poprawny.
- CORS blokuje requesty z frontendu
  - dodaj origin frontendu do `CORS_ORIGIN_ALLOWLIST`.
  - w production `CORS_ORIGIN_ALLOWLIST` jest wymagane przy starcie.
- Cookie auth nie dziala miedzy domenami
  - ustaw `AUTH_COOKIE_SAME_SITE=none`, `AUTH_COOKIE_SECURE=true`, uruchamiaj po HTTPS.
- `401 Unauthorized` na endpointach adminowych
  - sprawdz czy najpierw wykonales `POST /auth/login` i czy przegladarka wysyla cookie `sq_session`.
