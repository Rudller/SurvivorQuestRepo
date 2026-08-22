import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  RiskDifficulty,
  StationType as PrismaStationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getOpaqueTokenCandidates } from '../../shared/lib/opaque-token';
import {
  parseCompletionCode,
  resolveCompletionCodeInputMode,
} from '../mobile/domain/mobile-station.helpers';
import { fromPrismaStationType } from '../station/mappers/station.mapper';
import {
  RISK_CARDS_PER_POOL,
  RISK_DIFFICULTY_ORDER,
  RISK_DIFFICULTY_POINTS,
  RISK_DIFFICULTY_SLUG,
  RISK_STREAK_MULTIPLIER_CAP,
  RISK_STREAK_MULTIPLIER_STEP,
} from './risk-quiz.constants';

// station.type here is always the raw Prisma enum (straight from a Station
// row) — NOT the lowercase-kebab string the mobile client uses elsewhere
// (see fromPrismaStationType). Comparing against 'quiz'/'audio-quiz' here
// silently never matched, so every QUIZ-type risk card fell through to the
// generic "completed / gave up" flow instead of showing real answer options.
const ANSWER_INDEX_STATION_TYPES = new Set<PrismaStationType>([
  PrismaStationType.QUIZ,
  PrismaStationType.AUDIO_QUIZ,
]);

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

    if (!realization.riskSchemeId) {
      throw new NotFoundException('Card not found');
    }
    const activeSchemeCategory = await this.prisma.riskSchemeCategory.findFirst(
      {
        where: {
          schemeId: realization.riskSchemeId,
          categoryId: card.categoryId,
        },
        select: { categoryId: true },
      },
    );
    if (!activeSchemeCategory) {
      // Keep historical RiskCard/RiskAttempt rows intact when an operator
      // changes the scheme, but do not let cards from the old scheme remain
      // scannable in this realization.
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

  // Test menu for the idle scan screen's hold-gesture shortcut (mirrors the
  // normal station test menu) — one entry per (category, difficulty) pool
  // that has at least one generated card, each carrying a real card `code`
  // so tapping it can go through the exact same scanCard() path a physical
  // QR scan would, instead of a separate no-op preview mode.
  async listTestMenuEntries(sessionToken: string) {
    const { realization } = await this.requireTeamSession(sessionToken);

    if (!realization.riskSchemeId) {
      return [];
    }

    const schemeCategories = await this.prisma.riskSchemeCategory.findMany({
      where: { schemeId: realization.riskSchemeId },
      include: { category: true },
      orderBy: { order: 'asc' },
    });
    const categoryIds = schemeCategories.map((item) => item.categoryId);

    if (categoryIds.length === 0) {
      return [];
    }

    const cards = await this.prisma.riskCard.findMany({
      where: { realizationId: realization.id, categoryId: { in: categoryIds } },
      orderBy: { createdAt: 'asc' },
    });

    const entries: {
      categoryId: string;
      categoryName: string;
      difficulty: RiskDifficulty;
      code: string;
    }[] = [];

    for (const schemeCategory of schemeCategories) {
      for (const difficulty of RISK_DIFFICULTY_ORDER) {
        const card = cards.find(
          (item) =>
            item.categoryId === schemeCategory.categoryId &&
            item.difficulty === difficulty,
        );
        if (card) {
          entries.push({
            categoryId: schemeCategory.categoryId,
            categoryName: schemeCategory.category.name,
            difficulty,
            code: card.code,
          });
        }
      }
    }

    return entries;
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

    // Use deleteMany as the atomic consume gate. Two overlapping polls (or an
    // admin cancellation racing this poll) may both read the same row; only
    // the request that actually deletes it is allowed to deliver the draw.
    const consumed = await this.prisma.riskPendingDraw.deleteMany({
      where: { id: pendingDraw.id, teamId: team.id },
    });
    if (consumed.count === 0) {
      return { draw: null };
    }

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
    id: string;
    type: PrismaStationType;
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
      type: fromPrismaStationType(station.type),
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
    station: { type: PrismaStationType; quizData: unknown },
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
    const codeSlug = await this.generateUniqueCategoryCodeSlug(trimmed);
    return this.prisma.riskCategory.create({
      data: { name: trimmed, codeSlug },
      include: RiskQuizService.poolStationsInclude,
    });
  }

  async updateCategory(categoryId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Category name is required');
    }

    const current = await this.prisma.riskCategory.findUnique({
      where: { id: categoryId },
    });
    if (!current) {
      throw new NotFoundException('Category not found');
    }

    const data: { name: string; codeSlug?: string } = { name: trimmed };
    if (!current.codeSlug) {
      // Backfill from the pre-rename name — a category's printed codes must
      // never move just because someone renamed it for display, so the slug
      // is derived from whatever name it had *before* this rename, not the
      // new one.
      data.codeSlug = await this.generateUniqueCategoryCodeSlug(
        current.name,
        categoryId,
      );
    }

    return this.prisma.riskCategory.update({
      where: { id: categoryId },
      data,
    });
  }

  // Finds a codeSlug for `name` that isn't already taken by another category,
  // appending -2, -3, ... on collision (e.g. two names that slugify the same).
  private async generateUniqueCategoryCodeSlug(
    name: string,
    excludeCategoryId?: string,
  ): Promise<string> {
    const baseSlug = slugify(name);
    let candidate = baseSlug;
    let suffix = 1;

    for (;;) {
      const existing = await this.prisma.riskCategory.findUnique({
        where: { codeSlug: candidate },
      });
      if (!existing || existing.id === excludeCategoryId) {
        return candidate;
      }
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
  }

  // Returns a category's stable code slug, lazily backfilling it (from the
  // category's current name) and persisting it if this category predates the
  // codeSlug column — so old categories get one without a manual migration.
  private async ensureCategoryCodeSlug(category: {
    id: string;
    name: string;
    codeSlug: string | null;
  }): Promise<string> {
    if (category.codeSlug) {
      return category.codeSlug;
    }

    const codeSlug = await this.generateUniqueCategoryCodeSlug(
      category.name,
      category.id,
    );
    await this.prisma.riskCategory.update({
      where: { id: category.id },
      data: { codeSlug },
    });
    return codeSlug;
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
    const realization = await this.requireRealizationOrThrow(realizationId);
    if (!realization.riskSchemeId) {
      return [];
    }
    const schemeCategories = await this.prisma.riskSchemeCategory.findMany({
      where: { schemeId: realization.riskSchemeId },
      select: { categoryId: true },
    });
    const categoryIds = schemeCategories.map((item) => item.categoryId);
    if (categoryIds.length === 0) {
      return [];
    }
    return this.prisma.riskCard.findMany({
      where: { realizationId, categoryId: { in: categoryIds } },
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
      const categorySlug = await this.ensureCategoryCodeSlug(category);
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
          // scanCard() uppercases whatever it scans before matching against
          // this column (defensive against scan/typing case variance) — the
          // stored code must be uppercase too, or it can never match.
          const code =
            `${categorySlug}-${difficultySlug}-${index}`.toUpperCase();
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

  // Per-team "which cards has this team already burned" breakdown for the
  // live-ops admin panel — same (category, difficulty) -> pool-station-count
  // shape scanCard()/getDeckStatus() use, but for every team at once instead
  // of the one team a mobile session belongs to.
  async getTeamCardStatus(realizationId: string) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    const teams = await this.prisma.team.findMany({
      where: { realizationId },
      orderBy: { slotNumber: 'asc' },
      select: { id: true, name: true, slotNumber: true, color: true },
    });

    if (!realization.riskSchemeId) {
      return {
        teams: teams.map((team) => ({
          teamId: team.id,
          teamName: team.name,
          slotNumber: team.slotNumber,
          color: team.color,
          totalAttempted: 0,
          totalCards: 0,
          categories: [] as {
            categoryId: string;
            categoryName: string;
            difficulty: RiskDifficulty;
            attempted: number;
            total: number;
          }[],
        })),
      };
    }

    const schemeCategories = await this.prisma.riskSchemeCategory.findMany({
      where: { schemeId: realization.riskSchemeId },
      include: { category: true },
      orderBy: { order: 'asc' },
    });
    const categoryIds = schemeCategories.map((item) => item.categoryId);

    const poolStations = await this.prisma.riskPoolStation.findMany({
      where: { categoryId: { in: categoryIds } },
      select: { categoryId: true, difficulty: true, stationId: true },
    });

    const poolKeyByStationId = new Map<string, string>();
    const totalByPoolKey = new Map<string, number>();
    for (const item of poolStations) {
      const key = `${item.categoryId}:${item.difficulty}`;
      poolKeyByStationId.set(item.stationId, key);
      totalByPoolKey.set(key, (totalByPoolKey.get(key) ?? 0) + 1);
    }

    const attempts = await this.prisma.riskAttempt.findMany({
      where: {
        realizationId,
        stationId: { in: poolStations.map((item) => item.stationId) },
      },
      select: { teamId: true, stationId: true },
    });

    const attemptedByTeam = new Map<string, Map<string, number>>();
    for (const attempt of attempts) {
      const key = poolKeyByStationId.get(attempt.stationId);
      if (!key) continue;
      const teamCounts =
        attemptedByTeam.get(attempt.teamId) ?? new Map<string, number>();
      teamCounts.set(key, (teamCounts.get(key) ?? 0) + 1);
      attemptedByTeam.set(attempt.teamId, teamCounts);
    }

    return {
      teams: teams.map((team) => {
        const teamAttempted =
          attemptedByTeam.get(team.id) ?? new Map<string, number>();
        let totalAttempted = 0;
        let totalCards = 0;
        const categories: {
          categoryId: string;
          categoryName: string;
          difficulty: RiskDifficulty;
          attempted: number;
          total: number;
        }[] = [];

        for (const schemeCategory of schemeCategories) {
          for (const difficulty of RISK_DIFFICULTY_ORDER) {
            const key = `${schemeCategory.categoryId}:${difficulty}`;
            const total = totalByPoolKey.get(key) ?? 0;
            if (total === 0) continue;

            const attempted = teamAttempted.get(key) ?? 0;
            totalAttempted += attempted;
            totalCards += total;
            categories.push({
              categoryId: schemeCategory.categoryId,
              categoryName: schemeCategory.category.name,
              difficulty,
              attempted,
              total,
            });
          }
        }

        return {
          teamId: team.id,
          teamName: team.name,
          slotNumber: team.slotNumber,
          color: team.color,
          totalAttempted,
          totalCards,
          categories,
        };
      }),
    };
  }

  // Clears one team's Ryzykanci progress without touching the rest of the
  // realization — for when a single team's device/scanner glitched out,
  // instead of resetting every team via resetMobileAdminRealization.
  async resetTeamAttempts(realizationId: string, teamId: string) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.realizationId !== realization.id) {
      throw new NotFoundException('Team not found');
    }

    const attempts = await this.prisma.riskAttempt.findMany({
      where: { realizationId: realization.id, teamId },
      select: { pointsDelta: true },
    });

    if (attempts.length === 0) {
      await this.prisma.riskPendingDraw.deleteMany({ where: { teamId } });
      return { teamId, resetCount: 0, pointsAdjusted: 0 };
    }

    const pointsToRemove = attempts.reduce(
      (sum, attempt) => sum + attempt.pointsDelta,
      0,
    );

    await this.prisma.$transaction([
      this.prisma.riskPendingDraw.deleteMany({ where: { teamId } }),
      this.prisma.riskAttempt.deleteMany({
        where: { realizationId: realization.id, teamId },
      }),
      this.prisma.team.update({
        where: { id: teamId },
        data: { points: { decrement: pointsToRemove } },
      }),
    ]);

    return {
      teamId,
      resetCount: attempts.length,
      pointsAdjusted: -pointsToRemove,
    };
  }

  // --- Admin: per-station override for one team's Ryzykanci progress ---
  // The admin UI calls this "cards", but the unit that actually carries a
  // status is the pool STATION — a printed card is just an interchangeable
  // QR key into a (category, difficulty) pool (see generateMissingCards'
  // doc comment above), so this mirrors the classic game's per-station
  // task-editing panel one row per pool station instead of one per card.

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

    const schemeCategories = await this.prisma.riskSchemeCategory.findMany({
      where: { schemeId: realization.riskSchemeId },
      include: { category: true },
      orderBy: { order: 'asc' },
    });
    const categoryIds = schemeCategories.map((item) => item.categoryId);
    if (categoryIds.length === 0) {
      return { teamId, tasks: [], pendingDraw };
    }

    const categoryNameById = new Map(
      schemeCategories.map((item) => [item.categoryId, item.category.name]),
    );
    const categoryOrderById = new Map(
      schemeCategories.map((item, index) => [item.categoryId, index]),
    );
    const difficultyOrderByValue = new Map(
      RISK_DIFFICULTY_ORDER.map((difficulty, index) => [difficulty, index]),
    );

    const poolStations = await this.prisma.riskPoolStation.findMany({
      where: { categoryId: { in: categoryIds } },
      include: { station: true },
      orderBy: { createdAt: 'asc' },
    });

    const attempts = await this.prisma.riskAttempt.findMany({
      where: {
        teamId,
        stationId: { in: poolStations.map((item) => item.stationId) },
      },
    });
    const attemptByStationId = new Map(
      attempts.map((attempt) => [attempt.stationId, attempt]),
    );

    const tasks = poolStations
      .map((poolStation) => {
        const attempt = attemptByStationId.get(poolStation.stationId);
        const status: 'todo' | 'done' | 'failed' = !attempt
          ? 'todo'
          : attempt.isCorrect
            ? 'done'
            : 'failed';
        return {
          categoryId: poolStation.categoryId,
          categoryName: categoryNameById.get(poolStation.categoryId) ?? '',
          difficulty: poolStation.difficulty,
          stationId: poolStation.stationId,
          stationName: poolStation.station.name,
          status,
          pointsAwarded: attempt?.pointsDelta ?? 0,
        };
      })
      .sort((left, right) => {
        const categoryDiff =
          (categoryOrderById.get(left.categoryId) ?? 0) -
          (categoryOrderById.get(right.categoryId) ?? 0);
        if (categoryDiff !== 0) {
          return categoryDiff;
        }
        return (
          (difficultyOrderByValue.get(left.difficulty) ?? 0) -
          (difficultyOrderByValue.get(right.difficulty) ?? 0)
        );
      });

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

  private async requireRiskPoolStationOrThrow(stationId: string) {
    const poolStation = await this.prisma.riskPoolStation.findFirst({
      where: { stationId },
    });
    if (!poolStation) {
      throw new NotFoundException('Station is not part of any risk pool');
    }
    return poolStation;
  }

  // Shared by adminCompleteCard/adminFailCard — same flat, difficulty-based
  // scoring the classic admin Zalicz/Niezalicz buttons use (no dynamic streak
  // multiplier), so an admin override always awards a predictable amount.
  // Overwrites any existing attempt in place instead of requiring Reset first.
  private async setCardOutcome(
    realizationId: string,
    teamId: string,
    stationId: string,
    isCorrect: boolean,
  ) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.realizationId !== realization.id) {
      throw new NotFoundException('Team not found');
    }

    const poolStation = await this.requireRiskPoolStationOrThrow(stationId);
    const pointsDelta = isCorrect
      ? RISK_DIFFICULTY_POINTS[poolStation.difficulty].correct
      : RISK_DIFFICULTY_POINTS[poolStation.difficulty].incorrect;

    const existingAttempt = await this.prisma.riskAttempt.findFirst({
      where: { teamId, stationId },
    });

    const updatedTeam = existingAttempt
      ? await this.applyCardOutcomeUpdate(
          existingAttempt,
          isCorrect,
          pointsDelta,
          teamId,
        )
      : await this.applyCardOutcomeCreate(
          realizationId,
          teamId,
          stationId,
          poolStation,
          isCorrect,
          pointsDelta,
        );

    return {
      teamId,
      stationId,
      taskStatus: isCorrect ? 'done' : 'failed',
      pointsAwarded: pointsDelta,
      teamPoints: updatedTeam.points,
    };
  }

  private async applyCardOutcomeUpdate(
    existingAttempt: { id: string; pointsDelta: number },
    isCorrect: boolean,
    pointsDelta: number,
    teamId: string,
  ) {
    const pointsAdjustment = pointsDelta - existingAttempt.pointsDelta;
    const [, updatedTeam] = await this.prisma.$transaction([
      this.prisma.riskAttempt.update({
        where: { id: existingAttempt.id },
        data: { isCorrect, pointsDelta },
      }),
      this.prisma.team.update({
        where: { id: teamId },
        data: { points: { increment: pointsAdjustment } },
      }),
    ]);
    return updatedTeam;
  }

  private async applyCardOutcomeCreate(
    realizationId: string,
    teamId: string,
    stationId: string,
    poolStation: { categoryId: string; difficulty: RiskDifficulty },
    isCorrect: boolean,
    pointsDelta: number,
  ) {
    const card = await this.prisma.riskCard.findFirst({
      where: {
        realizationId,
        categoryId: poolStation.categoryId,
        difficulty: poolStation.difficulty,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!card) {
      throw new BadRequestException(
        'Brak wygenerowanych kart dla tej puli — najpierw wygeneruj karty.',
      );
    }

    const [, updatedTeam] = await this.prisma.$transaction([
      this.prisma.riskAttempt.create({
        data: {
          realizationId,
          teamId,
          cardId: card.id,
          stationId,
          isCorrect,
          pointsDelta,
        },
      }),
      this.prisma.team.update({
        where: { id: teamId },
        data: { points: { increment: pointsDelta } },
      }),
    ]);
    return updatedTeam;
  }

  async adminCompleteCard(
    realizationId: string,
    teamId: string,
    stationId: string,
  ) {
    return this.setCardOutcome(realizationId, teamId, stationId, true);
  }

  async adminFailCard(
    realizationId: string,
    teamId: string,
    stationId: string,
  ) {
    return this.setCardOutcome(realizationId, teamId, stationId, false);
  }

  async adminResetCard(
    realizationId: string,
    teamId: string,
    stationId: string,
  ) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.realizationId !== realization.id) {
      throw new NotFoundException('Team not found');
    }

    const existingAttempt = await this.prisma.riskAttempt.findFirst({
      where: { teamId, stationId },
    });

    if (!existingAttempt) {
      return {
        teamId,
        stationId,
        taskStatus: 'todo' as const,
        pointsAwarded: 0,
        teamPoints: team.points,
      };
    }

    const [, updatedTeam] = await this.prisma.$transaction([
      this.prisma.riskAttempt.delete({ where: { id: existingAttempt.id } }),
      this.prisma.team.update({
        where: { id: teamId },
        data: { points: { decrement: existingAttempt.pointsDelta } },
      }),
    ]);

    return {
      teamId,
      stationId,
      taskStatus: 'todo' as const,
      pointsAwarded: 0,
      teamPoints: updatedTeam.points,
    };
  }

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

    if (!realization.riskSchemeId) {
      throw new BadRequestException(
        'This realization has no assigned scheme (talia)',
      );
    }

    const schemeCategory = await this.prisma.riskSchemeCategory.findFirst({
      where: { schemeId: realization.riskSchemeId, categoryId },
      select: { categoryId: true },
    });
    if (!schemeCategory) {
      throw new NotFoundException('Category is not assigned to this scheme');
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
