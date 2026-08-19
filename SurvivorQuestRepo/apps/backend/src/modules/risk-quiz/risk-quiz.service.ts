import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RiskDifficulty } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getOpaqueTokenCandidates } from '../../shared/lib/opaque-token';
import {
  parseCompletionCode,
  resolveCompletionCodeInputMode,
} from '../mobile/domain/mobile-station.helpers';
import {
  RISK_CARDS_PER_POOL,
  RISK_DIFFICULTY_ORDER,
  RISK_DIFFICULTY_POINTS,
  RISK_DIFFICULTY_SLUG,
  RISK_STREAK_MULTIPLIER_CAP,
  RISK_STREAK_MULTIPLIER_STEP,
} from './risk-quiz.constants';

const ANSWER_INDEX_STATION_TYPES = new Set(['quiz', 'audio-quiz']);

const POLISH_DIACRITICS: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

function slugify(value: string) {
  const transliterated = value
    .toLowerCase()
    .split('')
    .map((char) => POLISH_DIACRITICS[char] ?? char)
    .join('');

  return (
    transliterated.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') ||
    'kategoria'
  );
}

@Injectable()
export class RiskQuizService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireTeamSession(sessionToken: string) {
    if (!sessionToken?.trim()) {
      throw new UnauthorizedException('Missing session token');
    }

    const candidates = getOpaqueTokenCandidates(sessionToken);
    const assignment = await this.prisma.teamAssignment.findFirst({
      where: { sessionToken: { in: candidates } },
      include: { team: true, realization: true },
    });

    if (!assignment || !assignment.team) {
      throw new UnauthorizedException('Invalid session token');
    }

    if (assignment.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session expired');
    }

    return { team: assignment.team, realization: assignment.realization };
  }

  private async requireRealizationOrThrow(realizationId: string) {
    const realization = await this.prisma.realization.findUnique({
      where: { id: realizationId },
    });
    if (!realization) {
      throw new NotFoundException('Realization not found');
    }
    return realization;
  }

  // --- Device-facing: scan + answer ---

  async scanCard(input: { sessionToken: string; code: string }) {
    const { team, realization } = await this.requireTeamSession(
      input.sessionToken,
    );

    const normalizedCode = input.code.trim().toUpperCase();
    const card = await this.prisma.riskCard.findUnique({
      where: {
        realizationId_code: {
          realizationId: realization.id,
          code: normalizedCode,
        },
      },
      include: { category: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const poolStations = await this.prisma.riskPoolStation.findMany({
      where: { categoryId: card.categoryId, difficulty: card.difficulty },
      include: { station: true },
    });

    const attempted = await this.prisma.riskAttempt.findMany({
      where: {
        teamId: team.id,
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
      return {
        exhausted: true as const,
        categoryName: card.category.name,
        difficulty: card.difficulty,
      };
    }

    const chosen = available[Math.floor(Math.random() * available.length)];

    return {
      exhausted: false as const,
      cardId: card.id,
      categoryName: card.category.name,
      difficulty: card.difficulty,
      station: this.toRiskStationPayload(chosen.station),
    };
  }

  // Deck status for the idle scan screen: how many category "decks" the
  // assigned scheme has, and how many stations (cards) this team still
  // hasn't attempted across every category/difficulty in that scheme.
  // Named distinctly from the admin-facing getBoard(realizationId) below —
  // same class, different signature, would otherwise silently shadow it.
  async getDeckStatus(sessionToken: string) {
    const { team, realization } = await this.requireTeamSession(sessionToken);

    if (!realization.riskSchemeId) {
      return { categoryCount: 0, remainingCards: 0 };
    }

    const schemeCategories = await this.prisma.riskSchemeCategory.findMany({
      where: { schemeId: realization.riskSchemeId },
      select: { categoryId: true },
    });
    const categoryIds = schemeCategories.map((item) => item.categoryId);

    if (categoryIds.length === 0) {
      return { categoryCount: 0, remainingCards: 0 };
    }

    const poolStations = await this.prisma.riskPoolStation.findMany({
      where: { categoryId: { in: categoryIds } },
      select: { stationId: true },
    });

    const attempted = await this.prisma.riskAttempt.findMany({
      where: {
        teamId: team.id,
        stationId: { in: poolStations.map((item) => item.stationId) },
      },
      select: { stationId: true },
    });
    const attemptedStationIds = new Set(
      attempted.map((item) => item.stationId),
    );

    const remainingCards = poolStations.filter(
      (item) => !attemptedStationIds.has(item.stationId),
    ).length;

    return {
      categoryCount: categoryIds.length,
      remainingCards,
    };
  }

  private toRiskStationPayload(station: {
    id: string;
    type: string;
    name: string;
    description: string;
    imageUrl: string | null;
    points: number;
    timeLimitSeconds: number;
    completionCode: string | null;
    quizData: unknown;
  }) {
    const isAnswerIndexType = ANSWER_INDEX_STATION_TYPES.has(station.type);
    const quiz = isAnswerIndexType
      ? (station.quizData as {
          question?: string;
          answers?: string[];
          audioUrl?: string;
        } | null)
      : null;
    const completionCodeLength =
      parseCompletionCode(station.completionCode)?.length ?? 0;

    return {
      id: station.id,
      type: station.type,
      name: station.name,
      description: station.description,
      imageUrl: station.imageUrl,
      points: station.points,
      timeLimitSeconds: station.timeLimitSeconds,
      // Deliberately no correct-answer data here — only revealed after the
      // team submits, in submitAnswer's response.
      completionCodeLength:
        completionCodeLength > 0 ? completionCodeLength : undefined,
      completionCodeInputMode: resolveCompletionCodeInputMode(
        station.completionCode,
      ),
      quiz:
        quiz && Array.isArray(quiz.answers)
          ? {
              question: quiz.question,
              answers: quiz.answers,
              audioUrl: quiz.audioUrl,
            }
          : undefined,
    };
  }

  async submitAnswer(input: {
    sessionToken: string;
    cardId: string;
    stationId: string;
    selectedIndex?: number;
    completed?: boolean;
  }) {
    const { team, realization } = await this.requireTeamSession(
      input.sessionToken,
    );

    const [card, station] = await Promise.all([
      this.prisma.riskCard.findUnique({ where: { id: input.cardId } }),
      this.prisma.station.findUnique({ where: { id: input.stationId } }),
    ]);

    if (!card || card.realizationId !== realization.id) {
      throw new NotFoundException('Card not found');
    }
    if (!station) {
      throw new NotFoundException('Station not found');
    }

    const poolMembership = await this.prisma.riskPoolStation.findUnique({
      where: {
        categoryId_difficulty_stationId: {
          categoryId: card.categoryId,
          difficulty: card.difficulty,
          stationId: station.id,
        },
      },
    });
    if (!poolMembership) {
      throw new BadRequestException(
        "Station does not belong to this card's pool",
      );
    }

    const existingAttempt = await this.prisma.riskAttempt.findFirst({
      where: { teamId: team.id, stationId: station.id },
    });
    if (existingAttempt) {
      throw new BadRequestException('Station already attempted');
    }

    const { isCorrect, correctIndex } = this.resolveOutcome(station, input);
    const priorStreak = await this.getCurrentStreak(team.id);
    const streak = isCorrect ? priorStreak + 1 : 0;
    const multiplier = isCorrect ? this.resolveStreakMultiplier(streak) : 1;
    const scoring = RISK_DIFFICULTY_POINTS[card.difficulty];
    const pointsDelta = isCorrect
      ? Math.round(scoring.correct * multiplier)
      : scoring.incorrect;

    await this.prisma.riskAttempt.create({
      data: {
        realizationId: realization.id,
        teamId: team.id,
        cardId: card.id,
        stationId: station.id,
        selectedIndex:
          typeof input.selectedIndex === 'number' ? input.selectedIndex : null,
        isCorrect,
        pointsDelta,
      },
    });

    const updatedTeam = await this.prisma.team.update({
      where: { id: team.id },
      data: { points: { increment: pointsDelta } },
    });

    return {
      isCorrect,
      correctIndex,
      pointsDelta,
      teamPoints: updatedTeam.points,
      streak,
      multiplier,
    };
  }

  // How many of the team's most recent risk-quiz attempts (across every
  // category/difficulty) were correct in an unbroken run, most recent first.
  // Recomputed from RiskAttempt history rather than trusted client state, so
  // the streak (and the multiplier it drives) can't be spoofed by the app
  // and survives the player closing/reopening it mid-game.
  private async getCurrentStreak(teamId: string): Promise<number> {
    const recentAttempts = await this.prisma.riskAttempt.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      select: { isCorrect: true },
      take: 50,
    });

    let streak = 0;
    for (const attempt of recentAttempts) {
      if (!attempt.isCorrect) {
        break;
      }
      streak += 1;
    }
    return streak;
  }

  private resolveStreakMultiplier(streak: number): number {
    return Math.min(
      1 + RISK_STREAK_MULTIPLIER_STEP * Math.max(0, streak - 1),
      RISK_STREAK_MULTIPLIER_CAP,
    );
  }

  /**
   * Quiz-family stations (ABCD) get real server-side validation against
   * quizData.correctAnswerIndex. Every other station type (wordle, hangman,
   * memory, ...) doesn't have a server-checkable answer today, so the
   * client asserts whether it solved or gave up on the puzzle, and the
   * server trusts that flag — same "completed = correct" rule for all of
   * them, applied uniformly regardless of type.
   */
  private resolveOutcome(
    station: { type: string; quizData: unknown },
    input: { selectedIndex?: number; completed?: boolean },
  ): { isCorrect: boolean; correctIndex?: number } {
    if (ANSWER_INDEX_STATION_TYPES.has(station.type)) {
      const quiz = station.quizData as { correctAnswerIndex?: number } | null;
      if (
        typeof input.selectedIndex !== 'number' ||
        !quiz ||
        typeof quiz.correctAnswerIndex !== 'number'
      ) {
        throw new BadRequestException('Invalid answer index');
      }
      return {
        isCorrect: input.selectedIndex === quiz.correctAnswerIndex,
        correctIndex: quiz.correctAnswerIndex,
      };
    }

    if (typeof input.completed !== 'boolean') {
      throw new BadRequestException('Missing completion outcome');
    }
    return { isCorrect: input.completed };
  }

  // --- Admin: categories (reusable task pools), schemes (decks), cards, board ---

  private static readonly poolStationsInclude = {
    poolStations: {
      orderBy: { createdAt: 'asc' as const },
      include: { station: true },
    },
  };

  private static readonly schemeCategoriesInclude = {
    schemeCategories: {
      orderBy: { order: 'asc' as const },
      include: { category: { include: RiskQuizService.poolStationsInclude } },
    },
  };

  // --- Schemes ("talie") — assemble existing Categories, same relationship
  // shape as Scenario -> Station: a scheme assigns, it doesn't own content. ---

  async listSchemes() {
    return this.prisma.riskScheme.findMany({
      orderBy: { name: 'asc' },
      include: RiskQuizService.schemeCategoriesInclude,
    });
  }

  async createScheme(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Scheme name is required');
    }
    return this.prisma.riskScheme.create({
      data: { name: trimmed },
      include: RiskQuizService.schemeCategoriesInclude,
    });
  }

  async renameScheme(schemeId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Scheme name is required');
    }
    return this.prisma.riskScheme.update({
      where: { id: schemeId },
      data: { name: trimmed },
    });
  }

  async deleteScheme(schemeId: string) {
    await this.prisma.riskScheme.delete({ where: { id: schemeId } });
    return { success: true };
  }

  async assignCategoryToScheme(schemeId: string, categoryId: string) {
    const count = await this.prisma.riskSchemeCategory.count({
      where: { schemeId },
    });
    try {
      return await this.prisma.riskSchemeCategory.create({
        data: { schemeId, categoryId, order: count },
        include: { category: { include: RiskQuizService.poolStationsInclude } },
      });
    } catch {
      throw new BadRequestException(
        'This category is already assigned to this scheme',
      );
    }
  }

  async removeCategoryFromScheme(schemeCategoryId: string) {
    await this.prisma.riskSchemeCategory.delete({
      where: { id: schemeCategoryId },
    });
    return { success: true };
  }

  // --- Categories ("kategorie") — standalone, reusable task pools ---

  async listCategories() {
    return this.prisma.riskCategory.findMany({
      orderBy: { name: 'asc' },
      include: RiskQuizService.poolStationsInclude,
    });
  }

  async createCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Category name is required');
    }
    return this.prisma.riskCategory.create({
      data: { name: trimmed },
      include: RiskQuizService.poolStationsInclude,
    });
  }

  async updateCategory(categoryId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Category name is required');
    }
    return this.prisma.riskCategory.update({
      where: { id: categoryId },
      data: { name: trimmed },
    });
  }

  async deleteCategory(categoryId: string) {
    await this.prisma.riskCategory.delete({ where: { id: categoryId } });
    return { success: true };
  }

  async assignStationToPool(input: {
    categoryId: string;
    difficulty: RiskDifficulty;
    stationId: string;
  }) {
    const station = await this.prisma.station.findUnique({
      where: { id: input.stationId },
    });
    if (!station) {
      throw new BadRequestException('Station not found');
    }

    try {
      return await this.prisma.riskPoolStation.create({
        data: {
          categoryId: input.categoryId,
          difficulty: input.difficulty,
          stationId: input.stationId,
        },
        include: { station: true },
      });
    } catch {
      throw new BadRequestException(
        'This station is already assigned to this pool',
      );
    }
  }

  async removeStationFromPool(poolStationId: string) {
    await this.prisma.riskPoolStation.delete({
      where: { id: poolStationId },
    });
    return { success: true };
  }

  async listCards(realizationId: string) {
    await this.requireRealizationOrThrow(realizationId);
    return this.prisma.riskCard.findMany({
      where: { realizationId },
      include: { category: true },
      orderBy: [{ category: { name: 'asc' } }, { difficulty: 'asc' }],
    });
  }

  /**
   * Ensures every (category, difficulty) pool of the realization's assigned
   * scheme ("talia") has RISK_CARDS_PER_POOL physical cards — multiple
   * duplicate QR codes into the same pool, so several teams can draw from
   * e.g. "Historia — łatwe" in parallel instead of queuing for one physical
   * card. Codes are deterministic (<category-slug>-<difficulty-slug>-<n>)
   * so the printed stickers stay valid across every realization that reuses
   * the same category — only the DB rows get (re)created per realization.
   * Idempotent — safe to call again after the scheme's categories change.
   */
  async generateMissingCards(realizationId: string) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    if (!realization.riskSchemeId) {
      throw new BadRequestException(
        'This realization has no assigned scheme (talia)',
      );
    }

    const schemeCategories = await this.prisma.riskSchemeCategory.findMany({
      where: { schemeId: realization.riskSchemeId },
      include: { category: true },
    });

    const existingCards = await this.prisma.riskCard.findMany({
      where: { realizationId },
    });

    for (const { category } of schemeCategories) {
      const categorySlug = slugify(category.name);
      for (const difficulty of RISK_DIFFICULTY_ORDER) {
        const existingCodes = new Set(
          existingCards
            .filter(
              (card) =>
                card.categoryId === category.id &&
                card.difficulty === difficulty,
            )
            .map((card) => card.code),
        );
        const difficultySlug = RISK_DIFFICULTY_SLUG[difficulty];

        for (let index = 1; index <= RISK_CARDS_PER_POOL; index += 1) {
          const code = `${categorySlug}-${difficultySlug}-${index}`;
          if (existingCodes.has(code)) continue;

          await this.prisma.riskCard.create({
            data: { realizationId, categoryId: category.id, difficulty, code },
          });
        }
      }
    }

    return this.listCards(realizationId);
  }

  async getBoard(realizationId: string) {
    await this.requireRealizationOrThrow(realizationId);
    const teams = await this.prisma.team.findMany({
      where: { realizationId },
      orderBy: { points: 'desc' },
      select: {
        id: true,
        name: true,
        slotNumber: true,
        color: true,
        badgeKey: true,
        points: true,
      },
    });
    const totalPoints = teams.reduce((sum, team) => sum + team.points, 0);
    return { teams, totalPoints };
  }
}
