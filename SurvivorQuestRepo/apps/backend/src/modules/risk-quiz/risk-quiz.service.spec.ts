import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RiskQuizService } from './risk-quiz.service';

function createService() {
  const prisma = {
    teamAssignment: { findFirst: jest.fn() },
    realization: { findUnique: jest.fn() },
    riskCard: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    riskCategory: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
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
    station: { findUnique: jest.fn() },
    riskAttempt: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    team: { update: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  const service = new RiskQuizService(prisma as never);
  return { service, prisma };
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
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
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
        quiz: { question: 'Q1?', answers: ['a', 'b'], audioUrl: undefined },
      },
    });
  });

  it('reports the pool as exhausted once every assigned station has been attempted', async () => {
    const { service, prisma } = createService();
    prisma.teamAssignment.findFirst.mockResolvedValue(assignment);
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
    prisma.riskCategory.findUnique
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

  it('does nothing when the team has no attempts to clear', async () => {
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
      card: { difficulty: 'EASY', category: { name: 'Historia' } } as never,
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
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
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
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
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

    await service.triggerRemoteDraw(
      'realization-1',
      'team-1',
      'category-1',
      'EASY',
    );

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
      service.triggerRemoteDraw(
        'realization-1',
        'team-1',
        'category-1',
        'EASY',
      ),
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
    prisma.realization.findUnique.mockResolvedValue({ id: 'realization-1' });
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
