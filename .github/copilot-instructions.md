# SurvivorQuest — Copilot Instructions

## Build & Dev Commands

```bash
# Monorepo (from root SurvivorQuestRepo/)
pnpm dev:admin          # Start admin dashboard (Next.js on :3000)
pnpm dev:mobile         # Start mobile app (Expo)

# Admin (from apps/admin/)
pnpm dev                # Next.js dev server
pnpm build              # Production build
pnpm lint               # ESLint

# Mobile (from apps/mobile/)
pnpm start              # Expo dev server
pnpm android            # Android emulator
pnpm ios                # iOS simulator
```

## Architecture

Monorepo (pnpm workspaces + Turbo) with three apps:

| App | Stack | Status |
|---|---|---|
| `apps/admin` | Next.js 16 (App Router, React 19) | Active — mock API mode |
| `apps/mobile` | Expo 54 + React Native 0.81 | Active |
| `apps/backend` | NestJS, Prisma, PostgreSQL, JWT | Planned |

### Backend Tech Stack (apps/backend)

- **Framework:** NestJS (Node.js) — feature-based module structure consistent with the frontend
- **ORM:** Prisma with PostgreSQL
- **Auth:** JWT-based authentication
- **API style:** REST
- **Structure:** Should mirror the feature-based layout used in admin (`modules/<name>/` with controller, service, dto, entity layers)

### Feature-Based Module Structure

Each feature in `apps/admin/src/features/` follows this layout:

```
features/<name>/
├── api/           # RTK Query endpoints (*.api.ts)
├── types/         # Domain types, DTOs, payload types
├── components/    # Feature components (tables, forms, modals, panels)
├── *.utils.ts     # Utility functions, helpers, constants
├── hooks/         # Feature-specific hooks (optional)
└── schemas/       # Zod validation schemas (optional)
```

### Thin Page Convention

Pages (`app/*/page.tsx`) must be **thin orchestrators** (~100-150 lines max). They:
- Fetch data via RTK Query hooks
- Manage top-level state (e.g., which item is being edited)
- Handle auth guards and redirects
- Compose feature components via imports

All UI rendering and form logic live in `features/<feature>/components/` (e.g., `create-*-form.tsx`, `*-table.tsx`, `edit-*-modal.tsx`), while shared helpers stay at feature root (e.g., `*.utils.ts`). Never put large JSX blocks or business logic directly in page files.

### Data Flow

```
┌─────────┐       ┌──────────────────────────────────┐       ┌─────────────┐
│  Mobile  │──────▶│          apps/backend             │◀──────│    Admin     │
│  (Expo)  │  REST │  NestJS + Prisma + PostgreSQL     │  REST │  (Next.js)  │
└─────────┘       └──────────────────────────────────┘       └─────────────┘
                              ▲ target
                              │
          Currently: admin uses built-in mock API
          (Next.js route handlers at /api/*)
```

**Current state:** Admin's `/api/*` route handlers serve as a **temporary mock backend**. They simulate REST responses so the frontend can be developed independently. These mocks are **not** the real backend — they will be replaced.

**Target state:** All clients (admin + mobile) will call `apps/backend` (NestJS). The switch is controlled by `NEXT_PUBLIC_USE_MOCK_API` env var and `buildApiPath()` helper in `shared/api/api-path.ts`. When backend is ready, set `NEXT_PUBLIC_USE_MOCK_API=false` and `NEXT_PUBLIC_API_URL` to the backend URL.

### API Layer (RTK Query)

All data fetching uses RTK Query with a single shared `baseApi` (`shared/api/base-api.ts`). Features inject endpoints via `baseApi.injectEndpoints()`.

**Tag types for cache invalidation:** `User`, `Auth`, `Station`, `Realization`, `Scenario`, `Chat`.

**Feature API file pattern** (e.g., `station.api.ts`):
1. Define DTO types matching the backend response
2. Define `CreatePayload`, `UpdatePayload`, `DeletePayload` types
3. Write a `normalize*()` function that transforms DTO → domain model (safe defaults, fallback images via DiceBear, string trimming)
4. Inject endpoints with `transformResponse` calling the normalizer
5. Export auto-generated hooks (`useGet*Query`, `useCreate*Mutation`, etc.)

### State Management

Redux store (`src/store/`) contains only the RTK Query reducer — no classic Redux slices. The `StoreProvider` (client component) wraps the app in `layout.tsx`.

## Domain Model

- **Station** — a single game challenge. Types: `quiz`, `time`, `points`. In mock API keep **templates** in `/api/games` (and `/api/station` alias). Scenario/realization operations must work on **station instances** (private copies) carrying metadata: `sourceTemplateId`, `scenarioInstanceId`, `realizationId`.
- **Scenario** — an ordered collection of stations. Can be a **template** (original) or an **instance** (cloned for a specific realization, has `sourceTemplateId` pointing to the original). Instances are editable independently.
- **Realization** — a scheduled instance of a scenario for a company, with teams, devices, tasks, and real-time event logs. Types: `outdoor-games` (Gry terenowe), `hotel-games` (Gry hotelowe), `workshops` (Warsztaty), `evening-attractions` (Atrakcje wieczorne), `dj` (DJ), `recreation` (Rekreacja). Includes contact data (`contactPerson`, `contactPhone`, `contactEmail`) and instructor list (`instructors: string[]`). Optional file attachments: `logoUrl` (client logo, base64), `offerPdfUrl`/`offerPdfName` (PDF offer). When creating a realization, the selected scenario template is **auto-cloned** into a dedicated instance.
- **Team** — belongs to a realization; tracks points, tasks, location, and connected devices

## Conventions

- UI text is in **Polish** (labels, navigation, dates)
- Dark theme using Tailwind: `zinc-900` backgrounds, `amber` accents, status colors (`emerald`/`sky`/`rose`)
- Client components must have the `"use client"` directive
- Fallback images use DiceBear avatars (`api.dicebear.com`) keyed by entity ID
- Remote image sources configured in `next.config.ts`: Unsplash and DiceBear
- React Compiler is enabled (`reactCompiler: true` in next.config)
- Forms use React Hook Form + Zod schemas via `@hookform/resolvers`
- Mobile styling uses NativeWind (Tailwind classes on React Native components)

## TODO

<!-- Add planned work items below -->
- 
