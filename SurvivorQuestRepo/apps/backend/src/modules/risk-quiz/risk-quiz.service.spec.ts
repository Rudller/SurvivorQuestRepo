import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RiskQuizService } from './risk-quiz.service';

function createService() {
  const prisma = {
    teamAssignment: { findFirst: jest.fn() },
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
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const stationService = {
    cloneStationsForScenario: jest.fn().mockResolvedValue([]),
  };

  const service = new RiskQuizService(prisma as never, stationService as never);
  return { service, prisma, stationService };
}

const team = { id: 'team-1', points: 0 };
const realization = { id: 'realization-1' };
const assignment = {
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

    expect(result).toEqual({ categoryCount: 0, remainingCards: 0 });
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
    prisma.riskAttempt.findMany.mockResolvedValue([
      { stationId: 'station-1' },
      { stationId: 'station-2' },
    ]);

    const result = await service.getDeckStatus('token');

    expect(result).toEqual({ categoryCount: 2, remainingCards: 3 });
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
    expect(createdCodes).toContain('HISTORIA-LATWE-1');
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
    expect(createdCodes).toContain('HISTORIA-LATWE-1');
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
  function arrangeTemplateDeck(prisma: ReturnType<typeof createService>['prisma']) {
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
      where: { realizationId: 'realization-1', categoryId: 'template-category' },
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

describe('RiskQuizService.assignStationToPool', () => {
  it('assigns an unattached template station (no scenarioInstanceId/realizationId)', async () => {
    const { service, prisma } = createService();
    prisma.station.findUnique.mockResolvedValue({
      ...quizStation,
      scenarioInstanceId: null,
      realizationId: null,
    });
    prisma.riskCategory.findUnique.mockResolvedValue({ realizationId: null });
    prisma.riskPoolStation.create.mockResolvedValue({ id: 'pool-1' });

    await service.assignStationToPool({
      categoryId: 'category-1',
      difficulty: 'EASY' as never,
      stationId: quizStation.id,
    });

    expect(prisma.riskPoolStation.create).toHaveBeenCalledWith({
      data: { categoryId: 'category-1', difficulty: 'EASY', stationId: quizStation.id },
      include: { station: true },
    });
  });

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
    prisma.riskPoolStation.create.mockResolvedValue({ id: 'pool-1' });

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
