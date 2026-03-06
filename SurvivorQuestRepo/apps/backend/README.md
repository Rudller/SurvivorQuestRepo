# SurvivorQuest Backend (apps/backend)

Backend API dla aplikacji **admin** (Next.js) i **mobile** (Expo).
Jest oparty o **NestJS + Prisma + PostgreSQL** i trzyma stan trwale w bazie danych (bez in-memory mockow).

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
  - `GET /mobile/session/state`
  - `POST /mobile/team/claim|select|randomize|location`
  - `POST /mobile/task/complete`
  - `GET /mobile/admin/realizations/current`
  - `GET /mobile/admin/realizations/:realizationId`
  - oraz aliasy `GET/POST /api/mobile/...`

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
- `AUTH_COOKIE_SAME_SITE` - `lax` / `strict` / `none`
- `AUTH_COOKIE_SECURE` - `true` dla HTTPS, `false` dla lokalnego HTTP

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
- haslo: `hasło123`

Flow:
1. `POST /auth/login` ustawia cookie `sq_session`.
2. `GET /auth/me` zwraca usera z aktywnej sesji.
3. `POST /auth/logout` uniewaznia sesje.

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
- Cookie auth nie dziala miedzy domenami
  - ustaw `AUTH_COOKIE_SAME_SITE=none`, `AUTH_COOKIE_SECURE=true`, uruchamiaj po HTTPS.
