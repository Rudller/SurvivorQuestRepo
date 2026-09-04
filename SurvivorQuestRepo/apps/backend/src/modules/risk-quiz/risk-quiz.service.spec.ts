import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RiskQuizService } from './risk-quiz.service';
import { Prisma } from '@prisma/client';
import {
  RISK_CARDS_PER_POOL,
  RISK_CHAT_MESSAGE_MAX_LENGTH,
  RISK_REVIEWED_ANSWER_MAX_LENGTH,
} from './risk-quiz.constants';
import { SESSION_TTL_MS } from '../mobile/domain/mobile-session.helpers';

function createService() {
  const prisma = {
    teamAssignment: { findFirst: jest.fn(), update: jest.fn() },
    realization: { findUnique: jest.fn(), update: jest.fn() },
    riskCard: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    riskCategory: {
      findUnique: jest.fn().mockResolvedValue(null),
      // Slug-collision lookups are template-scoped findFirst now (codeSlug is no
      // longer a unique column); default to "no collision".
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    },
    riskPoolStation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    riskPendingDraw: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    riskScheme: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    riskSchemeCategory: {
      findMany: jest.fn(),
      findFirst: jest.fn().mockResolvedValue({ categoryId: 'category-1' }),
      create: jest.fn(),
    },
    station: { findUnique: jest.fn() },
    teamPhoto: { create: jest.fn() },
    riskPig: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      delete: jest.fn(),
    },
    riskPigEffect: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    riskPigGrant: {
      groupBy: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    riskChatMessage: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    riskAttempt: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    team: {
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const stationService = {
    cloneStationsForScenario: jest.fn().mockResolvedValue([]),
  };

  const stationStorageService = {
    uploadTeamTaskPhoto: jest
      .fn()
      .mockResolvedValue({ key: 'photos/1.jpg', url: 'https://cdn/photos/1.jpg' }),
  };

  const service = new RiskQuizService(
    prisma as never,
    stationService as never,
    stationStorageService as never,
  );
  return { service, prisma, stationService, stationStorageService };
}

const team = { id: 'team-1', points: 0 };
const realization = { id: 'realization-1' };
const assignment = {
  id: 'assignment-1',
  team,
  realization,
  expiresAt: new Date(Date.now() + 60_000),
};

const card = {
  id: 'card-1',
  realizationId: 'realization-1',
  categoryId: 'category-1',
  difficulty: 'EASY',
  category: { name: 'Historia' },
};

const quizStation = {
  id: 'station-1',
  type: 'QUIZ', // raw Prisma StationType enum value, as a real Station row would have
  name: 'Pytanie',
  description: 'Opis',
  imageUrl: null,
  points: 0,
  timeLimitSeconds: 0,
  completionCode: null,
  quizData: { question: 'Q1?', answers: ['a', 'b'], correctAnswerIndex: 1 },
};

// Admin-facing reads run the pool's station through mapStation(), which touches
// every column, so those mocks need a whole row rather than the partial above.
const quizStationRow = {
  ...quizStation,
  categories: [],
  qrEntryCode: null,
  qrScanCodes: [],
  translations: null,
  challengeDifficultyMode: 'admin',
  challengeDifficulty: 'medium',
  completionStopwatchEnabled: false,
  allowConcurrentTeams: false,
  fastestCompletionBonusPoints: 0,
  color: '#f59e0b',
  latitude: null,
  longitude: null,
  sourceTemplateId: null,
  scenarioInstanceId: null,
  realizationId: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('RiskQuizService.scanCard', () => {
  it('draws a random station assignment that the team has not attempted yet', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue({
      ...assignment,
      realization: { ...realization, riskSchemeId: 'scheme-1' },
    });
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.riskPoolStation.findMany.mockResolvedValue([
      { stationId: 'already-attempted', station: { id: 'already-attempted' } },
      { stationId: quizStation.id, station: quizStation },
    ]);
    prisma.riskAttempt.findMany.mockResolvedValue([
      { stationId: 'already-attempted' },
    ]);

    const result = await service.scanCard({
      sessionToken: 'token',
      code: 'abc123',
    });

    expect(result).toEqual({
      exhausted: false,
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
        quiz: {
          question: 'Q1?',
          answers: ['a', 'b'],
          correctAnswerIndex: 1,
          audioUrl: undefined,
          acceptedAnswers: undefined,
        },
      },
    });
  });

  it('reports the pool as exhausted once every assigned station has been attempted', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue({
      ...assignment,
      realization: { ...realization, riskSchemeId: 'scheme-1' },
    });
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.riskPoolStation.findMany.mockResolvedValue([
      { stationId: quizStation.id, station: quizStation },
    ]);
    prisma.riskAttempt.findMany.mockResolvedValue([
      { stationId: quizStation.id },
    ]);

    const result = await service.scanCard({
      sessionToken: 'token',
      code: 'abc123',
    });

    expect(result).toEqual({
      exhausted: true,
      categoryName: 'Historia',
      difficulty: 'EASY',
    });
  });

  it("rejects a card whose category is no longer in the realization's scheme", async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue({
      ...assignment,
      realization: { ...realization, riskSchemeId: 'scheme-1' },
    });
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.riskSchemeCategory.findFirst.mockResolvedValue(null);

    await expect(
      service.scanCard({ sessionToken: 'token', code: 'abc123' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.riskPoolStation.findMany).not.toHaveBeenCalled();
  });
});

describe('RiskQuizService.getDeckStatus', () => {
  it('returns zero counts when the realization has no assigned scheme', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);

    const result = await service.getDeckStatus('token');

    expect(result).toEqual({
      categoryCount: 0,
      remainingCards: 0,
      teamPoints: team.points,
    });
    expect(prisma.riskSchemeCategory.findMany).not.toHaveBeenCalled();
  });

  it('returns the deck category count and unattempted card count for the team', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue({
      ...assignment,
      realization: { ...realization, riskSchemeId: 'scheme-1' },
    });
    prisma.riskSchemeCategory.findMany.mockResolvedValue([
      { categoryId: 'category-1' },
      { categoryId: 'category-2' },
    ]);
    prisma.riskPoolStation.findMany.mockResolvedValue([
      { stationId: 'station-1' },
      { stationId: 'station-2' },
      { stationId: 'station-3' },
      { stationId: 'station-4' },
      { stationId: 'station-5' },
    ]);
    prisma.riskAttempt.findMany
      // Attempted stations for the remaining-card count...
      .mockResolvedValueOnce([{ stationId: 'station-1' }, { stationId: 'station-2' }])
      // ...then the team's photo cards and their verdicts.
      .mockResolvedValueOnce([
        {
          stationId: 'station-photo',
          isCorrect: true,
          pointsDelta: 30,
          station: { name: 'TEST — Zadanie fotograficzne' },
        },
        {
          stationId: 'station-reviewed',
          isCorrect: false,
          pointsDelta: -10,
          station: { name: 'Odpowiedź opisowa' },
        },
        {
          stationId: 'station-photo-2',
          isCorrect: null,
          pointsDelta: 20,
          station: { name: 'Druga fotka' },
        },
      ]);

    const result = await service.getDeckStatus('token');

    // teamPoints rides along so the idle scan screen can notice a score the
    // Game Master changed by deciding a photo card.
    expect(result).toEqual({
      categoryCount: 2,
      remainingCards: 3,
      teamPoints: team.points,
      photoReviews: [
        {
          stationId: 'station-photo',
          stationName: 'TEST — Zadanie fotograficzne',
          isCorrect: true,
          pointsDelta: 30,
        },
        // Reviewed-answer cards ride the same list — it is what tells a tablet
        // about a verdict made on the Game Master's screen.
        {
          stationId: 'station-reviewed',
          stationName: 'Odpowiedź opisowa',
          isCorrect: false,
          pointsDelta: -10,
        },
        {
          stationId: 'station-photo-2',
          stationName: 'Druga fotka',
          isCorrect: null,
          // Frozen, not paid — reported as zero until the verdict lands.
          pointsDelta: 0,
        },
      ],
    });
  });
});

describe('RiskQuizService.listTestMenuEntries', () => {
  it('returns an empty list when the realization has no assigned scheme', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);

    const result = await service.listTestMenuEntries('token');

    expect(result).toEqual([]);
    expect(prisma.riskSchemeCategory.findMany).not.toHaveBeenCalled();
  });

  it('returns one entry per (category, difficulty) pool that has a generated card, in scheme order', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue({
      ...assignment,
      realization: { ...realization, riskSchemeId: 'scheme-1' },
    });
    prisma.riskSchemeCategory.findMany.mockResolvedValue([
      { categoryId: 'category-1', category: { name: 'Historia' } },
      { categoryId: 'category-2', category: { name: 'Geografia' } },
    ]);
    prisma.riskCard.findMany.mockResolvedValue([
      { categoryId: 'category-1', difficulty: 'EASY', code: 'HIST-EASY-1' },
      { categoryId: 'category-1', difficulty: 'HARD', code: 'HIST-HARD-1' },
      { categoryId: 'category-2', difficulty: 'MEDIUM', code: 'GEO-MED-1' },
    ]);

    const result = await service.listTestMenuEntries('token');

    expect(result).toEqual([
      {
        categoryId: 'category-1',
        categoryName: 'Historia',
        difficulty: 'EASY',
        code: 'HIST-EASY-1',
      },
      {
        categoryId: 'category-1',
        categoryName: 'Historia',
        difficulty: 'HARD',
        code: 'HIST-HARD-1',
      },
      {
        categoryId: 'category-2',
        categoryName: 'Geografia',
        difficulty: 'MEDIUM',
        code: 'GEO-MED-1',
      },
    ]);
  });
});

describe('RiskQuizService.generateMissingCards', () => {
  it('generates uppercase codes, matching the uppercase normalization scanCard() looks up by', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.riskSchemeCategory.findMany.mockResolvedValue([
      {
        categoryId: 'category-1',
        category: { id: 'category-1', name: 'Historia', codeSlug: 'historia' },
      },
    ]);
    prisma.riskCard.findMany.mockResolvedValue([]);
    prisma.riskCard.create.mockResolvedValue({});

    await service.generateMissingCards('realization-1');

    expect(prisma.riskCard.create).toHaveBeenCalled();
    const createdCodes = prisma.riskCard.create.mock.calls.map(
      ([args]: [{ data: { code: string } }]) => args.data.code,
    );
    expect(createdCodes.length).toBeGreaterThan(0);
    for (const code of createdCodes) {
      expect(code).toBe(code.toUpperCase());
    }
    expect(createdCodes).toContain('RYZYKANCI-HISTORIA-LATWE-1');
    // codeSlug was already set — no lazy backfill should have been triggered.
    expect(prisma.riskCategory.update).not.toHaveBeenCalled();
  });

  it('backfills a missing codeSlug from the category name and persists it, so the printed codes stay stable next time', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.riskSchemeCategory.findMany.mockResolvedValue([
      {
        categoryId: 'category-1',
        // Simulates a category created before codeSlug existed.
        category: { id: 'category-1', name: 'Historia', codeSlug: null },
      },
    ]);
    prisma.riskCard.findMany.mockResolvedValue([]);
    prisma.riskCard.create.mockResolvedValue({});
    prisma.riskCategory.findUnique.mockResolvedValue(null); // no slug collision
    prisma.riskCategory.update.mockResolvedValue({
      id: 'category-1',
      codeSlug: 'historia',
    });

    await service.generateMissingCards('realization-1');

    expect(prisma.riskCategory.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { codeSlug: 'historia' },
    });
    const createdCodes = prisma.riskCard.create.mock.calls.map(
      ([args]: [{ data: { code: string } }]) => args.data.code,
    );
    expect(createdCodes).toContain('RYZYKANCI-HISTORIA-LATWE-1');
  });
});

describe('RiskQuizService.createCategory', () => {
  it('derives the codeSlug from the category name', async () => {
    const { service, prisma } = createService();
    prisma.riskCategory.findUnique.mockResolvedValue(null); // slug free
    prisma.riskCategory.create.mockResolvedValue({
      id: 'category-1',
      name: 'Historia',
      codeSlug: 'historia',
      poolStations: [],
    });

    await service.createCategory('Historia');

    expect(prisma.riskCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Historia', codeSlug: 'historia' },
      }),
    );
  });

  it('appends a numeric suffix when the derived slug collides with an existing category', async () => {
    const { service, prisma } = createService();
    // Slug collisions are looked up with a template-scoped findFirst now.
    prisma.riskCategory.findFirst
      .mockResolvedValueOnce({ id: 'other-category', codeSlug: 'historia' })
      .mockResolvedValueOnce(null);
    prisma.riskCategory.create.mockResolvedValue({
      id: 'category-2',
      name: 'Historia!',
      codeSlug: 'historia-2',
      poolStations: [],
    });

    await service.createCategory('Historia!');

    expect(prisma.riskCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Historia!', codeSlug: 'historia-2' },
      }),
    );
  });
});

describe('RiskQuizService.updateCategory', () => {
  it('renames the category without touching an already-assigned codeSlug', async () => {
    const { service, prisma } = createService();
    prisma.riskCategory.findUnique.mockResolvedValue({
      id: 'category-1',
      name: 'Historia',
      codeSlug: 'historia',
    });
    prisma.riskCategory.update.mockResolvedValue({
      id: 'category-1',
      name: 'Historia (nowa nazwa)',
      codeSlug: 'historia',
    });

    await service.updateCategory('category-1', 'Historia (nowa nazwa)');

    expect(prisma.riskCategory.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { name: 'Historia (nowa nazwa)' },
    });
  });

  it('backfills the codeSlug from the pre-rename name for a category that never had one', async () => {
    const { service, prisma } = createService();
    prisma.riskCategory.findUnique
      .mockResolvedValueOnce({
        id: 'category-1',
        name: 'Historia',
        codeSlug: null,
      }) // current row lookup
      .mockResolvedValueOnce(null); // slug collision check
    prisma.riskCategory.update.mockResolvedValue({
      id: 'category-1',
      name: 'Dzieje',
      codeSlug: 'historia',
    });

    await service.updateCategory('category-1', 'Dzieje');

    expect(prisma.riskCategory.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { name: 'Dzieje', codeSlug: 'historia' },
    });
  });

  it('rejects updating a category that does not exist', async () => {
    const { service, prisma } = createService();
    prisma.riskCategory.findUnique.mockResolvedValue(null);

    await expect(
      service.updateCategory('missing-category', 'Nowa nazwa'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.riskCategory.update).not.toHaveBeenCalled();
  });
});

describe('RiskQuizService.cloneSchemeForRealization', () => {
  function arrangeTemplateDeck(
    prisma: ReturnType<typeof createService>['prisma'],
  ) {
    prisma.riskScheme.findUnique.mockResolvedValue({
      id: 'template-scheme',
      name: 'Standardowa',
      sourceTemplateId: null,
      schemeCategories: [
        {
          order: 0,
          category: {
            id: 'template-category',
            name: 'Historia',
            codeSlug: 'historia',
            sourceTemplateId: null,
            poolStations: [
              { stationId: 'template-station', difficulty: 'EASY' },
            ],
          },
        },
      ],
    });
    prisma.riskScheme.create.mockResolvedValue({ id: 'cloned-scheme' });
    prisma.riskCategory.create.mockResolvedValue({ id: 'cloned-category' });
    prisma.riskSchemeCategory.create.mockResolvedValue({ id: 'cloned-link' });
    prisma.riskPoolStation.create.mockResolvedValue({ id: 'cloned-pool' });
  }

  it('clones the deck onto the realization and rewires the pool to the cloned station', async () => {
    const { service, prisma, stationService } = createService();
    arrangeTemplateDeck(prisma);
    stationService.cloneStationsForScenario.mockResolvedValue([
      { id: 'cloned-station' },
    ]);

    const clonedSchemeId = await service.cloneSchemeForRealization(
      'template-scheme',
      'realization-1',
    );

    expect(clonedSchemeId).toBe('cloned-scheme');
    expect(prisma.riskScheme.create).toHaveBeenCalledWith({
      data: {
        name: 'Standardowa',
        realizationId: 'realization-1',
        sourceTemplateId: 'template-scheme',
      },
    });
    // Stations are cloned with realizationId only — never scenarioInstanceId,
    // which is what keeps them out of TeamTaskProgress territory.
    expect(stationService.cloneStationsForScenario).toHaveBeenCalledWith(
      ['template-station'],
      { realizationId: 'realization-1' },
    );
    expect(prisma.riskPoolStation.create).toHaveBeenCalledWith({
      data: {
        categoryId: 'cloned-category',
        difficulty: 'EASY',
        stationId: 'cloned-station',
      },
    });
  });

  // Adopting a deck mid-game must not strand the cards already printed for this
  // realization: scanCard() only accepts a card whose category is in the current
  // deck, so the cards have to follow the category into the clone.
  it('re-points already-minted cards and recorded attempts onto the clone', async () => {
    const { service, prisma, stationService } = createService();
    arrangeTemplateDeck(prisma);
    stationService.cloneStationsForScenario.mockResolvedValue([
      { id: 'cloned-station' },
    ]);
    prisma.team.findMany.mockResolvedValue([{ id: 'team-1' }]);

    await service.cloneSchemeForRealization('template-scheme', 'realization-1');

    expect(prisma.riskCard.updateMany).toHaveBeenCalledWith({
      where: {
        realizationId: 'realization-1',
        categoryId: 'template-category',
      },
      data: { categoryId: 'cloned-category' },
    });
    expect(prisma.riskAttempt.updateMany).toHaveBeenCalledWith({
      where: { realizationId: 'realization-1', stationId: 'template-station' },
      data: { stationId: 'cloned-station' },
    });
    expect(prisma.riskPendingDraw.deleteMany).toHaveBeenCalledWith({
      where: { teamId: { in: ['team-1'] } },
    });
  });

  // Load-bearing: printed card codes are <codeSlug>-<difficulty>-<n>, so a clone
  // that invented a fresh slug would invalidate every physical QR sticker.
  it("copies the source category's codeSlug verbatim", async () => {
    const { service, prisma, stationService } = createService();
    arrangeTemplateDeck(prisma);
    stationService.cloneStationsForScenario.mockResolvedValue([
      { id: 'cloned-station' },
    ]);

    await service.cloneSchemeForRealization('template-scheme', 'realization-1');

    expect(prisma.riskCategory.create).toHaveBeenCalledWith({
      data: {
        name: 'Historia',
        codeSlug: 'historia',
        realizationId: 'realization-1',
        sourceTemplateId: 'template-category',
      },
    });
  });
});

describe('RiskQuizService.ensureRealizationOwnedScheme', () => {
  it('returns the existing scheme untouched when it is already realization-owned', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'already-cloned',
    });
    prisma.riskScheme.findUnique.mockResolvedValue({
      id: 'already-cloned',
      realizationId: 'realization-1',
    });

    await expect(
      service.ensureRealizationOwnedScheme('realization-1'),
    ).resolves.toBe('already-cloned');
    expect(prisma.riskScheme.create).not.toHaveBeenCalled();
    expect(prisma.realization.update).not.toHaveBeenCalled();
  });

  it('lazily clones a template deck and repoints the realization at the clone', async () => {
    const { service, prisma, stationService } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'template-scheme',
    });
    prisma.riskScheme.findUnique
      // ensureRealizationOwnedScheme's own lookup: still a template.
      .mockResolvedValueOnce({ id: 'template-scheme', realizationId: null })
      // cloneSchemeForRealization's deep read.
      .mockResolvedValueOnce({
        id: 'template-scheme',
        name: 'Standardowa',
        sourceTemplateId: null,
        schemeCategories: [],
      });
    prisma.riskScheme.create.mockResolvedValue({ id: 'cloned-scheme' });
    stationService.cloneStationsForScenario.mockResolvedValue([]);

    await expect(
      service.ensureRealizationOwnedScheme('realization-1'),
    ).resolves.toBe('cloned-scheme');
    expect(prisma.realization.update).toHaveBeenCalledWith({
      where: { id: 'realization-1' },
      data: { riskSchemeId: 'cloned-scheme' },
    });
  });
});

describe('RiskQuizService library listings', () => {
  it('excludes realization-owned clones from the shared library', async () => {
    const { service, prisma } = createService();
    prisma.riskScheme.findMany.mockResolvedValue([]);
    prisma.riskCategory.findMany.mockResolvedValue([]);

    await service.listSchemes();
    await service.listCategories();

    expect(prisma.riskScheme.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { realizationId: null } }),
    );
    expect(prisma.riskCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { realizationId: null } }),
    );
  });
});

// A realization-owned deck's stations are absent from GET /station (that route
// lists templates only), so this response is the admin editor's only source for
// their content. It therefore has to ship the SAME shape GET /station does —
// kebab-case type, parsed quiz — or the editor cannot open them.
describe('RiskQuizService admin reads ship editable stations', () => {
  it('maps the pool station of a realization deck like GET /station does', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.riskScheme.findUnique
      .mockResolvedValueOnce({ id: 'scheme-1', realizationId: 'realization-1' })
      .mockResolvedValueOnce({
        id: 'scheme-1',
        name: 'Talia',
        schemeCategories: [
          {
            id: 'scheme-category-1',
            categoryId: 'category-1',
            order: 0,
            category: {
              id: 'category-1',
              name: 'Kategoria',
              poolStations: [
                {
                  id: 'pool-1',
                  difficulty: 'EASY',
                  stationId: quizStationRow.id,
                  station: {
                    ...quizStationRow,
                    realizationId: 'realization-1',
                    quizData: {
                      question: 'Q1?',
                      answers: ['a', 'b', 'c', 'd'],
                      correctAnswerIndex: 1,
                    },
                  },
                },
              ],
            },
          },
        ],
      });

    const scheme = await service.getRealizationScheme('realization-1');

    const poolStation =
      scheme!.schemeCategories[0].category.poolStations[0].station;
    expect(poolStation.type).toBe('quiz');
    expect(poolStation.quiz).toEqual(
      expect.objectContaining({ question: 'Q1?' }),
    );
    expect(poolStation.kind).toBe('realization-instance');
  });
});

describe('RiskQuizService.assignStationToPool', () => {
  it('assigns an unattached template station (no scenarioInstanceId/realizationId)', async () => {
    const { service, prisma } = createService();
    prisma.station.findUnique.mockResolvedValue({
      ...quizStation,
      scenarioInstanceId: null,
      realizationId: null,
    });
    prisma.riskCategory.findUnique.mockResolvedValue({ realizationId: null });
    prisma.riskPoolStation.create.mockResolvedValue({
      id: 'pool-1',
      station: quizStationRow,
    });

    await service.assignStationToPool({
      categoryId: 'category-1',
      difficulty: 'EASY' as never,
      stationId: quizStation.id,
    });

    expect(prisma.riskPoolStation.create).toHaveBeenCalledWith({
      data: {
        categoryId: 'category-1',
        difficulty: 'EASY',
        stationId: quizStation.id,
      },
      include: { station: true },
    });
  });

  it.each([
    'MINI_SUDOKU',
    'MASTERMIND',
    'BOGGLE',
    'MEMORY',
    'SIMON',
    'QR_HUNT',
    'REBUS',
    'STRONG_PASSWORD',
  ])(
    'rejects %s, a type Ryzykanci does not carry',
    async (type) => {
      const { service, prisma } = createService();
      prisma.station.findUnique.mockResolvedValue({
        ...quizStation,
        type,
        scenarioInstanceId: null,
        realizationId: null,
      });
      prisma.riskCategory.findUnique.mockResolvedValue({ realizationId: null });

      await expect(
        service.assignStationToPool({
          categoryId: 'category-1',
          difficulty: 'EASY' as never,
          stationId: quizStation.id,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.riskPoolStation.create).not.toHaveBeenCalled();
    },
  );

  it('rejects a station already cloned into a scenario', async () => {
    const { service, prisma } = createService();
    prisma.station.findUnique.mockResolvedValue({
      ...quizStation,
      scenarioInstanceId: 'scenario-1',
      realizationId: null,
    });

    await expect(
      service.assignStationToPool({
        categoryId: 'category-1',
        difficulty: 'EASY' as never,
        stationId: quizStation.id,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.riskPoolStation.create).not.toHaveBeenCalled();
  });

  it('rejects a station owned by a DIFFERENT realization than the pool', async () => {
    const { service, prisma } = createService();
    prisma.station.findUnique.mockResolvedValue({
      ...quizStation,
      scenarioInstanceId: null,
      realizationId: 'realization-OTHER',
    });
    prisma.riskCategory.findUnique.mockResolvedValue({
      realizationId: 'realization-1',
    });

    await expect(
      service.assignStationToPool({
        categoryId: 'category-1',
        difficulty: 'EASY' as never,
        stationId: quizStation.id,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.riskPoolStation.create).not.toHaveBeenCalled();
  });

  // The whole point of per-realization decks: a station cloned into realization X
  // must be assignable to realization X's own pools (it no longer qualifies as a
  // "pure template", which the previous guard demanded).
  it('accepts a station owned by the SAME realization as the pool', async () => {
    const { service, prisma } = createService();
    prisma.station.findUnique.mockResolvedValue({
      ...quizStation,
      scenarioInstanceId: null,
      realizationId: 'realization-1',
    });
    prisma.riskCategory.findUnique.mockResolvedValue({
      realizationId: 'realization-1',
    });
    prisma.riskPoolStation.create.mockResolvedValue({
      id: 'pool-1',
      station: quizStationRow,
    });

    await service.assignStationToPool({
      categoryId: 'category-1',
      difficulty: 'EASY' as never,
      stationId: quizStation.id,
    });

    expect(prisma.riskPoolStation.create).toHaveBeenCalled();
  });
});

describe('RiskQuizService.submitAnswer', () => {
  it('awards the correct-answer points for the difficulty and updates the team total', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.station.findUnique.mockResolvedValue(quizStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.team.update.mockResolvedValue({ ...team, points: 10 });

    const result = await service.submitAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-1',
      selectedIndex: 1,
    });

    expect(result).toEqual({
      isCorrect: true,
      correctIndex: 1,
      pointsDelta: 10,
      teamPoints: 10,
      streak: 1,
      multiplier: 1,
    });
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { points: { increment: 10 } },
    });
  });

  it('deducts points for a wrong answer instead of awarding them', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.station.findUnique.mockResolvedValue(quizStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.team.update.mockResolvedValue({ ...team, points: -5 });

    const result = await service.submitAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-1',
      selectedIndex: 0,
    });

    expect(result.isCorrect).toBe(false);
    expect(result.pointsDelta).toBe(-5);
    expect(result.streak).toBe(0);
    expect(result.multiplier).toBe(1);
  });

  it('trusts the client-asserted outcome for non-quiz station types', async () => {
    const { service, prisma } = createService();
    const puzzleStation = {
      ...quizStation,
      id: 'station-2',
      type: 'WORDLE',
      quizData: null,
    };
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.station.findUnique.mockResolvedValue(puzzleStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.team.update.mockResolvedValue({ ...team, points: 10 });

    const result = await service.submitAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-2',
      completed: true,
    });

    expect(result.isCorrect).toBe(true);
    expect(result.pointsDelta).toBe(10);
  });

  it('grows the streak multiplier for each consecutive correct answer', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.station.findUnique.mockResolvedValue(quizStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    // Four correct answers already banked, most recent first — this is the
    // 5th in a row, which should hit the x2.0 cap (EASY correct = 10 pts).
    prisma.riskAttempt.findMany.mockResolvedValue([
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: true },
    ]);
    prisma.team.update.mockResolvedValue({ ...team, points: 20 });

    const result = await service.submitAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-1',
      selectedIndex: 1,
    });

    expect(result.streak).toBe(5);
    expect(result.multiplier).toBe(2);
    expect(result.pointsDelta).toBe(20);
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { points: { increment: 20 } },
    });
  });

  it('keeps the multiplier at the cap for streaks longer than the cap threshold', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.station.findUnique.mockResolvedValue(quizStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.riskAttempt.findMany.mockResolvedValue(
      Array.from({ length: 10 }, () => ({ isCorrect: true })),
    );
    prisma.team.update.mockResolvedValue({ ...team, points: 20 });

    const result = await service.submitAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-1',
      selectedIndex: 1,
    });

    expect(result.streak).toBe(11);
    expect(result.multiplier).toBe(2);
    expect(result.pointsDelta).toBe(20);
  });

  it('resets the streak and pays the flat penalty when a hot streak is broken', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.station.findUnique.mockResolvedValue(quizStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.riskAttempt.findMany.mockResolvedValue([
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: true },
    ]);
    prisma.team.update.mockResolvedValue({ ...team, points: -5 });

    const result = await service.submitAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-1',
      selectedIndex: 0,
    });

    expect(result.isCorrect).toBe(false);
    expect(result.streak).toBe(0);
    expect(result.multiplier).toBe(1);
    expect(result.pointsDelta).toBe(-5);
  });

  it('accepts a code-protected card only with the right completion code', async () => {
    const { service, prisma } = createService();
    const codeStation = {
      ...quizStation,
      id: 'station-code',
      type: 'TIME',
      completionCode: 'abc-123',
      quizData: null,
    };
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.station.findUnique.mockResolvedValue(codeStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.riskAttempt.findMany.mockResolvedValue([]);
    prisma.team.update.mockResolvedValue({ ...team, points: 10 });

    await expect(
      service.submitAnswer({
        sessionToken: 'token',
        cardId: 'card-1',
        stationId: 'station-code',
        completed: true,
        completionCode: 'nope',
      }),
    ).rejects.toThrow('Invalid completion code');
    expect(prisma.riskAttempt.create).not.toHaveBeenCalled();
    expect(prisma.team.update).not.toHaveBeenCalled();

    const result = await service.submitAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-code',
      completed: true,
      completionCode: ' ABC-123 ',
    });

    expect(result.isCorrect).toBe(true);
    expect(result.pointsDelta).toBe(10);
  });

  it('takes a given-up code-protected card without asking for the code', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue({
      ...card,
      difficulty: 'MEDIUM',
    });
    prisma.station.findUnique.mockResolvedValue({
      ...quizStation,
      id: 'station-code',
      type: 'POINTS',
      completionCode: 'abc-123',
      quizData: null,
    });
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.riskAttempt.findMany.mockResolvedValue([]);
    prisma.team.update.mockResolvedValue({ ...team, points: -10 });

    const result = await service.submitAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-code',
      completed: false,
    });

    expect(result.isCorrect).toBe(false);
    expect(result.pointsDelta).toBe(-10);
  });

  it('rejects a second attempt at the same station by the same team', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.station.findUnique.mockResolvedValue(quizStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.submitAnswer({
        sessionToken: 'token',
        cardId: 'card-1',
        stationId: 'station-1',
        selectedIndex: 1,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.team.update).not.toHaveBeenCalled();
  });
});

describe('RiskQuizService.submitPhotoTask', () => {
  const photoStation = {
    ...quizStation,
    id: 'station-photo',
    type: 'PHOTO_TASK',
    quizData: null,
  };
  const photoFile = { buffer: Buffer.from('x'), mimetype: 'image/jpeg', size: 1 };

  function arrangePhotoSubmission(prisma: ReturnType<typeof createService>['prisma']) {
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue({ ...card, difficulty: 'MEDIUM' });
    prisma.station.findUnique.mockResolvedValue(photoStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
  }

  it('stores the photo and an undecided attempt without paying the team yet', async () => {
    const { service, prisma, stationStorageService } = createService();
    arrangePhotoSubmission(prisma);
    // Two correct answers so far: the frozen award must carry that streak.
    prisma.riskAttempt.findMany.mockResolvedValue([
      { isCorrect: true },
      { isCorrect: true },
    ]);

    const result = await service.submitPhotoTask({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-photo',
      file: photoFile as never,
    });

    expect(stationStorageService.uploadTeamTaskPhoto).toHaveBeenCalled();
    expect(result.status).toBe('pending');
    // MEDIUM pays 20, streak of 3 multiplies by 1.5.
    expect(result.pendingPointsDelta).toBe(30);
    expect(prisma.riskAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isCorrect: null, pointsDelta: 30 }),
      }),
    );
    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it('refuses a station that is not a photo task', async () => {
    const { service, prisma } = createService();
    arrangePhotoSubmission(prisma);
    prisma.station.findUnique.mockResolvedValue(quizStation);

    await expect(
      service.submitPhotoTask({
        sessionToken: 'token',
        cardId: 'card-1',
        stationId: 'station-1',
        file: photoFile as never,
      }),
    ).rejects.toThrow('This station does not accept photo submissions');
    expect(prisma.riskAttempt.create).not.toHaveBeenCalled();
  });

  it('refuses a second photo for a station already attempted', async () => {
    const { service, prisma, stationStorageService } = createService();
    arrangePhotoSubmission(prisma);
    prisma.riskAttempt.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.submitPhotoTask({
        sessionToken: 'token',
        cardId: 'card-1',
        stationId: 'station-photo',
        file: photoFile as never,
      }),
    ).rejects.toThrow('Station already attempted');
    expect(stationStorageService.uploadTeamTaskPhoto).not.toHaveBeenCalled();
  });

  it('leaves the streak alone while the photo is undecided', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue(card);
    prisma.station.findUnique.mockResolvedValue(quizStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    // Newest first: an undecided photo card sits between two correct answers.
    prisma.riskAttempt.findMany.mockResolvedValue([
      { isCorrect: null },
      { isCorrect: true },
      { isCorrect: true },
    ]);
    prisma.team.update.mockResolvedValue({ ...team, points: 10 });

    const result = await service.submitAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-1',
      selectedIndex: 1,
    });

    expect(result.streak).toBe(3);
  });
});

describe('RiskQuizService świnie', () => {
  const pigRealization = {
    ...realization,
    status: 'IN_PROGRESS',
    // Ten minutes in with a five-minute interval puts us squarely inside tick 2.
    startedAt: new Date(Date.now() - 10 * 60 * 1000),
    durationMinutes: 120,
    pigsEnabled: true,
    pigGrantIntervalMinutes: 5,
    pigEffectSeconds: 60,
    pigTypesEnabled: [],
  };

  function teamsWithPoints(count) {
    return Array.from({ length: count }, (_, index) => ({
      id: `team-${index + 1}`,
      name: `Drużyna ${index + 1}`,
      slotNumber: index + 1,
      // Ascending points, so team-1 is bottom of the table.
      points: index * 10,
    }));
  }

  function arrangePigs(prisma, options = {}) {
    const current = { ...pigRealization, ...(options.realization ?? {}) };
    prisma.teamAssignment.findFirst.mockResolvedValue({
      ...assignment,
      realization: current,
    });
    prisma.realization.findUnique.mockResolvedValue(current);
    prisma.team.findMany.mockResolvedValue(options.teams ?? teamsWithPoints(12));
    return current;
  }

  it('grants to the bottom quarter plus one wildcard', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma);

    await service.getPigState({ sessionToken: 'token' });

    const granted = prisma.riskPigGrant.create.mock.calls.map(
      (call) => call[0].data.teamId,
    );
    // 12 teams -> bottom quarter is 3, plus the single wildcard.
    expect(granted).toHaveLength(4);
    expect(granted.slice(0, 3)).toEqual(['team-1', 'team-2', 'team-3']);
  });

  it('still grants to somebody when only two teams are playing', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma, { teams: teamsWithPoints(2) });

    await service.getPigState({ sessionToken: 'token' });

    const granted = prisma.riskPigGrant.create.mock.calls.map(
      (call) => call[0].data.teamId,
    );
    // A quarter of two rounds to nothing, so the floor of one has to hold.
    expect(granted).toContain('team-1');
    expect(granted.length).toBeGreaterThanOrEqual(1);
  });

  it('sends the wildcard to whoever has received the fewest so far', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma);
    // Everyone outside the bottom quarter has had two pigs except team-9.
    prisma.riskPigGrant.groupBy.mockResolvedValue(
      teamsWithPoints(12)
        .filter((team) => !['team-1', 'team-2', 'team-3', 'team-9'].includes(team.id))
        .map((team) => ({ teamId: team.id, _count: { teamId: 2 } })),
    );

    await service.getPigState({ sessionToken: 'token' });

    const granted = prisma.riskPigGrant.create.mock.calls.map(
      (call) => call[0].data.teamId,
    );
    // This is what stops a consistently strong team from finishing the game
    // without ever throwing one.
    expect(granted[3]).toBe('team-9');
  });

  it('grants nothing twice for the same tick', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma);
    // The other tablet won the race and already wrote every grant row.
    prisma.riskPigGrant.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await service.getPigState({ sessionToken: 'token' });

    expect(prisma.riskPig.create).not.toHaveBeenCalled();
  });

  it('hands out nothing before the first interval has elapsed', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma, {
      realization: { startedAt: new Date(Date.now() - 60 * 1000) },
    });

    await service.getPigState({ sessionToken: 'token' });

    expect(prisma.riskPigGrant.create).not.toHaveBeenCalled();
  });

  it('skips a team that is still sitting on an unused pig', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma);
    prisma.riskPig.findUnique.mockResolvedValue({ id: 'pig-1', type: 'SHAKE' });

    await service.getPigState({ sessionToken: 'token' });

    expect(prisma.riskPigGrant.create).toHaveBeenCalled();
    expect(prisma.riskPig.create).not.toHaveBeenCalled();
  });

  it('refuses to throw without holding a pig', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma);
    prisma.riskPig.findUnique.mockResolvedValue(null);

    await expect(
      service.throwPig({ sessionToken: 'token', targetTeamId: 'team-2' }),
    ).rejects.toThrow('This team holds no pig');
  });

  it('refuses a target that is already under a pig', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma);
    prisma.riskPig.findUnique.mockResolvedValue({ id: 'pig-1', type: 'FOG' });
    prisma.riskPigEffect.findMany.mockResolvedValue([{ targetTeamId: 'team-2' }]);

    await expect(
      service.throwPig({ sessionToken: 'token', targetTeamId: 'team-2' }),
    ).rejects.toThrow('This team cannot be targeted right now');
    expect(prisma.riskPigEffect.create).not.toHaveBeenCalled();
  });

  // The effect row is never swept: expiresAt <= now is what "not active" means,
  // so a team that was hit an hour ago still has a row. That team is offered as
  // a target again, and targetTeamId is unique — so landing on it has to clear
  // the stale row first or the throw dies on a P2002.
  it('clears a stale expired effect before landing a new one on the same team', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma);
    prisma.riskPig.findUnique.mockResolvedValue({ id: 'pig-1', type: 'FOG' });
    // Empty because the query filters on expiresAt > now: this is exactly what
    // a team carrying an expired row looks like from here.
    prisma.riskPigEffect.findMany.mockResolvedValue([]);

    await service.throwPig({ sessionToken: 'token', targetTeamId: 'team-2' });

    expect(prisma.riskPigEffect.deleteMany).toHaveBeenCalledWith({
      where: { targetTeamId: 'team-2' },
    });
    expect(prisma.riskPigEffect.create).toHaveBeenCalled();
  });

  it('marks the room as unavailable only while an effect is live', async () => {
    const { service, prisma } = createService();
    arrangePigs(prisma);
    // findMany is already filtered by expiresAt > now in the query, so an empty
    // result is what an expired effect looks like from here.
    prisma.riskPigEffect.findMany.mockResolvedValue([]);

    const state = await service.getPigState({ sessionToken: 'token' });

    expect(state.targets.every((target) => target.isAvailable)).toBe(true);
  });
});


describe('RiskQuizService chat', () => {
  const chatRealization = {
    ...realization,
    status: 'IN_PROGRESS',
    // Relative to now on purpose: a fixed date would quietly turn into a
    // finished game once the wall clock passed it, and "the game ended" short-
    // circuits the leader logic these tests are about.
    startedAt: new Date(Date.now() - 10 * 60 * 1000),
    durationMinutes: 120,
    riskChatEnabled: true,
    riskChatTeamsCanPost: true,
  };

  function arrangeChat(
    prisma: ReturnType<typeof createService>['prisma'],
    overrides: Partial<typeof chatRealization> = {},
  ) {
    const current = { ...chatRealization, ...overrides };
    prisma.teamAssignment.findFirst.mockResolvedValue({
      ...assignment,
      realization: current,
    });
    prisma.realization.findUnique.mockResolvedValue(current);
    return current;
  }

  it('refuses a team message when teams are limited to reading', async () => {
    const { service, prisma } = createService();
    arrangeChat(prisma, { riskChatTeamsCanPost: false });

    await expect(
      service.postTeamChatMessage({ sessionToken: 'token', content: 'Cześć' }),
    ).rejects.toThrow('Teams cannot post in this chat');
    expect(prisma.riskChatMessage.create).not.toHaveBeenCalled();
  });

  it('still lets the Game Master post into an announcements-only room', async () => {
    const { service, prisma } = createService();
    arrangeChat(prisma, { riskChatTeamsCanPost: false });
    prisma.riskChatMessage.create.mockResolvedValue({
      id: 'msg-1',
      authorKind: 'GAME_MASTER',
      teamId: null,
      authorName: 'Mistrz Gry',
      content: 'Za pięć minut przerwa.',
      systemEvent: null,
      createdAt: new Date('2026-08-30T10:05:00.000Z'),
    });

    const result = await service.postGameMasterChatMessage({
      realizationId: realization.id,
      content: '  Za pięć minut przerwa.  ',
    });

    expect(result.authorName).toBe('Mistrz Gry');
    expect(prisma.riskChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorKind: 'GAME_MASTER',
          content: 'Za pięć minut przerwa.',
        }),
      }),
    );
  });

  it('hands the sender its own team colour back', async () => {
    const { service, prisma } = createService();
    arrangeChat(prisma);
    prisma.riskChatMessage.create.mockResolvedValue({
      id: 'msg-2',
      authorKind: 'TEAM',
      teamId: team.id,
      authorName: 'Wilki',
      content: 'Cześć',
      systemEvent: null,
      createdAt: new Date('2026-08-30T10:06:00.000Z'),
      team: { color: 'amber', badgeImageUrl: null },
    });

    const result = await service.postTeamChatMessage({
      sessionToken: 'token',
      content: 'Cześć',
    });

    // The tablet renders its own message straight from this response and the
    // poll never re-fetches it, so a colour missing here would never arrive.
    expect(result.teamColor).toBe('amber');
  });

  it('refuses an empty or over-long message', async () => {
    const { service, prisma } = createService();
    arrangeChat(prisma);

    await expect(
      service.postTeamChatMessage({ sessionToken: 'token', content: '   ' }),
    ).rejects.toThrow('Message is empty');
    await expect(
      service.postTeamChatMessage({
        sessionToken: 'token',
        content: 'x'.repeat(RISK_CHAT_MESSAGE_MAX_LENGTH + 1),
      }),
    ).rejects.toThrow('Message is too long');
    expect(prisma.riskChatMessage.create).not.toHaveBeenCalled();
  });

  it('reports the room as disabled without touching the history', async () => {
    const { service, prisma } = createService();
    arrangeChat(prisma, { riskChatEnabled: false });

    const result = await service.listChatMessages({ sessionToken: 'token' });

    expect(result).toEqual({
      enabled: false,
      canPost: false,
      currentTeamId: team.id,
      messages: [],
    });
    expect(prisma.riskChatMessage.findMany).not.toHaveBeenCalled();
  });

  it('announces the leader once and stays quiet while it does not change', async () => {
    const { service, prisma } = createService();
    arrangeChat(prisma);
    prisma.team.findFirst.mockResolvedValue({
      id: 'team-2',
      name: 'Wilki',
      slotNumber: 2,
      points: 40,
    });
    // No lead-change on record yet, so the first read announces...
    prisma.riskChatMessage.findFirst.mockResolvedValueOnce(null);
    // ...and the second read sees the same team already holding the lead.
    prisma.riskChatMessage.findFirst.mockResolvedValueOnce({ teamId: 'team-2' });

    await service.listChatMessages({ sessionToken: 'token' });
    await service.listChatMessages({ sessionToken: 'token' });

    const leadCalls = prisma.riskChatMessage.create.mock.calls.filter(
      (call) => call[0].data.systemEvent === 'lead-change',
    );
    expect(leadCalls).toHaveLength(1);
    expect(leadCalls[0][0].data).toEqual(
      expect.objectContaining({
        teamId: 'team-2',
        dedupeKey: 'lead-change:team-2:40',
        content: 'Wilki wychodzi na prowadzenie (40 pkt).',
      }),
    );
  });

  it('never announces a leader who has not scored yet', async () => {
    const { service, prisma } = createService();
    arrangeChat(prisma);
    prisma.team.findFirst.mockResolvedValue({
      id: 'team-1',
      name: 'Lisy',
      slotNumber: 1,
      points: 0,
    });

    await service.listChatMessages({ sessionToken: 'token' });

    const leadCalls = prisma.riskChatMessage.create.mock.calls.filter(
      (call) => call[0].data.systemEvent === 'lead-change',
    );
    expect(leadCalls).toHaveLength(0);
  });

  it('swallows the unique violation two tablets racing on the same event cause', async () => {
    const { service, prisma } = createService();
    arrangeChat(prisma);
    prisma.team.findFirst.mockResolvedValue(null);
    // The other tablet won the race and already inserted game-start.
    const conflict = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.riskChatMessage.create.mockRejectedValue(conflict);

    await expect(
      service.listChatMessages({ sessionToken: 'token' }),
    ).resolves.toEqual(
      expect.objectContaining({ enabled: true, canPost: true }),
    );
  });

  it('announces the end of the game once the clock has run out', async () => {
    const { service, prisma } = createService();
    arrangeChat(prisma, {
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      durationMinutes: 60,
    });
    prisma.team.findFirst.mockResolvedValue(null);

    await service.listChatMessages({ sessionToken: 'token' });

    const events = prisma.riskChatMessage.create.mock.calls.map(
      (call) => call[0].data.systemEvent,
    );
    expect(events).toContain('game-end');
    // A finished game has no leader to crown any more.
    expect(events).not.toContain('lead-change');
  });
});

describe('RiskQuizService.submitReviewedAnswer', () => {
  const reviewedAnswerStation = {
    ...quizStation,
    id: 'station-reviewed',
    type: 'REVIEWED_ANSWER',
    quizData: {
      question: 'Wymieńcie trzy przyczyny rozbicia dzielnicowego.',
      answers: ['Wymieńcie trzy przyczyny rozbicia dzielnicowego.', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      acceptedAnswers: ['testament Krzywoustego', 'brak zasady pryncypatu'],
    },
  };

  function arrangeReviewedAnswerSubmission(
    prisma: ReturnType<typeof createService>['prisma'],
  ) {
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskCard.findUnique.mockResolvedValue({ ...card, difficulty: 'MEDIUM' });
    prisma.station.findUnique.mockResolvedValue(reviewedAnswerStation);
    prisma.riskPoolStation.findUnique.mockResolvedValue({ id: 'pool-1' });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
  }

  it('stores the text and an undecided attempt without paying the team yet', async () => {
    const { service, prisma } = createService();
    arrangeReviewedAnswerSubmission(prisma);
    // Two correct answers so far: the frozen award must carry that streak.
    prisma.riskAttempt.findMany.mockResolvedValue([
      { isCorrect: true },
      { isCorrect: true },
    ]);

    const result = await service.submitReviewedAnswer({
      sessionToken: 'token',
      cardId: 'card-1',
      stationId: 'station-reviewed',
      answerText: '  Testament Krzywoustego i brak pryncypatu.  ',
    });

    expect(result.status).toBe('pending');
    // MEDIUM pays 20, streak of 3 multiplies by 1.5.
    expect(result.pendingPointsDelta).toBe(30);
    expect(prisma.riskAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isCorrect: null,
          pointsDelta: 30,
          answerText: 'Testament Krzywoustego i brak pryncypatu.',
        }),
      }),
    );
    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it('refuses a station that does not take a written answer', async () => {
    const { service, prisma } = createService();
    arrangeReviewedAnswerSubmission(prisma);
    prisma.station.findUnique.mockResolvedValue(quizStation);

    await expect(
      service.submitReviewedAnswer({
        sessionToken: 'token',
        cardId: 'card-1',
        stationId: 'station-1',
        answerText: 'cokolwiek',
      }),
    ).rejects.toThrow('This station does not accept written answers');
    expect(prisma.riskAttempt.create).not.toHaveBeenCalled();
  });

  it('refuses a blank answer', async () => {
    const { service, prisma } = createService();
    arrangeReviewedAnswerSubmission(prisma);

    await expect(
      service.submitReviewedAnswer({
        sessionToken: 'token',
        cardId: 'card-1',
        stationId: 'station-reviewed',
        answerText: '   ',
      }),
    ).rejects.toThrow('Answer is empty');
    expect(prisma.riskAttempt.create).not.toHaveBeenCalled();
  });

  it('refuses an answer past the length ceiling', async () => {
    const { service, prisma } = createService();
    arrangeReviewedAnswerSubmission(prisma);

    await expect(
      service.submitReviewedAnswer({
        sessionToken: 'token',
        cardId: 'card-1',
        stationId: 'station-reviewed',
        answerText: 'x'.repeat(RISK_REVIEWED_ANSWER_MAX_LENGTH + 1),
      }),
    ).rejects.toThrow('Answer is too long');
    expect(prisma.riskAttempt.create).not.toHaveBeenCalled();
  });

  it('refuses a second answer for a station already attempted', async () => {
    const { service, prisma } = createService();
    arrangeReviewedAnswerSubmission(prisma);
    prisma.riskAttempt.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.submitReviewedAnswer({
        sessionToken: 'token',
        cardId: 'card-1',
        stationId: 'station-reviewed',
        answerText: 'Druga próba',
      }),
    ).rejects.toThrow('Station already attempted');
    expect(prisma.riskAttempt.create).not.toHaveBeenCalled();
  });

  it('never sends the answer key to the tablet', () => {
    const { service } = createService();

    const payload = (
      service as unknown as {
        toRiskStationPayload: (station: typeof reviewedAnswerStation) => {
          quiz?: { question?: string; answers?: string[]; acceptedAnswers?: string[] };
        };
      }
    ).toRiskStationPayload(reviewedAnswerStation);

    expect(payload.quiz).toEqual({
      question: 'Wymieńcie trzy przyczyny rozbicia dzielnicowego.',
    });
    expect(payload.quiz?.answers).toBeUndefined();
    expect(payload.quiz?.acceptedAnswers).toBeUndefined();
  });
});

describe('RiskQuizService photo review decisions', () => {
  function arrangeDecision(
    prisma: ReturnType<typeof createService>['prisma'],
    attempt: { id: string; pointsDelta: number; isCorrect: boolean | null } | null,
  ) {
    prisma.realization.findUnique.mockResolvedValue(realization);
    prisma.team.findUnique.mockResolvedValue({ ...team, realizationId: realization.id });
    prisma.riskPoolStation.findFirst.mockResolvedValue({
      categoryId: 'category-1',
      difficulty: 'MEDIUM',
    });
    prisma.riskAttempt.findFirst.mockResolvedValue(attempt);
    prisma.team.update.mockResolvedValue({ ...team, points: 30 });
  }

  it('pays the award frozen at submission when the Game Master approves', async () => {
    const { service, prisma } = createService();
    // 30 = MEDIUM's 20 with the x1.5 the team had going when it sent the photo.
    arrangeDecision(prisma, { id: 'attempt-1', pointsDelta: 30, isCorrect: null });

    const result = await service.adminCompleteCard(
      realization.id,
      team.id,
      'station-photo',
    );

    expect(result.pointsAwarded).toBe(30);
    expect(prisma.riskAttempt.update).toHaveBeenCalledWith({
      where: { id: 'attempt-1' },
      data: { isCorrect: true, pointsDelta: 30 },
    });
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: team.id },
      // Nothing was paid out while it was pending, so the whole award lands now.
      data: { points: { increment: 30 } },
    });
  });

  it('charges the flat penalty once when the Game Master rejects', async () => {
    const { service, prisma } = createService();
    arrangeDecision(prisma, { id: 'attempt-1', pointsDelta: 30, isCorrect: null });

    const result = await service.adminFailCard(
      realization.id,
      team.id,
      'station-photo',
    );

    expect(result.pointsAwarded).toBe(-10);
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: team.id },
      // -10, not -40: the frozen 30 was never on the team's account.
      data: { points: { increment: -10 } },
    });
  });

  it('still settles a decided attempt by the difference', async () => {
    const { service, prisma } = createService();
    arrangeDecision(prisma, { id: 'attempt-1', pointsDelta: -10, isCorrect: false });

    await service.adminCompleteCard(realization.id, team.id, 'station-photo');

    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: team.id },
      // Flat 20 for MEDIUM, minus the -10 already taken.
      data: { points: { increment: 30 } },
    });
  });
});

describe('RiskQuizService.getTeamCardStatus', () => {
  it('returns zero totals per team when the realization has no assigned scheme', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: null,
    });
    prisma.team.findMany.mockResolvedValue([
      { id: 'team-1', name: 'Alfa', slotNumber: 1, color: '#fff' },
    ]);

    const result = await service.getTeamCardStatus('realization-1');

    expect(result).toEqual({
      teams: [
        {
          teamId: 'team-1',
          teamName: 'Alfa',
          slotNumber: 1,
          color: '#fff',
          totalAttempted: 0,
          totalCards: 0,
          categories: [],
        },
      ],
    });
  });

  it('reports per-category attempted/total counts and team totals', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findMany.mockResolvedValue([
      { id: 'team-1', name: 'Alfa', slotNumber: 1, color: '#fff' },
      { id: 'team-2', name: null, slotNumber: 2, color: '#000' },
    ]);
    prisma.riskSchemeCategory.findMany.mockResolvedValue([
      { categoryId: 'category-1', category: { name: 'Historia' } },
    ]);
    prisma.riskPoolStation.findMany.mockResolvedValue([
      { categoryId: 'category-1', difficulty: 'EASY', stationId: 'station-1' },
      { categoryId: 'category-1', difficulty: 'EASY', stationId: 'station-2' },
    ]);
    prisma.riskAttempt.findMany.mockResolvedValue([
      { teamId: 'team-1', stationId: 'station-1' },
    ]);

    const result = await service.getTeamCardStatus('realization-1');

    expect(result).toEqual({
      teams: [
        {
          teamId: 'team-1',
          teamName: 'Alfa',
          slotNumber: 1,
          color: '#fff',
          totalAttempted: 1,
          totalCards: 2,
          categories: [
            {
              categoryId: 'category-1',
              categoryName: 'Historia',
              difficulty: 'EASY',
              attempted: 1,
              total: 2,
            },
          ],
        },
        {
          teamId: 'team-2',
          teamName: null,
          slotNumber: 2,
          color: '#000',
          totalAttempted: 0,
          totalCards: 2,
          categories: [
            {
              categoryId: 'category-1',
              categoryName: 'Historia',
              difficulty: 'EASY',
              attempted: 0,
              total: 2,
            },
          ],
        },
      ],
    });
  });
});

describe('RiskQuizService.resetTeamAttempts', () => {
  it("clears only the target team's attempts and removes the points those attempts awarded", async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskAttempt.findMany.mockResolvedValue([
      { pointsDelta: 10 },
      { pointsDelta: -5 },
    ]);
    prisma.riskAttempt.deleteMany.mockResolvedValue({ count: 2 });
    prisma.team.update.mockResolvedValue({ id: 'team-1', points: 0 });

    const result = await service.resetTeamAttempts('realization-1', 'team-1');

    expect(prisma.riskAttempt.deleteMany).toHaveBeenCalledWith({
      where: { realizationId: 'realization-1', teamId: 'team-1' },
    });
    expect(prisma.riskPendingDraw.deleteMany).toHaveBeenCalledWith({
      where: { teamId: 'team-1' },
    });
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { points: { decrement: 5 } },
    });
    expect(result).toEqual({
      teamId: 'team-1',
      resetCount: 2,
      pointsAdjusted: -5,
    });
  });

  it('cancels a pending draw even when the team has no attempts to clear', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskAttempt.findMany.mockResolvedValue([]);

    const result = await service.resetTeamAttempts('realization-1', 'team-1');

    expect(prisma.riskAttempt.deleteMany).not.toHaveBeenCalled();
    expect(prisma.team.update).not.toHaveBeenCalled();
    expect(prisma.riskPendingDraw.deleteMany).toHaveBeenCalledWith({
      where: { teamId: 'team-1' },
    });
    expect(result).toEqual({
      teamId: 'team-1',
      resetCount: 0,
      pointsAdjusted: 0,
    });
  });

  it('rejects resetting a team that does not belong to the realization', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'other-realization',
    });

    await expect(
      service.resetTeamAttempts('realization-1', 'team-1'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('RiskQuizService.getTeamCardBoard', () => {
  it("returns one row per pool station across every category in the team's scheme", async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskSchemeCategory.findMany.mockResolvedValue([
      { categoryId: 'category-1', order: 0, category: { name: 'Historia' } },
    ]);
    prisma.riskPoolStation.findMany.mockResolvedValue([
      {
        categoryId: 'category-1',
        difficulty: 'EASY',
        stationId: 'station-1',
        station: { id: 'station-1', name: 'Pytanie A' },
      },
      {
        categoryId: 'category-1',
        difficulty: 'EASY',
        stationId: 'station-2',
        station: { id: 'station-2', name: 'Pytanie B' },
      },
    ]);
    prisma.riskAttempt.findMany.mockResolvedValue([
      { stationId: 'station-1', isCorrect: true, pointsDelta: 10 },
    ]);

    const result = await service.getTeamCardBoard('realization-1', 'team-1');

    expect(result).toEqual({
      teamId: 'team-1',
      pendingDraw: null,
      tasks: [
        {
          categoryId: 'category-1',
          categoryName: 'Historia',
          difficulty: 'EASY',
          stationId: 'station-1',
          stationName: 'Pytanie A',
          status: 'done',
          pointsAwarded: 10,
        },
        {
          categoryId: 'category-1',
          categoryName: 'Historia',
          difficulty: 'EASY',
          stationId: 'station-2',
          stationName: 'Pytanie B',
          status: 'todo',
          pointsAwarded: 0,
        },
      ],
    });
  });

  it('marks an incorrectly-attempted station as failed', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskSchemeCategory.findMany.mockResolvedValue([
      { categoryId: 'category-1', order: 0, category: { name: 'Historia' } },
    ]);
    prisma.riskPoolStation.findMany.mockResolvedValue([
      {
        categoryId: 'category-1',
        difficulty: 'EASY',
        stationId: 'station-1',
        station: { id: 'station-1', name: 'Pytanie A' },
      },
    ]);
    prisma.riskAttempt.findMany.mockResolvedValue([
      { stationId: 'station-1', isCorrect: false, pointsDelta: -5 },
    ]);

    const result = await service.getTeamCardBoard('realization-1', 'team-1');

    expect(result.tasks[0]).toMatchObject({
      status: 'failed',
      pointsAwarded: -5,
    });
  });

  it('returns an empty task list when the realization has no assigned scheme', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: null,
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });

    const result = await service.getTeamCardBoard('realization-1', 'team-1');

    expect(result).toEqual({ teamId: 'team-1', tasks: [], pendingDraw: null });
    expect(prisma.riskSchemeCategory.findMany).not.toHaveBeenCalled();
  });

  it('rejects a team that does not belong to the realization', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'other-realization',
    });

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
      card: {
        categoryId: 'category-1',
        difficulty: 'EASY',
        category: { name: 'Historia' },
      },
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
    expect(prisma.riskPendingDraw.deleteMany).not.toHaveBeenCalled();
  });

  it('returns the drawn station and consumes (deletes) the pending draw', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskPendingDraw.findUnique.mockResolvedValue({
      id: 'draw-1',
      teamId: 'team-1',
      cardId: 'card-1',
      stationId: 'station-1',
      card: { difficulty: 'EASY', category: { name: 'Historia' } } as never,
      station: quizStation,
    });
    prisma.riskPendingDraw.deleteMany.mockResolvedValue({ count: 1 });

    const result = await service.pollPendingDraw('token');

    expect(prisma.riskPendingDraw.deleteMany).toHaveBeenCalledWith({
      where: { id: 'draw-1', teamId: 'team-1' },
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
          quiz: {
            question: 'Q1?',
            answers: ['a', 'b'],
            correctAnswerIndex: 1,
            audioUrl: undefined,
            acceptedAnswers: undefined,
          },
        },
      },
    });
  });

  it('does not deliver a draw consumed concurrently by another request', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
    prisma.riskPendingDraw.findUnique.mockResolvedValue({
      id: 'draw-1',
      teamId: 'team-1',
      cardId: 'card-1',
      stationId: 'station-1',
      card: { difficulty: 'EASY', category: { name: 'Historia' } } as never,
      station: quizStation,
    });
    prisma.riskPendingDraw.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.pollPendingDraw('token')).resolves.toEqual({
      draw: null,
    });
  });
});

describe('RiskQuizService.adminCompleteCard / adminFailCard', () => {
  it("creates a new correct attempt using the pool's difficulty points, attaching any already-generated card from that pool", async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPoolStation.findFirst.mockResolvedValue({
      categoryId: 'category-1',
      difficulty: 'EASY',
      stationId: 'station-1',
    });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.riskCard.findFirst.mockResolvedValue({ id: 'card-1' });
    prisma.riskAttempt.create.mockResolvedValue({});
    prisma.team.update.mockResolvedValue({ id: 'team-1', points: 10 });

    const result = await service.adminCompleteCard(
      'realization-1',
      'team-1',
      'station-1',
    );

    expect(prisma.riskAttempt.create).toHaveBeenCalledWith({
      data: {
        realizationId: 'realization-1',
        teamId: 'team-1',
        cardId: 'card-1',
        stationId: 'station-1',
        isCorrect: true,
        pointsDelta: 10,
      },
    });
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { points: { increment: 10 } },
    });
    expect(result).toEqual({
      teamId: 'team-1',
      stationId: 'station-1',
      taskStatus: 'done',
      pointsAwarded: 10,
      teamPoints: 10,
    });
  });

  it("adminFailCard applies the difficulty's flat (negative) penalty", async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPoolStation.findFirst.mockResolvedValue({
      categoryId: 'category-1',
      difficulty: 'HARD',
      stationId: 'station-1',
    });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.riskCard.findFirst.mockResolvedValue({ id: 'card-1' });
    prisma.riskAttempt.create.mockResolvedValue({});
    prisma.team.update.mockResolvedValue({ id: 'team-1', points: -15 });

    const result = await service.adminFailCard(
      'realization-1',
      'team-1',
      'station-1',
    );

    expect(prisma.riskAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isCorrect: false, pointsDelta: -15 }),
      }),
    );
    expect(result).toMatchObject({ taskStatus: 'failed', pointsAwarded: -15 });
  });

  it("overwrites an existing attempt's outcome and adjusts the team's points by the delta", async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPoolStation.findFirst.mockResolvedValue({
      categoryId: 'category-1',
      difficulty: 'EASY',
      stationId: 'station-1',
    });
    prisma.riskAttempt.findFirst.mockResolvedValue({
      id: 'attempt-1',
      isCorrect: false,
      pointsDelta: -5,
    });
    prisma.riskAttempt.update.mockResolvedValue({});
    // Was -5 (incorrect), admin now marks it correct (+10) — team points
    // should move by the +15 delta, not by the full +10.
    prisma.team.update.mockResolvedValue({ id: 'team-1', points: 15 });

    const result = await service.adminCompleteCard(
      'realization-1',
      'team-1',
      'station-1',
    );

    expect(prisma.riskCard.findFirst).not.toHaveBeenCalled();
    expect(prisma.riskAttempt.update).toHaveBeenCalledWith({
      where: { id: 'attempt-1' },
      data: { isCorrect: true, pointsDelta: 10 },
    });
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { points: { increment: 15 } },
    });
    expect(result.teamPoints).toBe(15);
  });

  it('rejects a station that is not part of any risk pool', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPoolStation.findFirst.mockResolvedValue(null);

    await expect(
      service.adminCompleteCard('realization-1', 'team-1', 'station-1'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.team.update).not.toHaveBeenCalled();
  });

  it('rejects marking a card done when no cards have been generated yet for that pool', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPoolStation.findFirst.mockResolvedValue({
      categoryId: 'category-1',
      difficulty: 'EASY',
      stationId: 'station-1',
    });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);
    prisma.riskCard.findFirst.mockResolvedValue(null);

    await expect(
      service.adminCompleteCard('realization-1', 'team-1', 'station-1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.team.update).not.toHaveBeenCalled();
  });
});

describe('RiskQuizService.adminResetCard', () => {
  it("deletes the team's attempt for that station and reverts the points delta", async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskAttempt.findFirst.mockResolvedValue({
      id: 'attempt-1',
      pointsDelta: 10,
    });
    prisma.riskAttempt.delete.mockResolvedValue({});
    prisma.team.update.mockResolvedValue({ id: 'team-1', points: 0 });

    const result = await service.adminResetCard(
      'realization-1',
      'team-1',
      'station-1',
    );

    expect(prisma.riskAttempt.delete).toHaveBeenCalledWith({
      where: { id: 'attempt-1' },
    });
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: 'team-1' },
      data: { points: { decrement: 10 } },
    });
    expect(result).toEqual({
      teamId: 'team-1',
      stationId: 'station-1',
      taskStatus: 'todo',
      pointsAwarded: 0,
      teamPoints: 0,
    });
  });

  it('does nothing when the team has no attempt for that station', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
      points: 0,
    });
    prisma.riskAttempt.findFirst.mockResolvedValue(null);

    const result = await service.adminResetCard(
      'realization-1',
      'team-1',
      'station-1',
    );

    expect(prisma.riskAttempt.delete).not.toHaveBeenCalled();
    expect(prisma.team.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      teamId: 'team-1',
      stationId: 'station-1',
      taskStatus: 'todo',
      pointsAwarded: 0,
      teamPoints: 0,
    });
  });
});

describe('RiskQuizService.triggerRemoteDraw', () => {
  it('creates a pending draw for a randomly chosen not-yet-attempted station in the pool', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
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
    prisma.riskPendingDraw.upsert.mockResolvedValue({
      id: 'draw-1',
      teamId: 'team-1',
      cardId: 'card-1',
      stationId: 'station-2',
    });

    await service.triggerRemoteDraw(
      'realization-1',
      'team-1',
      'category-1',
      'EASY',
    );

    expect(prisma.riskPendingDraw.upsert).toHaveBeenCalledWith({
      where: { teamId: 'team-1' },
      create: { teamId: 'team-1', cardId: 'card-1', stationId: 'station-2' },
      update: { cardId: 'card-1', stationId: 'station-2' },
    });
  });

  it('replaces an existing pending draw when launch is sent again', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPoolStation.findMany.mockResolvedValue([
      { stationId: 'station-2' },
    ]);
    prisma.riskAttempt.findMany.mockResolvedValue([]);
    prisma.riskCard.findFirst.mockResolvedValue({ id: 'card-1' });
    prisma.riskPendingDraw.upsert.mockResolvedValue({
      id: 'draw-1',
      teamId: 'team-1',
      cardId: 'card-1',
      stationId: 'station-2',
    });

    await service.triggerRemoteDraw(
      'realization-1',
      'team-1',
      'category-1',
      'EASY',
    );

    expect(prisma.riskPendingDraw.upsert).toHaveBeenCalledWith({
      where: { teamId: 'team-1' },
      create: { teamId: 'team-1', cardId: 'card-1', stationId: 'station-2' },
      update: { cardId: 'card-1', stationId: 'station-2' },
    });
  });

  it('rejects when every station in the pool has already been attempted by the team', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue(null);
    prisma.riskPoolStation.findMany.mockResolvedValue([
      { stationId: 'station-1' },
    ]);
    prisma.riskAttempt.findMany.mockResolvedValue([{ stationId: 'station-1' }]);

    await expect(
      service.triggerRemoteDraw(
        'realization-1',
        'team-1',
        'category-1',
        'EASY',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.riskCard.findFirst).not.toHaveBeenCalled();
  });

  it('rejects when no cards have been generated yet for the pool', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue(null);
    prisma.riskPoolStation.findMany.mockResolvedValue([
      { stationId: 'station-1' },
    ]);
    prisma.riskAttempt.findMany.mockResolvedValue([]);
    prisma.riskCard.findFirst.mockResolvedValue(null);

    await expect(
      service.triggerRemoteDraw(
        'realization-1',
        'team-1',
        'category-1',
        'EASY',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.riskPendingDraw.upsert).not.toHaveBeenCalled();
  });

  it("rejects a category that is not assigned to the realization's scheme", async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({
      id: 'realization-1',
      riskSchemeId: 'scheme-1',
    });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'realization-1',
    });
    prisma.riskPendingDraw.findUnique.mockResolvedValue(null);
    prisma.riskSchemeCategory.findFirst.mockResolvedValue(null);

    await expect(
      service.triggerRemoteDraw(
        'realization-1',
        'team-1',
        'other-category',
        'EASY',
      ),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.riskPoolStation.findMany).not.toHaveBeenCalled();
  });

  it('rejects a team that does not belong to the realization', async () => {
    const { service, prisma } = createService();
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
    prisma.team.findUnique.mockResolvedValue({
      id: 'team-1',
      realizationId: 'other-realization',
    });

    await expect(
      service.triggerRemoteDraw(
        'realization-1',
        'team-1',
        'category-1',
        'EASY',
      ),
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

describe('RiskQuizService.resolveSelectedSchemeId', () => {
  it('keeps the realization-owned clone when the request re-selects its source template', async () => {
    const { service, prisma } = createService();
    prisma.riskScheme.findUnique.mockResolvedValue({
      id: 'owned-clone',
      realizationId: 'realization-1',
      sourceTemplateId: 'template-scheme',
    });

    await expect(
      service.resolveSelectedSchemeId({
        realizationId: 'realization-1',
        requestedSchemeId: 'template-scheme',
        currentSchemeId: 'owned-clone',
      }),
    ).resolves.toBe('owned-clone');
  });

  it('keeps the realization-owned clone when the request already carries the clone id', async () => {
    const { service, prisma } = createService();
    prisma.riskScheme.findUnique.mockResolvedValue({
      id: 'owned-clone',
      realizationId: 'realization-1',
      sourceTemplateId: 'template-scheme',
    });

    await expect(
      service.resolveSelectedSchemeId({
        realizationId: 'realization-1',
        requestedSchemeId: 'owned-clone',
        currentSchemeId: 'owned-clone',
      }),
    ).resolves.toBe('owned-clone');
  });

  it('takes the requested template when it is a different deck than the one cloned', async () => {
    const { service, prisma } = createService();
    prisma.riskScheme.findUnique.mockResolvedValue({
      id: 'owned-clone',
      realizationId: 'realization-1',
      sourceTemplateId: 'template-scheme',
    });

    await expect(
      service.resolveSelectedSchemeId({
        realizationId: 'realization-1',
        requestedSchemeId: 'other-template',
        currentSchemeId: 'owned-clone',
      }),
    ).resolves.toBe('other-template');
  });

  it('takes the requested template when the realization has no deck yet', async () => {
    const { service, prisma } = createService();

    await expect(
      service.resolveSelectedSchemeId({
        realizationId: 'realization-1',
        requestedSchemeId: 'template-scheme',
        currentSchemeId: null,
      }),
    ).resolves.toBe('template-scheme');
    expect(prisma.riskScheme.findUnique).not.toHaveBeenCalled();
  });

  it('takes the requested template when the current deck is still a shared template', async () => {
    const { service, prisma } = createService();
    prisma.riskScheme.findUnique.mockResolvedValue({
      id: 'template-scheme',
      realizationId: null,
      sourceTemplateId: null,
    });

    await expect(
      service.resolveSelectedSchemeId({
        realizationId: 'realization-1',
        requestedSchemeId: 'other-template',
        currentSchemeId: 'template-scheme',
      }),
    ).resolves.toBe('other-template');
  });
});

describe('RiskQuizService.findSchemeSummaryById', () => {
  it('reads the deck without adopting it', async () => {
    const { service, prisma } = createService();
    prisma.riskScheme.findUnique.mockResolvedValue({
      id: 'owned-clone',
      realizationId: 'realization-1',
      sourceTemplateId: 'template-scheme',
    });

    await expect(service.findSchemeSummaryById('owned-clone')).resolves.toEqual(
      {
        id: 'owned-clone',
        realizationId: 'realization-1',
        sourceTemplateId: 'template-scheme',
      },
    );
    expect(prisma.riskScheme.create).not.toHaveBeenCalled();
    expect(prisma.realization.update).not.toHaveBeenCalled();
  });
});

describe('RiskQuizService.listSchemeCardCodes', () => {
  it('returns every pool code of a template deck without creating card rows', async () => {
    const { service, prisma } = createService();
    prisma.riskScheme.findUnique.mockResolvedValue({
      id: 'scheme-1',
      name: 'Talia A',
    });
    prisma.riskSchemeCategory.findMany.mockResolvedValue([
      {
        categoryId: 'category-1',
        order: 0,
        category: { id: 'category-1', name: 'Historia', codeSlug: 'historia' },
      },
    ]);

    const codes = await service.listSchemeCardCodes('scheme-1');

    // A library deck owns no RiskCard rows — the codes are derived, not stored.
    expect(prisma.riskCard.create).not.toHaveBeenCalled();
    expect(codes).toHaveLength(3 * RISK_CARDS_PER_POOL);
    expect(codes[0]).toEqual({
      categoryId: 'category-1',
      categoryName: 'Historia',
      difficulty: 'EASY',
      code: 'RYZYKANCI-HISTORIA-LATWE-1',
    });
    expect(codes.map((entry) => entry.code)).toContain(
      'RYZYKANCI-HISTORIA-TRUDNE-10',
    );
  });

  it('backfills a missing codeSlug, so the library preview matches what generateMissingCards will later store', async () => {
    const { service, prisma } = createService();
    prisma.riskScheme.findUnique.mockResolvedValue({
      id: 'scheme-1',
      name: 'Talia A',
    });
    prisma.riskSchemeCategory.findMany.mockResolvedValue([
      {
        categoryId: 'category-1',
        order: 0,
        category: { id: 'category-1', name: 'Historia', codeSlug: null },
      },
    ]);
    prisma.riskCategory.update.mockResolvedValue({
      id: 'category-1',
      codeSlug: 'historia',
    });

    const codes = await service.listSchemeCardCodes('scheme-1');

    expect(prisma.riskCategory.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { codeSlug: 'historia' },
    });
    expect(codes.map((entry) => entry.code)).toContain(
      'RYZYKANCI-HISTORIA-LATWE-1',
    );
  });

  it('rejects an unknown scheme', async () => {
    const { service, prisma } = createService();
    prisma.riskScheme.findUnique.mockResolvedValue(null);

    await expect(service.listSchemeCardCodes('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('RiskQuizService session lifetime', () => {
  // Ryzykancy runs entirely on this module's endpoints, so MobileService's own
  // sliding refresh never fires for a team that is mid-game. Without these the
  // session dies exactly SESSION_TTL_MS after the join, mid-game or not.
  it('slides the session window once the assignment is past half its lifetime', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue({
      ...assignment,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS / 4),
    });

    await service.pollPendingDraw('token');

    expect(prisma.teamAssignment.update).toHaveBeenCalledTimes(1);
    const [refresh] = prisma.teamAssignment.update.mock.calls[0] as [
      { where: { id: string }; data: { lastSeenAt: Date; expiresAt: Date } },
    ];
    expect(refresh.where).toEqual({ id: 'assignment-1' });
    expect(refresh.data.lastSeenAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(refresh.data.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + SESSION_TTL_MS - 5_000,
    );
  });

  it('leaves a fresh session alone so the play screen polls do not write every few seconds', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue({
      ...assignment,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS - 60_000),
    });

    await service.pollPendingDraw('token');

    expect(prisma.teamAssignment.update).not.toHaveBeenCalled();
  });
});
