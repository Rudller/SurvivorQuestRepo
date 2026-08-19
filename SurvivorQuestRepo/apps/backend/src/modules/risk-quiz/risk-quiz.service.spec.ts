import { BadRequestException } from '@nestjs/common';
import { RiskQuizService } from './risk-quiz.service';

function createService() {
  const prisma = {
    teamAssignment: { findFirst: jest.fn() },
    realization: { findUnique: jest.fn() },
    riskCard: { findUnique: jest.fn() },
    riskPoolStation: { findMany: jest.fn(), findUnique: jest.fn() },
    riskSchemeCategory: { findMany: jest.fn() },
    station: { findUnique: jest.fn() },
    riskAttempt: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    team: { update: jest.fn() },
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
  type: 'quiz',
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
      type: 'wordle',
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
