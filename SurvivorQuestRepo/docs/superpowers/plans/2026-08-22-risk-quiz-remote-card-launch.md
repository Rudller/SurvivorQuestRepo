# Ryzykanci: zdalne uruchomienie karty na tablecie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin action that queues a random not-yet-attempted station draw for one category×difficulty pool, which the team's tablet picks up automatically (via polling) and opens exactly as if they had scanned the physical card.

**Architecture:** A new `RiskPendingDraw` table (one row max per team) is the hand-off point. The admin panel creates a row via a new endpoint; the mobile app, while idle on the Ryzykanci scan screen, polls a new device-facing endpoint every 4s that returns-and-deletes that row (delivery = consumption). `getTeamCardBoard` (already built) grows a `pendingDraw` field so the admin panel can show which category is currently "in flight" and offer a cancel action instead of double-queuing.

**Tech Stack:** NestJS + Prisma (backend), Next.js + RTK Query (admin), Expo/React Native (mobile). No new libraries.

**Spec:** `docs/superpowers/specs/2026-08-22-risk-quiz-remote-card-launch-design.md`

## Global Constraints

- Applies only to realizations with `type === "risk-quiz"`.
- A team can have at most one `RiskPendingDraw` at a time (`teamId` is `@unique`) — this is both the storage model and the collision check.
- Mobile polling interval: 4000ms, active only while idle on the Ryzykanci scan screen (`!showIntro && !activeDraw && !isTestMenuOpen && !isScannerVisible`).
- Known, accepted limitation: no coordination with a real physical scan happening on the same device at the same instant — there is no server-side "currently showing" state for real scans today, and adding one is out of scope. Do not attempt to fix this during implementation; a one-line code comment noting it is sufficient.
- Admin-triggered draws use flat (non-streak) scoring only insofar as they reuse the *existing* `RISK_DIFFICULTY_POINTS`/streak pipeline at answer time — this feature only decides *which station* gets drawn, not how it's scored (scoring is unchanged, handled by the existing `submitAnswer`).
- Backend routes for this feature follow the existing `admin/realizations/:realizationId/teams/:teamId/...` prefix; `categoryId`/`difficulty` go in the request body (matching `assignStationToPool`), never in the URL path.
- The new device-facing `pending-draw` endpoint MUST NOT reuse `MOBILE_QR_RESOLVE_THROTTLE` — that throttle is IP-keyed (no `getTracker`), fine for one-off actions like `scan`/`answer` but not for a continuous 4s poll: several tablets behind one venue's shared IP would exhaust one shared bucket fast, causing 429s during real play. It needs its own session-token-keyed throttle (Task 4, Step 0).

---

### Task 1: Prisma schema — `RiskPendingDraw` model + migration

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260822150000_add_risk_pending_draw/migration.sql`

**Interfaces:**
- Produces: Prisma model `RiskPendingDraw { id, teamId (unique), cardId, stationId, createdAt }` with relations to `Team`, `RiskCard`, `Station`, and `prisma.riskPendingDraw` client accessor (`findUnique`, `create`, `delete`) used by every later backend task.

- [ ] **Step 1: Add the relation field to `Station`**

In `apps/backend/prisma/schema.prisma`, find this exact line inside `model Station { ... }` (currently line 164):

```prisma
  riskAttempts     RiskAttempt[]
```

Add a new line directly after it:

```prisma
  riskAttempts     RiskAttempt[]
  riskPendingDraws RiskPendingDraw[]
```

- [ ] **Step 2: Add the relation field to `RiskCard`**

Find this exact line inside `model RiskCard { ... }`:

```prisma
  attempts      RiskAttempt[]
```

Add a new line directly after it:

```prisma
  attempts      RiskAttempt[]
  pendingDraws  RiskPendingDraw[]
```

- [ ] **Step 3: Add the relation field to `Team`**

Find this exact line inside `model Team { ... }`:

```prisma
  riskAttempts       RiskAttempt[]
```

Add a new line directly after it:

```prisma
  riskAttempts       RiskAttempt[]
  riskPendingDraw    RiskPendingDraw?
```

- [ ] **Step 4: Add the new `RiskPendingDraw` model**

Find `model RiskAttempt { ... }` in the schema — it ends with a closing brace followed by a blank line and then `model EventLog {`. Insert the new model between them, right after `RiskAttempt`'s closing `}` and before `model EventLog {`:

```prisma
// A draw ("losowanie") triggered remotely by an admin instead of a real
// physical QR scan — queued here until the team's device polls for it and
// consumes it (RiskQuizService.pollPendingDraw). teamId is unique: a team
// can only have one such draw in flight at a time, which doubles as the
// collision check on the admin trigger endpoint.
model RiskPendingDraw {
  id        String   @id @default(uuid())
  teamId    String   @unique
  cardId    String
  stationId String
  createdAt DateTime @default(now())
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  card      RiskCard @relation(fields: [cardId], references: [id], onDelete: Cascade)
  station   Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 5: Write the migration SQL**

Create the directory `apps/backend/prisma/migrations/20260822150000_add_risk_pending_draw/` and inside it a file `migration.sql` with exactly this content:

```sql
-- CreateTable
CREATE TABLE "RiskPendingDraw" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskPendingDraw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskPendingDraw_teamId_key" ON "RiskPendingDraw"("teamId");

-- AddForeignKey
ALTER TABLE "RiskPendingDraw" ADD CONSTRAINT "RiskPendingDraw_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskPendingDraw" ADD CONSTRAINT "RiskPendingDraw_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "RiskCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskPendingDraw" ADD CONSTRAINT "RiskPendingDraw_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 6: Apply the migration**

Run from `apps/backend`:

```bash
npx prisma migrate deploy
```

Expected: `All migrations have been successfully applied.` including `20260822150000_add_risk_pending_draw`.

- [ ] **Step 7: Regenerate the Prisma client**

Run from `apps/backend`:

```bash
npx prisma generate
```

If this fails with `EPERM ... query_engine-windows.dll.node`, something (most likely the `pnpm dev:backend` watcher) is holding the file open — ask the user to stop it, then retry. This is a one-time step for this task; it is not needed again for the rest of this plan.

Expected: `✔ Generated Prisma Client ...`

- [ ] **Step 8: Verify the schema compiles into usable types**

Run from `apps/backend`:

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: no new errors (nothing references `prisma.riskPendingDraw` yet, so this is a smoke check that the client generated correctly).

- [ ] **Step 9: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/20260822150000_add_risk_pending_draw
git commit -m "feat(risk-quiz): add RiskPendingDraw model and migration"
```

---

### Task 2: Backend — `triggerRemoteDraw` + `cancelRemoteDraw`

**Files:**
- Modify: `apps/backend/src/modules/risk-quiz/risk-quiz.service.ts`
- Modify: `apps/backend/src/modules/risk-quiz/risk-quiz.service.spec.ts`

**Interfaces:**
- Consumes: `prisma.riskPendingDraw` (Task 1), existing `this.requireRealizationOrThrow(realizationId)`, `RISK_DIFFICULTY_POINTS`-independent (no scoring here) — reuses the same random-draw-from-pool logic pattern as `scanCard()`.
- Produces: `RiskQuizService.triggerRemoteDraw(realizationId: string, teamId: string, categoryId: string, difficulty: RiskDifficulty): Promise<RiskPendingDraw>` and `RiskQuizService.cancelRemoteDraw(realizationId: string, teamId: string): Promise<{ teamId: string; cancelled: boolean }>`, both used by Task 4's controller endpoints.

- [ ] **Step 1: Add `riskPendingDraw` to the test mock scaffold**

In `apps/backend/src/modules/risk-quiz/risk-quiz.service.spec.ts`, find this exact block near the top of `createService()`:

```ts
    riskPoolStation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    riskSchemeCategory: { findMany: jest.fn() },
```

Replace it with:

```ts
    riskPoolStation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    riskPendingDraw: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      delete: jest.fn(),
    },
    riskSchemeCategory: { findMany: jest.fn() },
```

(Defaulting `findUnique` to resolve `null` means every existing test that doesn't care about pending draws keeps working unchanged.)

- [ ] **Step 2: Write the failing tests**

Append these two `describe` blocks at the very end of `apps/backend/src/modules/risk-quiz/risk-quiz.service.spec.ts` (after the final `});` that closes `describe('RiskQuizService.resetTeamAttempts', ...)`):

```ts
describe('RiskQuizService.triggerRemoteDraw', () => {
  it('creates a pending draw for a randomly chosen not-yet-attempted station in the pool', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue(null);
    prisma.riskPoolStation.findMany.mockResolvedValue([
      { stationId: 'station-1' },
      { stationId: 'station-2' },
    ]);
    prisma.riskAttempt.findMany.mockResolvedValue([{ stationId: 'station-1' }]);
    prisma.riskCard.findFirst.mockResolvedValue({ id: 'card-1' });
    prisma.riskPendingDraw.create.mockResolvedValue({
      id: 'draw-1',
      teamId: 'team-1',
      cardId: 'card-1',
      stationId: 'station-2',
    });

    await service.triggerRemoteDraw('realization-1', 'team-1', 'category-1', 'EASY');

    expect(prisma.riskPendingDraw.create).toHaveBeenCalledWith({
      data: { teamId: 'team-1', cardId: 'card-1', stationId: 'station-2' },
    });
  });

  it('rejects when the team already has a pending draw', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue({
      id: 'draw-1',
      teamId: 'team-1',
      cardId: 'card-1',
      stationId: 'station-1',
    });

    await expect(
      service.triggerRemoteDraw('realization-1', 'team-1', 'category-1', 'EASY'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.riskPoolStation.findMany).not.toHaveBeenCalled();
  });

  it('rejects when every station in the pool has already been attempted by the team', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue(null);
    prisma.riskPoolStation.findMany.mockResolvedValue([{ stationId: 'station-1' }]);
    prisma.riskAttempt.findMany.mockResolvedValue([{ stationId: 'station-1' }]);

    await expect(
      service.triggerRemoteDraw('realization-1', 'team-1', 'category-1', 'EASY'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.riskCard.findFirst).not.toHaveBeenCalled();
  });

  it('rejects when no cards have been generated yet for the pool', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue(null);
    prisma.riskPoolStation.findMany.mockResolvedValue([{ stationId: 'station-1' }]);
    prisma.riskAttempt.findMany.mockResolvedValue([]);
    prisma.riskCard.findFirst.mockResolvedValue(null);

    await expect(
      service.triggerRemoteDraw('realization-1', 'team-1', 'category-1', 'EASY'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.riskPendingDraw.create).not.toHaveBeenCalled();
  });

  it('rejects a team that does not belong to the realization', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'other-realization',
    });

    await expect(
      service.triggerRemoteDraw('realization-1', 'team-1', 'category-1', 'EASY'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('RiskQuizService.cancelRemoteDraw', () => {
  it('deletes the pending draw for the team', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue({
      id: 'draw-1',
      teamId: 'team-1',
      cardId: 'card-1',
      stationId: 'station-1',
    });
    prisma.riskPendingDraw.delete.mockResolvedValue({});

    const result = await service.cancelRemoteDraw('realization-1', 'team-1');

    expect(prisma.riskPendingDraw.delete).toHaveBeenCalledWith({
      where: { teamId: 'team-1' },
    });
    expect(result).toEqual({ teamId: 'team-1', cancelled: true });
  });

  it('does nothing when the team has no pending draw', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue(null);

    const result = await service.cancelRemoteDraw('realization-1', 'team-1');

    expect(prisma.riskPendingDraw.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ teamId: 'team-1', cancelled: false });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run from `apps/backend`:

```bash
npx jest src/modules/risk-quiz/risk-quiz.service.spec.ts
```

Expected: FAIL — `service.triggerRemoteDraw is not a function` / `service.cancelRemoteDraw is not a function`.

- [ ] **Step 4: Implement `triggerRemoteDraw` and `cancelRemoteDraw`**

In `apps/backend/src/modules/risk-quiz/risk-quiz.service.ts`, find the final closing brace of the class — the line that reads just `}` right after `adminResetCard`'s closing brace (currently the very last line, 1178). Insert the two new methods before that final `}`:

```ts

  // Queues a random not-yet-attempted station draw for one (category,
  // difficulty) pool — the admin-panel equivalent of the team scanning a
  // physical card, delivered to their device by pollPendingDraw() below.
  async triggerRemoteDraw(
    realizationId: string,
    teamId: string,
    categoryId: string,
    difficulty: RiskDifficulty,
  ) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.realizationId !== realization.id) {
      throw new NotFoundException('Team not found');
    }

    const existingPendingDraw = await this.prisma.riskPendingDraw.findUnique({
      where: { teamId },
    });
    if (existingPendingDraw) {
      throw new BadRequestException(
        'Drużyna ma już aktywną kartę — najpierw ją anuluj.',
      );
    }

    const poolStations = await this.prisma.riskPoolStation.findMany({
      where: { categoryId, difficulty },
    });
    if (poolStations.length === 0) {
      throw new NotFoundException('Category/difficulty pool not found');
    }

    const attempted = await this.prisma.riskAttempt.findMany({
      where: {
        teamId,
        stationId: { in: poolStations.map((item) => item.stationId) },
      },
      select: { stationId: true },
    });
    const attemptedStationIds = new Set(
      attempted.map((item) => item.stationId),
    );
    const available = poolStations.filter(
      (item) => !attemptedStationIds.has(item.stationId),
    );
    if (available.length === 0) {
      throw new BadRequestException(
        'Brak dostępnych zadań w tej puli dla tej drużyny.',
      );
    }

    const chosen = available[Math.floor(Math.random() * available.length)];

    const card = await this.prisma.riskCard.findFirst({
      where: { realizationId, categoryId, difficulty },
      orderBy: { createdAt: 'asc' },
    });
    if (!card) {
      throw new BadRequestException(
        'Brak wygenerowanych kart dla tej puli — najpierw wygeneruj karty.',
      );
    }

    return this.prisma.riskPendingDraw.create({
      data: { teamId, cardId: card.id, stationId: chosen.stationId },
    });
  }

  async cancelRemoteDraw(realizationId: string, teamId: string) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.realizationId !== realization.id) {
      throw new NotFoundException('Team not found');
    }

    const existing = await this.prisma.riskPendingDraw.findUnique({
      where: { teamId },
    });
    if (!existing) {
      return { teamId, cancelled: false };
    }

    await this.prisma.riskPendingDraw.delete({ where: { teamId } });
    return { teamId, cancelled: true };
  }
}
```

(Note the trailing `}` above is the class's closing brace — you're replacing the old final `}` with this whole block ending in `}`.)

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx jest src/modules/risk-quiz/risk-quiz.service.spec.ts
```

Expected: PASS, all tests including the 7 new ones.

- [ ] **Step 6: Lint**

```bash
npx eslint src/modules/risk-quiz/risk-quiz.service.ts src/modules/risk-quiz/risk-quiz.service.spec.ts
```

Expected: no errors (the pre-existing `data: expect.objectContaining(...)` unsafe-assignment noise elsewhere in this file is a known, repo-wide pattern — not introduced by this task, don't chase it).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/risk-quiz/risk-quiz.service.ts apps/backend/src/modules/risk-quiz/risk-quiz.service.spec.ts
git commit -m "feat(risk-quiz): add triggerRemoteDraw and cancelRemoteDraw"
```

---

### Task 3: Backend — `pollPendingDraw` + `getTeamCardBoard.pendingDraw`

**Files:**
- Modify: `apps/backend/src/modules/risk-quiz/risk-quiz.service.ts`
- Modify: `apps/backend/src/modules/risk-quiz/risk-quiz.service.spec.ts`

**Interfaces:**
- Consumes: `prisma.riskPendingDraw` (Task 1), existing `this.requireTeamSession(sessionToken)`, existing private `this.toRiskStationPayload(station)`.
- Produces: `RiskQuizService.pollPendingDraw(sessionToken: string): Promise<{ draw: { cardId: string; categoryName: string; difficulty: RiskDifficulty; station: ReturnType<typeof this.toRiskStationPayload> } | null }>` (used by Task 4's device-facing controller endpoint), and `getTeamCardBoard`'s return type grows a `pendingDraw: { categoryId: string; categoryName: string; difficulty: RiskDifficulty } | null` field (used by Task 6/7's admin UI).

- [ ] **Step 1: Update the two existing `getTeamCardBoard` tests that assert the full return shape**

In `apps/backend/src/modules/risk-quiz/risk-quiz.service.spec.ts`, find this exact block (inside `it("returns one row per pool station across every category in the team's scheme", ...)`):

```ts
    expect(result).toEqual({
      teamId: 'team-1',
      tasks: [
```

Replace with:

```ts
    expect(result).toEqual({
      teamId: 'team-1',
      pendingDraw: null,
      tasks: [
```

Then find this exact line (inside `it('returns an empty task list when the realization has no assigned scheme', ...)`):

```ts
    expect(result).toEqual({ teamId: 'team-1', tasks: [] });
```

Replace with:

```ts
    expect(result).toEqual({ teamId: 'team-1', tasks: [], pendingDraw: null });
```

- [ ] **Step 2: Write the new failing tests**

Find this exact block near the end of the `describe('RiskQuizService.getTeamCardBoard', ...)` block:

```ts
    await expect(
      service.getTeamCardBoard('realization-1', 'team-1'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('RiskQuizService.adminCompleteCard / adminFailCard', () => {
```

Replace with (adding one new test before the block closes, and two new `describe` blocks after it):

```ts
    await expect(
      service.getTeamCardBoard('realization-1', 'team-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('includes the pending draw summary when the team has one queued', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: null,
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue({
      id: 'draw-1',
      teamId: 'team-1',
      cardId: 'card-1',
      stationId: 'station-1',
      card: { categoryId: 'category-1', difficulty: 'EASY', category: { name: 'Historia' } },
    });

    const result = await service.getTeamCardBoard('realization-1', 'team-1');

    expect(result.pendingDraw).toEqual({
      categoryId: 'category-1',
      categoryName: 'Historia',
      difficulty: 'EASY',
    });
  });
});

describe('RiskQuizService.pollPendingDraw', () => {
  it('returns null when there is no pending draw for the team', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskPendingDraw.findUnique.mockResolvedValue(null);

    const result = await service.pollPendingDraw('token');

    expect(result).toEqual({ draw: null });
    expect(prisma.riskPendingDraw.delete).not.toHaveBeenCalled();
  });

  it('returns the drawn station and consumes (deletes) the pending draw', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskPendingDraw.findUnique.mockResolvedValue({
      id: 'draw-1',
      teamId: 'team-1',
      cardId: 'card-1',
      stationId: 'station-1',
      card: { difficulty: 'EASY', category: { name: 'Historia' } },
      station: quizStation,
    });
    prisma.riskPendingDraw.delete.mockResolvedValue({});

    const result = await service.pollPendingDraw('token');

    expect(prisma.riskPendingDraw.delete).toHaveBeenCalledWith({
      where: { teamId: 'team-1' },
    });
    expect(result).toEqual({
      draw: {
        cardId: 'card-1',
        categoryName: 'Historia',
        difficulty: 'EASY',
        station: {
          id: 'station-1',
          type: 'quiz',
          name: 'Pytanie',
          description: 'Opis',
          imageUrl: null,
          points: 0,
          timeLimitSeconds: 0,
          completionCodeLength: undefined,
          completionCodeInputMode: 'alphanumeric',
          quiz: { question: 'Q1?', answers: ['a', 'b'], audioUrl: undefined },
        },
      },
    });
  });
});

describe('RiskQuizService.adminCompleteCard / adminFailCard', () => {
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npx jest src/modules/risk-quiz/risk-quiz.service.spec.ts
```

Expected: FAIL — the two updated `toEqual` assertions fail because `pendingDraw` isn't in the actual result yet, and `service.pollPendingDraw is not a function`.

- [ ] **Step 4: Implement `pollPendingDraw` and extend `getTeamCardBoard`**

In `apps/backend/src/modules/risk-quiz/risk-quiz.service.ts`, find the `getTeamCardBoard` method's opening:

```ts
  async getTeamCardBoard(realizationId: string, teamId: string) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.realizationId !== realization.id) {
      throw new NotFoundException('Team not found');
    }

    if (!realization.riskSchemeId) {
      return { teamId, tasks: [] };
    }
```

Replace with:

```ts
  async getTeamCardBoard(realizationId: string, teamId: string) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.realizationId !== realization.id) {
      throw new NotFoundException('Team not found');
    }

    const pendingDraw = await this.getPendingDrawSummary(teamId);

    if (!realization.riskSchemeId) {
      return { teamId, tasks: [], pendingDraw };
    }
```

A few lines further down in the same method, find:

```ts
    const categoryIds = schemeCategories.map((item) => item.categoryId);
    if (categoryIds.length === 0) {
      return { teamId, tasks: [] };
    }
```

Replace with:

```ts
    const categoryIds = schemeCategories.map((item) => item.categoryId);
    if (categoryIds.length === 0) {
      return { teamId, tasks: [], pendingDraw };
    }
```

Finally, find the method's last line:

```ts
    return { teamId, tasks };
  }
```

(this is the return at the very end of `getTeamCardBoard`, right before the `private async requireRiskPoolStationOrThrow` method) — replace with:

```ts
    return { teamId, tasks, pendingDraw };
  }

  // Shared by getTeamCardBoard (admin) and — indirectly, via the same
  // uniqueness — the collision check in triggerRemoteDraw. Decoupled from
  // the current scheme's categories so it stays correct even if the scheme
  // changed after the draw was queued.
  private async getPendingDrawSummary(teamId: string) {
    const pendingDraw = await this.prisma.riskPendingDraw.findUnique({
      where: { teamId },
      include: { card: { include: { category: true } } },
    });
    if (!pendingDraw) {
      return null;
    }
    return {
      categoryId: pendingDraw.card.categoryId,
      categoryName: pendingDraw.card.category.name,
      difficulty: pendingDraw.card.difficulty,
    };
  }
```

Now add `pollPendingDraw` as a device-facing method. Find the end of `getDeckStatus` (it returns `{ categoryCount, remainingCards };` then closes with `}`, right before the `private toRiskStationPayload(station: {` method). Insert the new method between them:

```ts
    return {
      categoryCount: categoryIds.length,
      remainingCards,
    };
  }

  // Delivers (and consumes) a remote draw an admin queued via
  // triggerRemoteDraw() — same payload shape scanCard() returns for a
  // non-exhausted draw, so the mobile client can feed it into the exact
  // same "active card" state either path produces. Known gap: this has no
  // way to know about a real physical scan the team might be making at the
  // same instant on the same device — there's no server-side "currently
  // showing" state for that today, and a race there is left unhandled.
  async pollPendingDraw(sessionToken: string) {
    const { team } = await this.requireTeamSession(sessionToken);

    const pendingDraw = await this.prisma.riskPendingDraw.findUnique({
      where: { teamId: team.id },
      include: { card: { include: { category: true } }, station: true },
    });

    if (!pendingDraw) {
      return { draw: null };
    }

    await this.prisma.riskPendingDraw.delete({ where: { teamId: team.id } });

    return {
      draw: {
        cardId: pendingDraw.cardId,
        categoryName: pendingDraw.card.category.name,
        difficulty: pendingDraw.card.difficulty,
        station: this.toRiskStationPayload(pendingDraw.station),
      },
    };
  }

  private toRiskStationPayload(station: {
```

(The last line above is the existing method signature you're inserting before — don't duplicate it, just make sure `pollPendingDraw` ends up directly above it.)

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx jest src/modules/risk-quiz/risk-quiz.service.spec.ts
```

Expected: PASS, all tests.

- [ ] **Step 6: Lint and typecheck**

```bash
npx eslint src/modules/risk-quiz/risk-quiz.service.ts src/modules/risk-quiz/risk-quiz.service.spec.ts
npx tsc --noEmit -p tsconfig.json
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/risk-quiz/risk-quiz.service.ts apps/backend/src/modules/risk-quiz/risk-quiz.service.spec.ts
git commit -m "feat(risk-quiz): add pollPendingDraw and surface pendingDraw on getTeamCardBoard"
```

---

### Task 4: Backend — controller endpoints

**Files:**
- Modify: `apps/backend/src/common/security/throttle.constants.ts`
- Modify: `apps/backend/src/modules/risk-quiz/risk-quiz.controller.ts`

**Interfaces:**
- Consumes: `RiskQuizService.triggerRemoteDraw`, `.cancelRemoteDraw`, `.pollPendingDraw` (Tasks 2–3); existing controller helpers `requirePayload`, `requireString`, `requireDifficulty`; existing `mobileSessionTracker` (from `throttle.constants.ts`).
- Produces: `RISK_QUIZ_PENDING_DRAW_THROTTLE` constant; `POST /mobile/risk-quiz/pending-draw` (device-facing), `POST /mobile/risk-quiz/admin/realizations/:realizationId/teams/:teamId/launch` and `.../cancel-remote-draw` (admin-facing) — used by Task 5 (mobile) and Task 6 (admin api client) respectively.

This controller has no existing test file (`risk-quiz.controller.ts` has none of its siblings tested either — verified via typecheck/lint only, matching the rest of this controller).

- [ ] **Step 1: Add a session-token-keyed throttle sized for a 4s poll**

`MOBILE_QR_RESOLVE_THROTTLE` is IP-keyed (no `getTracker`) — fine for one-off actions like `scan`/`answer`, but the new `pending-draw` endpoint is polled continuously every 4s while idle, so it needs its own throttle keyed per session token (like `MOBILE_SESSION_STATE_THROTTLE` already does for its 3s poll), or several tablets behind one shared venue IP would exhaust one bucket and start seeing 429s.

In `apps/backend/src/common/security/throttle.constants.ts`, find the end of the file:

```ts
export const MOBILE_SESSION_STATE_THROTTLE = {
  short: { limit: 40, ttl: 60_000, getTracker: mobileSessionTracker },
  long: { limit: 600, ttl: 15 * 60_000, getTracker: mobileSessionTracker },
} as const;
```

Add directly after it:

```ts

// Polled every 4s by the Ryzykanci scan screen while idle, waiting for an
// admin-triggered "Uruchom na tablecie" draw. Keyed per session token (see
// mobileSessionTracker above) — several tablets behind one venue's
// shared/carrier IP must not share a bucket, since a busy realization can
// have many teams polling this at once. Sized to ~2x the steady poll rate
// per device (4s poll ≈ 15/min).
export const RISK_QUIZ_PENDING_DRAW_THROTTLE = {
  short: { limit: 30, ttl: 60_000, getTracker: mobileSessionTracker },
  long: { limit: 450, ttl: 15 * 60_000, getTracker: mobileSessionTracker },
} as const;
```

- [ ] **Step 2: Add the device-facing `pending-draw` endpoint**

In `apps/backend/src/modules/risk-quiz/risk-quiz.controller.ts`, find:

```ts
import { MOBILE_QR_RESOLVE_THROTTLE } from '../../common/security/throttle.constants';
```

Replace with:

```ts
import {
  MOBILE_QR_RESOLVE_THROTTLE,
  RISK_QUIZ_PENDING_DRAW_THROTTLE,
} from '../../common/security/throttle.constants';
```

Then find:

```ts
  @Post('test-menu')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async getTestMenu(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.listTestMenuEntries(
      requireString(payload, 'sessionToken'),
    );
  }

  // --- Admin: categories ---
```

Replace with:

```ts
  @Post('test-menu')
  @Throttle(MOBILE_QR_RESOLVE_THROTTLE)
  async getTestMenu(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.listTestMenuEntries(
      requireString(payload, 'sessionToken'),
    );
  }

  @Post('pending-draw')
  @Throttle(RISK_QUIZ_PENDING_DRAW_THROTTLE)
  async getPendingDraw(@Body() rawPayload: unknown) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.pollPendingDraw(
      requireString(payload, 'sessionToken'),
    );
  }

  // --- Admin: categories ---
```

- [ ] **Step 3: Add the two admin-facing endpoints**

Find:

```ts
  @Get('admin/realizations/:realizationId/teams/:teamId/board')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getTeamCardBoard(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.riskQuizService.getTeamCardBoard(realizationId, teamId);
  }

  @Post(
    'admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/complete',
  )
```

Replace with:

```ts
  @Get('admin/realizations/:realizationId/teams/:teamId/board')
  @AdminOrInstructor()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async getTeamCardBoard(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.riskQuizService.getTeamCardBoard(realizationId, teamId);
  }

  @Post('admin/realizations/:realizationId/teams/:teamId/launch')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async triggerRemoteDraw(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
    @Body() rawPayload: unknown,
  ) {
    const payload = requirePayload(rawPayload);
    return this.riskQuizService.triggerRemoteDraw(
      realizationId,
      teamId,
      requireString(payload, 'categoryId'),
      requireDifficulty(payload, 'difficulty'),
    );
  }

  @Post('admin/realizations/:realizationId/teams/:teamId/cancel-remote-draw')
  @AdminOnly()
  @UseGuards(AuthenticatedSessionGuard, RolesGuard)
  async cancelRemoteDraw(
    @Param('realizationId') realizationId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.riskQuizService.cancelRemoteDraw(realizationId, teamId);
  }

  @Post(
    'admin/realizations/:realizationId/teams/:teamId/tasks/:stationId/complete',
  )
```

- [ ] **Step 4: Typecheck and lint**

Run from `apps/backend`:

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint src/common/security/throttle.constants.ts src/modules/risk-quiz/risk-quiz.controller.ts
```

Expected: no errors.

- [ ] **Step 5: Run the full backend test suite as a regression check**

```bash
npx jest
```

Expected: all suites pass (this task adds no new tests of its own, but must not break anything).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/common/security/throttle.constants.ts apps/backend/src/modules/risk-quiz/risk-quiz.controller.ts
git commit -m "feat(risk-quiz): wire pending-draw and remote-draw endpoints, throttled per session"
```

---

### Task 5: Mobile — polling for the pending draw

**Files:**
- Modify: `apps/mobile/src/features/risk-quiz/api/risk-quiz.api.ts`
- Modify: `apps/mobile/src/features/risk-quiz/ui/risk-quiz-screen.tsx`

**Interfaces:**
- Consumes: `POST /mobile/risk-quiz/pending-draw` (Task 4); existing `requestMobileApi` helper; existing `RiskDrawnStation`/`RiskDifficulty` types in the same api file; existing `ActiveDraw`, `activeDraw`/`setActiveDraw`, `showIntro`, `isTestMenuOpen`, `isScannerVisible`, `apiBaseUrl`, `sessionToken`, `onSessionInvalid`, `getMobileApiErrorStatusCode` already present in `risk-quiz-screen.tsx`.
- Produces: `fetchRiskQuizPendingDraw(apiBaseUrl, { sessionToken }): Promise<{ draw: RiskPendingDraw | null }>`, consumed only within this task.

No automated tests exist for this screen's polling patterns today (verified: no `risk-quiz-screen.spec.tsx` in the repo) — this task is verified via typecheck/lint plus a manual check.

- [ ] **Step 1: Add the API client function**

In `apps/mobile/src/features/risk-quiz/api/risk-quiz.api.ts`, append at the end of the file (after the existing `postRiskQuizAnswer` function):

```ts

export type RiskPendingDraw = {
  cardId: string;
  categoryName: string;
  difficulty: RiskDifficulty;
  station: RiskDrawnStation;
};

export async function fetchRiskQuizPendingDraw(
  apiBaseUrl: string,
  payload: { sessionToken: string },
) {
  return requestMobileApi<{ draw: RiskPendingDraw | null }>(
    apiBaseUrl,
    "/mobile/risk-quiz/pending-draw",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
```

- [ ] **Step 2: Import the new function in the screen**

In `apps/mobile/src/features/risk-quiz/ui/risk-quiz-screen.tsx`, find:

```ts
import {
  fetchRiskQuizDeckStatus,
  fetchRiskQuizTestMenu,
  postRiskQuizAnswer,
  postRiskQuizScan,
  type RiskAnswerResult,
  type RiskDeckStatus,
  type RiskScanResult,
  type RiskTestMenuEntry,
} from "../api/risk-quiz.api";
```

Replace with:

```ts
import {
  fetchRiskQuizDeckStatus,
  fetchRiskQuizPendingDraw,
  fetchRiskQuizTestMenu,
  postRiskQuizAnswer,
  postRiskQuizScan,
  type RiskAnswerResult,
  type RiskDeckStatus,
  type RiskScanResult,
  type RiskTestMenuEntry,
} from "../api/risk-quiz.api";
```

- [ ] **Step 3: Add the poll interval constant**

Find:

```ts
const START_POLL_INTERVAL_MS = 3000;
```

Replace with:

```ts
const START_POLL_INTERVAL_MS = 3000;
// How often to check for a remote-launched draw ("Uruchom na tablecie" in
// the admin panel) while idle on the scan screen — see the polling effect
// below.
const IDLE_POLL_INTERVAL_MS = 4000;
```

- [ ] **Step 4: Add the polling effect**

Find this exact block:

```ts
  async function refreshDeckStatus() {
    try {
      const status = await fetchRiskQuizDeckStatus(apiBaseUrl, { sessionToken });
      setDeckStatus(status);
    } catch (error) {
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
      }
    }
  }

  useEffect(() => {
    if (showIntro) {
      return;
    }
    void refreshDeckStatus();
    // Only when the intro screen hands off to the scan screen — later
    // updates come from refreshDeckStatus() calls after each answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro]);
```

Replace with (adding the new effect directly after the existing one):

```ts
  async function refreshDeckStatus() {
    try {
      const status = await fetchRiskQuizDeckStatus(apiBaseUrl, { sessionToken });
      setDeckStatus(status);
    } catch (error) {
      if (getMobileApiErrorStatusCode(error) === 401) {
        onSessionInvalid();
      }
    }
  }

  useEffect(() => {
    if (showIntro) {
      return;
    }
    void refreshDeckStatus();
    // Only when the intro screen hands off to the scan screen — later
    // updates come from refreshDeckStatus() calls after each answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro]);

  // Remote "Uruchom na tablecie" support: while idle on this screen (no
  // active card, not showing intro, no test menu/scanner open), poll for a
  // draw an admin queued from the web panel and open it exactly like a real
  // scan would. This can't see a real physical scan happening at the same
  // instant on this same device — there's no server-side "currently
  // showing" state for that — so a genuine race between the two is a known,
  // accepted gap.
  useEffect(() => {
    if (showIntro || activeDraw || isTestMenuOpen || isScannerVisible) {
      return;
    }

    let cancelled = false;

    const pollPendingDraw = async () => {
      try {
        const result = await fetchRiskQuizPendingDraw(apiBaseUrl, { sessionToken });
        if (cancelled || !result.draw) {
          return;
        }
        setActiveDraw({
          exhausted: false,
          cardId: result.draw.cardId,
          categoryName: result.draw.categoryName,
          difficulty: result.draw.difficulty,
          station: result.draw.station,
        });
        setExhaustedNotice(null);
        setAnswerResult(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (getMobileApiErrorStatusCode(error) === 401) {
          onSessionInvalid();
        }
        // Any other error is silent — the next tick just retries.
      }
    };

    const interval = setInterval(() => void pollPendingDraw(), IDLE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [showIntro, activeDraw, isTestMenuOpen, isScannerVisible, apiBaseUrl, sessionToken, onSessionInvalid]);
```

- [ ] **Step 5: Typecheck and lint**

Run from `apps/mobile`:

```bash
npx tsc --noEmit
npx eslint src/features/risk-quiz/api/risk-quiz.api.ts src/features/risk-quiz/ui/risk-quiz-screen.tsx --max-warnings=0
```

Expected: no errors.

- [ ] **Step 6: Manual verification**

Start a Ryzykanci realization, join with two devices/emulators on the same team (or two different teams and trigger for one). On device A, let the scan screen sit idle (no card open). From the admin panel (once Task 7 is done) or directly via `curl`/Postman against the new `launch` endpoint, queue a draw for that team's category+difficulty. Confirm device A shows the card within ~4s without any tap.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/features/risk-quiz/api/risk-quiz.api.ts apps/mobile/src/features/risk-quiz/ui/risk-quiz-screen.tsx
git commit -m "feat(risk-quiz): poll for and open remotely-launched draws"
```

---

### Task 6: Admin — types + API mutations

**Files:**
- Modify: `apps/admin/src/features/risk-quiz/types/risk-quiz.ts`
- Modify: `apps/admin/src/features/risk-quiz/api/risk-quiz.api.ts`

**Interfaces:**
- Consumes: `POST .../launch`, `POST .../cancel-remote-draw` (Task 4).
- Produces: types `RiskTeamPendingDraw`, `RiskRemoteDrawResult`, `RiskCancelRemoteDrawResult`; `RiskTeamBoard.pendingDraw: RiskTeamPendingDraw | null`; hooks `useTriggerRiskRemoteDrawMutation`, `useCancelRiskRemoteDrawMutation` — all consumed by Task 7.

- [ ] **Step 1: Add the new types**

In `apps/admin/src/features/risk-quiz/types/risk-quiz.ts`, find:

```ts
export type RiskTeamBoard = {
  teamId: string;
  tasks: RiskTeamBoardTask[];
};

export type RiskTeamCardActionResult = {
  teamId: string;
  stationId: string;
  taskStatus: "done" | "failed" | "todo";
  pointsAwarded: number;
  teamPoints: number;
};
```

Replace with:

```ts
export type RiskTeamPendingDraw = {
  categoryId: string;
  categoryName: string;
  difficulty: RiskDifficulty;
};

export type RiskTeamBoard = {
  teamId: string;
  tasks: RiskTeamBoardTask[];
  pendingDraw: RiskTeamPendingDraw | null;
};

export type RiskTeamCardActionResult = {
  teamId: string;
  stationId: string;
  taskStatus: "done" | "failed" | "todo";
  pointsAwarded: number;
  teamPoints: number;
};

export type RiskRemoteDrawResult = {
  id: string;
  teamId: string;
  cardId: string;
  stationId: string;
  createdAt: string;
};

export type RiskCancelRemoteDrawResult = {
  teamId: string;
  cancelled: boolean;
};
```

- [ ] **Step 2: Add the mutations**

In `apps/admin/src/features/risk-quiz/api/risk-quiz.api.ts`, find the type import block:

```ts
import type {
  RiskBoard,
  RiskCardWithCategory,
  RiskCategory,
  RiskDifficulty,
  RiskScheme,
  RiskSchemeCategory,
  RiskTeamBoard,
  RiskTeamCardActionResult,
  RiskTeamResetResult,
  RiskTeamStatusResponse,
} from "../types/risk-quiz";
```

Replace with:

```ts
import type {
  RiskBoard,
  RiskCancelRemoteDrawResult,
  RiskCardWithCategory,
  RiskCategory,
  RiskDifficulty,
  RiskRemoteDrawResult,
  RiskScheme,
  RiskSchemeCategory,
  RiskTeamBoard,
  RiskTeamCardActionResult,
  RiskTeamResetResult,
  RiskTeamStatusResponse,
} from "../types/risk-quiz";
```

Find:

```ts
    resetRiskCard: build.mutation<
      RiskTeamCardActionResult,
      { realizationId: string; teamId: string; stationId: string }
    >({
      query: ({ realizationId, teamId, stationId }) => ({
        url: teamTaskPath(realizationId, teamId, stationId, "reset"),
        method: "POST",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
  }),
});
```

Replace with:

```ts
    resetRiskCard: build.mutation<
      RiskTeamCardActionResult,
      { realizationId: string; teamId: string; stationId: string }
    >({
      query: ({ realizationId, teamId, stationId }) => ({
        url: teamTaskPath(realizationId, teamId, stationId, "reset"),
        method: "POST",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
    triggerRiskRemoteDraw: build.mutation<
      RiskRemoteDrawResult,
      { realizationId: string; teamId: string; categoryId: string; difficulty: RiskDifficulty }
    >({
      query: ({ realizationId, teamId, categoryId, difficulty }) => ({
        url: adminPath(
          `/realizations/${encodeURIComponent(realizationId)}/teams/${encodeURIComponent(teamId)}/launch`,
        ),
        method: "POST",
        body: { categoryId, difficulty },
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
    cancelRiskRemoteDraw: build.mutation<
      RiskCancelRemoteDrawResult,
      { realizationId: string; teamId: string }
    >({
      query: ({ realizationId, teamId }) => ({
        url: adminPath(
          `/realizations/${encodeURIComponent(realizationId)}/teams/${encodeURIComponent(teamId)}/cancel-remote-draw`,
        ),
        method: "POST",
      }),
      invalidatesTags: ["RiskQuiz"],
    }),
  }),
});
```

Find:

```ts
  useGetRiskTeamBoardQuery,
  useCompleteRiskCardMutation,
  useFailRiskCardMutation,
  useResetRiskCardMutation,
} = riskQuizApi;
```

Replace with:

```ts
  useGetRiskTeamBoardQuery,
  useCompleteRiskCardMutation,
  useFailRiskCardMutation,
  useResetRiskCardMutation,
  useTriggerRiskRemoteDrawMutation,
  useCancelRiskRemoteDrawMutation,
} = riskQuizApi;
```

- [ ] **Step 3: Typecheck and lint**

Run from `apps/admin`:

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint src/features/risk-quiz/types/risk-quiz.ts src/features/risk-quiz/api/risk-quiz.api.ts
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/risk-quiz/types/risk-quiz.ts apps/admin/src/features/risk-quiz/api/risk-quiz.api.ts
git commit -m "feat(risk-quiz): add admin types/mutations for remote card launch"
```

---

### Task 7: Admin — team board UI (group headers + launch/cancel)

**Files:**
- Modify: `apps/admin/src/features/current-realization/components/current-realization-team-tasks-panel.tsx`

**Interfaces:**
- Consumes: `useTriggerRiskRemoteDrawMutation`, `useCancelRiskRemoteDrawMutation` (Task 6); `riskBoard.pendingDraw` (Task 3, surfaced through Task 6's `RiskTeamBoard` type); existing `riskBoard`, `riskDifficultyLabel`, `canManageTasks`, `realization`, `team`, `setActionError`, `pendingRiskAction`, `handleRiskCardAction`, `isMutatingRiskCard`, `resolveTaskStatusClassName`, `renderTaskStatusLabel` already in this file.

No automated tests for this panel exist today — verified via typecheck/lint plus a manual browser check.

- [ ] **Step 1: Import `Fragment` and the new mutations/types**

Find:

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  useCompleteCurrentRealizationTeamTaskMutation,
  useFailCurrentRealizationTeamTaskMutation,
  useResetCurrentRealizationTeamTaskMutation,
} from "../api/current-realization.api";
import {
  useCompleteRiskCardMutation,
  useFailRiskCardMutation,
  useGetRiskTeamBoardQuery,
  useResetRiskCardMutation,
} from "@/features/risk-quiz/api/risk-quiz.api";
import { RISK_DIFFICULTY_OPTIONS } from "@/features/risk-quiz/types/risk-quiz";
import type { CurrentRealizationOverview } from "../types/current-realization-overview";
```

Replace with:

```tsx
"use client";

import { Fragment, useMemo, useState } from "react";
import {
  useCompleteCurrentRealizationTeamTaskMutation,
  useFailCurrentRealizationTeamTaskMutation,
  useResetCurrentRealizationTeamTaskMutation,
} from "../api/current-realization.api";
import {
  useCancelRiskRemoteDrawMutation,
  useCompleteRiskCardMutation,
  useFailRiskCardMutation,
  useGetRiskTeamBoardQuery,
  useResetRiskCardMutation,
  useTriggerRiskRemoteDrawMutation,
} from "@/features/risk-quiz/api/risk-quiz.api";
import { RISK_DIFFICULTY_OPTIONS } from "@/features/risk-quiz/types/risk-quiz";
import type { RiskDifficulty, RiskTeamBoardTask } from "@/features/risk-quiz/types/risk-quiz";
import type { CurrentRealizationOverview } from "../types/current-realization-overview";
```

- [ ] **Step 2: Add the remote-draw mutation hooks**

Find:

```tsx
  const [completeRiskCard, { isLoading: isCompletingRiskCard }] = useCompleteRiskCardMutation();
  const [failRiskCard, { isLoading: isFailingRiskCard }] = useFailRiskCardMutation();
  const [resetRiskCard, { isLoading: isResettingRiskCard }] = useResetRiskCardMutation();
  const [pendingRiskAction, setPendingRiskAction] = useState<{ stationId: string; action: TaskAction } | null>(
    null,
  );
  const isMutatingRiskCard = isCompletingRiskCard || isFailingRiskCard || isResettingRiskCard;
```

Replace with:

```tsx
  const [completeRiskCard, { isLoading: isCompletingRiskCard }] = useCompleteRiskCardMutation();
  const [failRiskCard, { isLoading: isFailingRiskCard }] = useFailRiskCardMutation();
  const [resetRiskCard, { isLoading: isResettingRiskCard }] = useResetRiskCardMutation();
  const [pendingRiskAction, setPendingRiskAction] = useState<{ stationId: string; action: TaskAction } | null>(
    null,
  );
  const isMutatingRiskCard = isCompletingRiskCard || isFailingRiskCard || isResettingRiskCard;
  const [triggerRemoteDraw, { isLoading: isTriggeringRemoteDraw }] = useTriggerRiskRemoteDrawMutation();
  const [cancelRemoteDraw, { isLoading: isCancellingRemoteDraw }] = useCancelRiskRemoteDrawMutation();
  const [pendingRemoteDrawKey, setPendingRemoteDrawKey] = useState<string | null>(null);
  const isMutatingRemoteDraw = isTriggeringRemoteDraw || isCancellingRemoteDraw;
```

- [ ] **Step 3: Add the grouping memo and the trigger/cancel handlers**

Find:

```tsx
  async function handleRiskCardAction(stationId: string, action: TaskAction) {
    if (!canManageTasks) {
      return;
    }

    const stationLabel =
      riskBoard?.tasks.find((item) => item.stationId === stationId)?.stationName || stationId;
    const confirmationMessage =
      action === "reset"
        ? `Zresetować zadanie "${stationLabel}" dla tej drużyny do statusu "todo"?`
        : action === "complete"
          ? `Oznaczyć zadanie "${stationLabel}" jako zaliczone?`
          : `Oznaczyć zadanie "${stationLabel}" jako niezaliczone?`;
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setActionError(null);
    setPendingRiskAction({ stationId, action });
    try {
      const basePayload = { realizationId: realization.id, teamId: team.id, stationId };
      if (action === "reset") {
        await resetRiskCard(basePayload).unwrap();
      } else if (action === "complete") {
        await completeRiskCard(basePayload).unwrap();
      } else {
        await failRiskCard(basePayload).unwrap();
      }
    } catch {
      setActionError("Nie udało się zapisać zmian karty drużyny.");
    } finally {
      setPendingRiskAction(null);
    }
  }

  async function handleEndParticipation() {
```

Replace with:

```tsx
  async function handleRiskCardAction(stationId: string, action: TaskAction) {
    if (!canManageTasks) {
      return;
    }

    const stationLabel =
      riskBoard?.tasks.find((item) => item.stationId === stationId)?.stationName || stationId;
    const confirmationMessage =
      action === "reset"
        ? `Zresetować zadanie "${stationLabel}" dla tej drużyny do statusu "todo"?`
        : action === "complete"
          ? `Oznaczyć zadanie "${stationLabel}" jako zaliczone?`
          : `Oznaczyć zadanie "${stationLabel}" jako niezaliczone?`;
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setActionError(null);
    setPendingRiskAction({ stationId, action });
    try {
      const basePayload = { realizationId: realization.id, teamId: team.id, stationId };
      if (action === "reset") {
        await resetRiskCard(basePayload).unwrap();
      } else if (action === "complete") {
        await completeRiskCard(basePayload).unwrap();
      } else {
        await failRiskCard(basePayload).unwrap();
      }
    } catch {
      setActionError("Nie udało się zapisać zmian karty drużyny.");
    } finally {
      setPendingRiskAction(null);
    }
  }

  const riskTaskGroups = useMemo(() => {
    type RiskTaskGroup = {
      key: string;
      categoryId: string;
      categoryName: string;
      difficulty: RiskDifficulty;
      tasks: RiskTeamBoardTask[];
    };

    if (!riskBoard) {
      return [] as RiskTaskGroup[];
    }

    const groups: RiskTaskGroup[] = [];
    const groupByKey = new Map<string, RiskTaskGroup>();

    for (const task of riskBoard.tasks) {
      const key = `${task.categoryId}:${task.difficulty}`;
      let group = groupByKey.get(key);
      if (!group) {
        group = {
          key,
          categoryId: task.categoryId,
          categoryName: task.categoryName,
          difficulty: task.difficulty,
          tasks: [],
        };
        groupByKey.set(key, group);
        groups.push(group);
      }
      group.tasks.push(task);
    }

    return groups;
  }, [riskBoard]);

  const pendingDrawKey = riskBoard?.pendingDraw
    ? `${riskBoard.pendingDraw.categoryId}:${riskBoard.pendingDraw.difficulty}`
    : null;
  const pendingDrawLabel = riskBoard?.pendingDraw
    ? `${riskBoard.pendingDraw.categoryName} — ${riskDifficultyLabel(riskBoard.pendingDraw.difficulty)}`
    : null;

  async function handleTriggerRemoteDraw(categoryId: string, difficulty: RiskDifficulty, groupLabel: string) {
    if (!canManageTasks) {
      return;
    }

    if (!window.confirm(`Uruchomić losową kartę z puli "${groupLabel}" na tablecie tej drużyny?`)) {
      return;
    }

    setActionError(null);
    setPendingRemoteDrawKey(`${categoryId}:${difficulty}`);
    try {
      await triggerRemoteDraw({ realizationId: realization.id, teamId: team.id, categoryId, difficulty }).unwrap();
    } catch {
      setActionError("Nie udało się uruchomić karty na tablecie tej drużyny.");
    } finally {
      setPendingRemoteDrawKey(null);
    }
  }

  async function handleCancelRemoteDraw() {
    if (!canManageTasks) {
      return;
    }

    setActionError(null);
    setPendingRemoteDrawKey("cancel");
    try {
      await cancelRemoteDraw({ realizationId: realization.id, teamId: team.id }).unwrap();
    } catch {
      setActionError("Nie udało się anulować aktywnej karty tej drużyny.");
    } finally {
      setPendingRemoteDrawKey(null);
    }
  }

  async function handleEndParticipation() {
```

- [ ] **Step 4: Replace the risk-quiz table body with grouped rendering**

Find this exact block (the `<tbody>` for the risk-quiz table, through its closing `</tbody>`):

```tsx
                    <tbody>
                      {riskBoard.tasks.map((task) => {
                        const isPendingForRow = pendingRiskAction?.stationId === task.stationId;
                        return (
                          <tr key={task.stationId} className="border-t border-zinc-800 bg-zinc-900/60">
                            <td className="px-3 py-2 text-zinc-100">{task.categoryName}</td>
                            <td className="px-3 py-2 text-zinc-300">{riskDifficultyLabel(task.difficulty)}</td>
                            <td className="px-3 py-2 text-zinc-100">{task.stationName}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${resolveTaskStatusClassName(task.status)}`}
                              >
                                {renderTaskStatusLabel(task.status)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-amber-300">{task.pointsAwarded}</td>
                            {canManageTasks ? (
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => void handleRiskCardAction(task.stationId, "reset")}
                                    disabled={isMutatingRiskCard}
                                    className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-55"
                                  >
                                    {isPendingForRow && pendingRiskAction?.action === "reset" ? "Reset..." : "Reset"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleRiskCardAction(task.stationId, "complete")}
                                    disabled={isMutatingRiskCard}
                                    className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                                  >
                                    {isPendingForRow && pendingRiskAction?.action === "complete"
                                      ? "Zapisywanie..."
                                      : "Zalicz"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleRiskCardAction(task.stationId, "fail")}
                                    disabled={isMutatingRiskCard}
                                    className="rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                                  >
                                    {isPendingForRow && pendingRiskAction?.action === "fail"
                                      ? "Zapisywanie..."
                                      : "Niezalicz"}
                                  </button>
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
```

Replace with:

```tsx
                    <tbody>
                      {riskTaskGroups.map((group) => {
                        const isThisGroupPending = pendingDrawKey === group.key;
                        const isBlockedByOtherPendingDraw = Boolean(pendingDrawKey) && !isThisGroupPending;
                        const isTriggeringThisGroup = pendingRemoteDrawKey === group.key && isTriggeringRemoteDraw;
                        const isCancellingThisGroup = pendingRemoteDrawKey === "cancel" && isCancellingRemoteDraw;

                        return (
                          <Fragment key={group.key}>
                            <tr className="border-t border-zinc-800 bg-zinc-900/40">
                              <td colSpan={canManageTasks ? 6 : 5} className="px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    {group.categoryName} — {riskDifficultyLabel(group.difficulty)}
                                  </span>
                                  {canManageTasks ? (
                                    isThisGroupPending ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleCancelRemoteDraw()}
                                        disabled={isMutatingRemoteDraw}
                                        className="rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                                      >
                                        {isCancellingThisGroup ? "Anulowanie..." : "Anuluj aktywną kartę"}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleTriggerRemoteDraw(
                                            group.categoryId,
                                            group.difficulty,
                                            `${group.categoryName} — ${riskDifficultyLabel(group.difficulty)}`,
                                          )
                                        }
                                        disabled={isBlockedByOtherPendingDraw || isMutatingRemoteDraw}
                                        title={
                                          isBlockedByOtherPendingDraw
                                            ? `Drużyna ma już aktywną kartę (${pendingDrawLabel}).`
                                            : undefined
                                        }
                                        className="rounded-md border border-sky-400/40 bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        {isTriggeringThisGroup ? "Uruchamianie..." : "Uruchom na tablecie"}
                                      </button>
                                    )
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                            {group.tasks.map((task) => {
                              const isPendingForRow = pendingRiskAction?.stationId === task.stationId;
                              return (
                                <tr key={task.stationId} className="border-t border-zinc-800 bg-zinc-900/60">
                                  <td className="px-3 py-2 text-zinc-100">{task.categoryName}</td>
                                  <td className="px-3 py-2 text-zinc-300">{riskDifficultyLabel(task.difficulty)}</td>
                                  <td className="px-3 py-2 text-zinc-100">{task.stationName}</td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${resolveTaskStatusClassName(task.status)}`}
                                    >
                                      {renderTaskStatusLabel(task.status)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-amber-300">{task.pointsAwarded}</td>
                                  {canManageTasks ? (
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void handleRiskCardAction(task.stationId, "reset")}
                                          disabled={isMutatingRiskCard}
                                          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          {isPendingForRow && pendingRiskAction?.action === "reset" ? "Reset..." : "Reset"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleRiskCardAction(task.stationId, "complete")}
                                          disabled={isMutatingRiskCard}
                                          className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          {isPendingForRow && pendingRiskAction?.action === "complete"
                                            ? "Zapisywanie..."
                                            : "Zalicz"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleRiskCardAction(task.stationId, "fail")}
                                          disabled={isMutatingRiskCard}
                                          className="rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          {isPendingForRow && pendingRiskAction?.action === "fail"
                                            ? "Zapisywanie..."
                                            : "Niezalicz"}
                                        </button>
                                      </div>
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
```

- [ ] **Step 5: Typecheck and lint**

Run from `apps/admin`:

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint src/features/current-realization/components/current-realization-team-tasks-panel.tsx
```

Expected: no errors.

- [ ] **Step 6: Manual verification**

Start the admin dev server and the backend. Open a Ryzykanci realization's "Edytuj" panel for a team with at least one category assigned to its scheme. Confirm:
- Each category×difficulty group shows a header row with "Uruchom na tablecie".
- Clicking it (after confirming the dialog) shows "Uruchamianie..." then settles, and the button for that group becomes "Anuluj aktywną kartę" while every other group's button is disabled with a tooltip naming the active one.
- Clicking "Anuluj aktywną kartę" clears it and every group's button returns to normal.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/features/current-realization/components/current-realization-team-tasks-panel.tsx
git commit -m "feat(risk-quiz): group team board by category/difficulty and add remote launch"
```
