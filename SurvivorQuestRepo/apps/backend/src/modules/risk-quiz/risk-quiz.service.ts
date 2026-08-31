import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  RiskChatAuthorKind,
  RiskDifficulty,
  RiskPigType,
  RiskPoolStation as PrismaRiskPoolStationRow,
  Station as PrismaStationRow,
  StationType as PrismaStationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StationService } from '../station/station.service';
import { StationStorageService } from '../station/station-storage.service';
import { getOpaqueTokenCandidates } from '../../shared/lib/opaque-token';
import {
  isCodeProtectedStationType,
  parseCompletionCode,
  resolveCompletionCodeInputMode,
} from '../mobile/domain/mobile-station.helpers';
import {
  fromPrismaStationType,
  mapStation,
} from '../station/mappers/station.mapper';
import {
  buildRiskCardCode,
  RISK_CARDS_PER_POOL,
  RISK_EXCLUDED_STATION_TYPES,
  RISK_DIFFICULTY_ORDER,
  RISK_CHAT_HISTORY_LIMIT,
  RISK_CHAT_MESSAGE_MAX_LENGTH,
  RISK_CHAT_SYSTEM_EVENTS,
  RISK_DIFFICULTY_POINTS,
  RISK_PIG_LABELS,
  RISK_PIG_TYPES,
  RISK_PIG_WEAKEST_FRACTION,
  RISK_PIG_WILDCARD_COUNT,
  RISK_REVIEWED_ANSWER_MAX_LENGTH,
  resolveRiskTeamDisplayName,
  RISK_STREAK_MULTIPLIER_CAP,
  RISK_STREAK_MULTIPLIER_STEP,
} from './risk-quiz.constants';

// station.type here is always the raw Prisma enum (straight from a Station
// row) — NOT the lowercase-kebab string the mobile client uses elsewhere
// (see fromPrismaStationType). Comparing against 'quiz'/'audio-quiz' here
// silently never matched, so every QUIZ-type risk card fell through to the
// generic "completed / gave up" flow instead of showing real answer options.
// Deterministic stand-in for Math.random when two tablets must agree. Two
// concurrent syncs of the same tick have to pick the same wildcard, and a hash
// of (tick, team) gives an order that is stable across processes yet does not
// simply march down the slot numbers.
function stableTieBreak(tickKey: string, teamId: string) {
  const seed = `${tickKey}:${teamId}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1_000_003;
  }
  return hash;
}

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly stationService: StationService,
    private readonly stationStorageService: StationStorageService,
  ) {}

  // --- Realization-owned deck clones ---
  //
  // Mirrors Scenario -> Realization cloning (see ScenarioService.cloneScenario):
  // a realization plays its OWN copy of a deck, so editing a task from inside one
  // realization can never leak into another realization or into the library.
  // Library listings therefore only ever show templates (realizationId: null).

  /**
   * Deep-copies a template deck (scheme -> categories -> pools -> stations) into
   * a realization-owned clone and returns the new scheme id.
   *
   * The cloned categories keep their source's `codeSlug` verbatim. That is load
   * bearing: printed card codes are `<codeSlug>-<difficulty>-<n>`, so reusing the
   * slug is what keeps one physical QR sticker valid across every realization
   * built from the same template deck.
   */
  async cloneSchemeForRealization(
    sourceSchemeId: string,
    realizationId: string,
  ): Promise<string> {
    const source = await this.prisma.riskScheme.findUnique({
      where: { id: sourceSchemeId },
      include: {
        schemeCategories: {
          orderBy: { order: 'asc' },
          include: { category: { include: { poolStations: true } } },
        },
      },
    });
    if (!source) {
      throw new NotFoundException('Scheme not found');
    }

    const clonedScheme = await this.prisma.riskScheme.create({
      data: {
        name: source.name,
        realizationId,
        sourceTemplateId: source.sourceTemplateId ?? source.id,
      },
    });

    for (const [order, schemeCategory] of source.schemeCategories.entries()) {
      const sourceCategory = schemeCategory.category;
      const clonedCategory = await this.prisma.riskCategory.create({
        data: {
          name: sourceCategory.name,
          codeSlug: sourceCategory.codeSlug,
          realizationId,
          sourceTemplateId:
            sourceCategory.sourceTemplateId ?? sourceCategory.id,
        },
      });

      await this.prisma.riskSchemeCategory.create({
        data: {
          schemeId: clonedScheme.id,
          categoryId: clonedCategory.id,
          order,
        },
      });

      // Cards already minted for this realization still point at the SOURCE
      // category. scanCard() resolves a scanned code by checking that the card's
      // category is part of the realization's current deck, so leaving them
      // behind would make every already-printed sticker unscannable the moment
      // the deck got adopted. Re-point them instead — the code strings are
      // unaffected (the clone inherited the slug), so the physical cards stay valid.
      await this.prisma.riskCard.updateMany({
        where: { realizationId, categoryId: sourceCategory.id },
        data: { categoryId: clonedCategory.id },
      });

      if (sourceCategory.poolStations.length === 0) {
        continue;
      }

      // Clone the pool's stations too, so their content (question, answers,
      // time limit, ...) is editable per realization. Passing only realizationId
      // leaves scenarioInstanceId null — these are risk-pool stations, never
      // scenario stations, which is exactly what assignStationToPool's guard
      // below relies on to keep RiskAttempt and TeamTaskProgress disjoint.
      const clonedStations = await this.stationService.cloneStationsForScenario(
        sourceCategory.poolStations.map((poolStation) => poolStation.stationId),
        { realizationId },
      );

      const clonedStationIdBySourceId = new Map(
        clonedStations.map((station, index) => [
          sourceCategory.poolStations[index].stationId,
          station.id,
        ]),
      );

      for (const poolStation of sourceCategory.poolStations) {
        const clonedStationId = clonedStationIdBySourceId.get(
          poolStation.stationId,
        );
        if (!clonedStationId) {
          continue;
        }
        await this.prisma.riskPoolStation.create({
          data: {
            categoryId: clonedCategory.id,
            difficulty: poolStation.difficulty,
            stationId: clonedStationId,
          },
        });

        // Same reasoning as the card re-point above: "has this team already done
        // this task" is decided by comparing RiskAttempt.stationId against the
        // pool's station ids. Attempts recorded before adoption reference the
        // source station, so without this a mid-game adoption would silently
        // hand every team their finished tasks again.
        await this.prisma.riskAttempt.updateMany({
          where: { realizationId, stationId: poolStation.stationId },
          data: { stationId: clonedStationId },
        });
      }
    }

    // Pending remote-launch draws are ephemeral commands that still reference
    // pre-clone card/station ids. They're re-issued with one click, so dropping
    // them is cleaner than rewriting them.
    const teams = await this.prisma.team.findMany({
      where: { realizationId },
      select: { id: true },
    });
    if (teams.length > 0) {
      await this.prisma.riskPendingDraw.deleteMany({
        where: { teamId: { in: teams.map((team) => team.id) } },
      });
    }

    return clonedScheme.id;
  }

  /**
   * Returns the realization's own deck id, cloning the template it currently
   * points at if it hasn't been cloned yet. Realizations created before
   * per-realization decks existed still reference a template directly, so every
   * realization-scoped edit funnels through here first (lazy adoption) instead
   * of silently editing the shared library.
   */
  async ensureRealizationOwnedScheme(realizationId: string): Promise<string> {
    const realization = await this.requireRealizationOrThrow(realizationId);
    if (!realization.riskSchemeId) {
      throw new BadRequestException(
        'This realization has no assigned scheme (talia)',
      );
    }

    const scheme = await this.prisma.riskScheme.findUnique({
      where: { id: realization.riskSchemeId },
      select: { id: true, realizationId: true },
    });
    if (!scheme) {
      throw new NotFoundException('Scheme not found');
    }
    if (scheme.realizationId === realizationId) {
      return scheme.id;
    }

    const clonedSchemeId = await this.cloneSchemeForRealization(
      scheme.id,
      realizationId,
    );
    await this.prisma.realization.update({
      where: { id: realizationId },
      data: { riskSchemeId: clonedSchemeId },
    });
    return clonedSchemeId;
  }

  /**
   * Ownership/lineage of one deck, without the adoption side effect
   * ensureRealizationOwnedScheme carries — safe to call on plain reads.
   */
  async findSchemeSummaryById(schemeId: string) {
    return this.prisma.riskScheme.findUnique({
      where: { id: schemeId },
      select: { id: true, realizationId: true, sourceTemplateId: true },
    });
  }

  /**
   * The deck id an update should store. The realization editor's dropdown lists
   * templates only, so a realization that already owns a clone submits the
   * *template* it was cloned from. Storing that verbatim would send
   * ensureRealizationOwnedScheme off to clone the template again and strand
   * every edit made to the realization's own deck, so only a genuinely
   * different template counts as picking another deck. Mirrors the
   * isReusingCurrentScenarioInstance check on the Scenario side.
   */
  async resolveSelectedSchemeId({
    realizationId,
    requestedSchemeId,
    currentSchemeId,
  }: {
    realizationId: string;
    requestedSchemeId: string | null;
    currentSchemeId: string | null;
  }): Promise<string | null> {
    if (!requestedSchemeId || !currentSchemeId) {
      return requestedSchemeId ?? null;
    }
    if (requestedSchemeId === currentSchemeId) {
      return currentSchemeId;
    }

    const currentScheme = await this.findSchemeSummaryById(currentSchemeId);
    const isOwnedByThisRealization =
      currentScheme?.realizationId === realizationId;
    return isOwnedByThisRealization &&
      currentScheme?.sourceTemplateId === requestedSchemeId
      ? currentSchemeId
      : requestedSchemeId;
  }

  /** The realization's own deck with everything the admin editor renders. */
  async getRealizationScheme(realizationId: string) {
    const schemeId = await this.ensureRealizationOwnedScheme(realizationId);
    const scheme = await this.prisma.riskScheme.findUnique({
      where: { id: schemeId },
      include: RiskQuizService.schemeCategoriesInclude,
    });
    return scheme ? RiskQuizService.mapSchemeStations(scheme) : scheme;
  }

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
      // The one system message that comes from a real moment in the code rather
      // than being derived on read — this is the instant we learn the pool ran
      // dry for this team.
      await this.announceDeckExhausted({
        realizationId: realization.id,
        teamId: team.id,
        teamName: resolveRiskTeamDisplayName(team),
        categoryId: card.categoryId,
        categoryName: card.category.name,
        difficulty: card.difficulty,
      });

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

    // teamPoints rides along on every deck-status read: it is the only thing
    // the scan screen polls while idle, and a photo card approved by the Game
    // Master changes a team's score with nothing else to announce it.
    if (!realization.riskSchemeId) {
      return { categoryCount: 0, remainingCards: 0, teamPoints: team.points };
    }

    const schemeCategories = await this.prisma.riskSchemeCategory.findMany({
      where: { schemeId: realization.riskSchemeId },
      select: { categoryId: true },
    });
    const categoryIds = schemeCategories.map((item) => item.categoryId);

    if (categoryIds.length === 0) {
      return { categoryCount: 0, remainingCards: 0, teamPoints: team.points };
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
      teamPoints: team.points,
      photoReviews: await this.listTeamPhotoReviews(team.id),
    };
  }

  // Every card this team has sent for review — a photo or a free-text answer —
  // with its verdict (null while the Game Master has not decided). The scan
  // screen polls this to announce a decision that happened on somebody else's
  // screen.
  private async listTeamPhotoReviews(teamId: string) {
    const attempts = await this.prisma.riskAttempt.findMany({
      where: {
        teamId,
        station: {
          type: {
            in: [
              PrismaStationType.PHOTO_TASK,
              PrismaStationType.REVIEWED_ANSWER,
            ],
          },
        },
      },
      select: {
        stationId: true,
        isCorrect: true,
        pointsDelta: true,
        station: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return attempts.map((attempt) => ({
      stationId: attempt.stationId,
      stationName: attempt.station.name,
      isCorrect: attempt.isCorrect,
      // Nothing has been paid out while the verdict is missing.
      pointsDelta: attempt.isCorrect === null ? 0 : attempt.pointsDelta,
    }));
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
    const quiz = station.quizData as {
      question?: string;
      answers?: string[];
      correctAnswerIndex?: number;
      audioUrl?: string;
      acceptedAnswers?: string[];
      caesarShift?: number;
    } | null;
    const completionCodeLength =
      parseCompletionCode(station.completionCode)?.length ?? 0;

    // A reviewed-answer card keeps its answer key in quizData.answers[0] for the
    // Game Master's review panel. That key must never reach the tablet, and the
    // generic branch below would ship it: it forwards `answers` wholesale. The
    // question alone is all this card type renders, so send exactly that — and
    // note the generic branch also gates on Array.isArray(answers), which would
    // otherwise drop the question too on a card saved without a key.
    const isReviewedAnswer = station.type === PrismaStationType.REVIEWED_ANSWER;

    return {
      id: station.id,
      type: fromPrismaStationType(station.type),
      name: station.name,
      description: station.description,
      imageUrl: station.imageUrl,
      points: station.points,
      timeLimitSeconds: station.timeLimitSeconds,
      completionCodeLength:
        completionCodeLength > 0 ? completionCodeLength : undefined,
      completionCodeInputMode: resolveCompletionCodeInputMode(
        station.completionCode,
      ),
      // Full quiz payload (including the correct answer / secret) is exposed
      // here for every type now, not just quiz/audio-quiz — the mobile client
      // renders the real interactive station panels for non-answer-index
      // types (wordle, mastermind, ...), which need their secret client-side
      // the same way normal (non-risk-quiz) stations already do. Quiz/audio-
      // quiz correctness is still verified server-side in submitAnswer() via
      // resolveOutcome() below, so this doesn't change how those are scored.
      quiz: isReviewedAnswer
        ? quiz?.question
          ? { question: quiz.question }
          : undefined
        : quiz && Array.isArray(quiz.answers)
          ? {
              question: quiz.question,
              answers: quiz.answers,
              correctAnswerIndex: quiz.correctAnswerIndex,
              audioUrl: quiz.audioUrl,
              acceptedAnswers: quiz.acceptedAnswers,
              // caesar-cipher stations need the admin-set shift client-side,
              // otherwise the panel falls back to a derived one and shows a
              // different cipher than the admin previewed.
              ...(typeof quiz.caesarShift === 'number'
                ? { caesarShift: quiz.caesarShift }
                : {}),
            }
          : undefined,
    };
  }

  // Photo cards follow the same shape as a photo task in a normal realization:
  // the picture goes to storage and to the Game Master, who decides whether it
  // counts. The difference is where the outcome lives — RiskAttempt, created
  // here without one — and that the award is frozen now rather than at the
  // moment somebody clicks (see setCardOutcome).
  async submitPhotoTask(input: {
    sessionToken: string;
    cardId: string;
    stationId: string;
    file: Express.Multer.File;
  }) {
    const { team, realization } = await this.requireTeamSession(
      input.sessionToken,
    );
    const { card, station } = await this.requireCardStationPair(
      realization.id,
      input.cardId,
      input.stationId,
    );

    if (fromPrismaStationType(station.type) !== 'photo-task') {
      throw new BadRequestException(
        'This station does not accept photo submissions',
      );
    }

    const existingAttempt = await this.prisma.riskAttempt.findFirst({
      where: { teamId: team.id, stationId: station.id },
    });
    if (existingAttempt) {
      throw new BadRequestException('Station already attempted');
    }

    const uploaded = await this.stationStorageService.uploadTeamTaskPhoto(
      input.file,
      {
        realizationId: realization.id,
        teamId: team.id,
        stationId: station.id,
      },
    );

    const streak = (await this.getCurrentStreak(team.id)) + 1;
    const frozenAward = Math.round(
      RISK_DIFFICULTY_POINTS[card.difficulty].correct *
        this.resolveStreakMultiplier(streak),
    );

    await this.prisma.$transaction([
      this.prisma.teamPhoto.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          stationId: station.id,
          kind: 'TASK_PROOF',
          objectKey: uploaded.key,
          url: uploaded.url,
        },
      }),
      this.prisma.riskAttempt.create({
        data: {
          realizationId: realization.id,
          teamId: team.id,
          cardId: card.id,
          stationId: station.id,
          isCorrect: null,
          pointsDelta: frozenAward,
        },
      }),
    ]);

    return {
      status: 'pending' as const,
      photoUrl: uploaded.url,
      pendingPointsDelta: frozenAward,
      teamPoints: team.points,
    };
  }

  // The free-text twin of submitPhotoTask above: same "send it and wait for the
  // Game Master" lifecycle, same frozen award, only the payload differs. The
  // answer lives on the attempt itself rather than in storage, so there is no
  // second row to keep in step.
  async submitReviewedAnswer(input: {
    sessionToken: string;
    cardId: string;
    stationId: string;
    answerText: string;
  }) {
    const { team, realization } = await this.requireTeamSession(
      input.sessionToken,
    );
    const { card, station } = await this.requireCardStationPair(
      realization.id,
      input.cardId,
      input.stationId,
    );

    if (fromPrismaStationType(station.type) !== 'reviewed-answer') {
      throw new BadRequestException(
        'This station does not accept written answers',
      );
    }

    const answerText = input.answerText.trim();
    if (!answerText) {
      throw new BadRequestException('Answer is empty');
    }
    if (answerText.length > RISK_REVIEWED_ANSWER_MAX_LENGTH) {
      throw new BadRequestException('Answer is too long');
    }

    const existingAttempt = await this.prisma.riskAttempt.findFirst({
      where: { teamId: team.id, stationId: station.id },
    });
    if (existingAttempt) {
      throw new BadRequestException('Station already attempted');
    }

    const streak = (await this.getCurrentStreak(team.id)) + 1;
    const frozenAward = Math.round(
      RISK_DIFFICULTY_POINTS[card.difficulty].correct *
        this.resolveStreakMultiplier(streak),
    );

    await this.prisma.riskAttempt.create({
      data: {
        realizationId: realization.id,
        teamId: team.id,
        cardId: card.id,
        stationId: station.id,
        isCorrect: null,
        answerText,
        pointsDelta: frozenAward,
      },
    });

    return {
      status: 'pending' as const,
      pendingPointsDelta: frozenAward,
      teamPoints: team.points,
    };
  }

  private async requireCardStationPair(
    realizationId: string,
    cardId: string,
    stationId: string,
  ) {
    const [card, station] = await Promise.all([
      this.prisma.riskCard.findUnique({ where: { id: cardId } }),
      this.prisma.station.findUnique({ where: { id: stationId } }),
    ]);

    if (!card || card.realizationId !== realizationId) {
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

    return { card, station };
  }

  async submitAnswer(input: {
    sessionToken: string;
    cardId: string;
    stationId: string;
    selectedIndex?: number;
    completed?: boolean;
    completionCode?: string;
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

    // "Na czas"/"na punkty" cards are only solved by typing the code the
    // organizer hands out at the spot, exactly like the same station types in a
    // normal realization (see MobileService.completeTask). Without this the
    // card was claimed by whatever the player typed — the mobile client has no
    // way to check a code itself. Only a claimed success is checked: giving up
    // or running out of time reports completed=false and carries no code.
    // The message is matched verbatim by the mobile code panel
    // (isInvalidCompletionCodeErrorMessage), which shakes the input and lets
    // the player try again instead of burning the card.
    // fromPrismaStationType, not station.type: the helper speaks the mobile
    // client's kebab-case ('time'/'points'), and the raw enum would never match
    // — the same trap ANSWER_INDEX_STATION_TYPES above was written to avoid.
    if (
      isCodeProtectedStationType(fromPrismaStationType(station.type)) &&
      input.completed === true
    ) {
      const expectedCode = parseCompletionCode(station.completionCode);
      const inputCode = parseCompletionCode(input.completionCode);
      if (!expectedCode || !inputCode || expectedCode !== inputCode) {
        throw new BadRequestException('Invalid completion code');
      }
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
      // A photo card still waiting for the Game Master is undecided, so it
      // neither extends the streak nor breaks it — the team should not lose a
      // run because nobody has looked at its photo yet.
      if (attempt.isCorrect === null) {
        continue;
      }
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

  // --- Chat: one shared room per realization ---

  /**
   * Everything the room holds since `afterId` (or the tail of the history on a
   * cold open), with the system messages brought up to date first.
   *
   * Deriving the system messages here rather than at each point where the game
   * state changes is deliberate: team points move in five different places and
   * "the game ended" is not written down anywhere at all — it is computed from
   * the clock. One derivation on read cannot drift out of step with them.
   */
  async listChatMessages(input: { sessionToken: string; afterId?: string }) {
    const { team, realization } = await this.requireTeamSession(
      input.sessionToken,
    );
    return this.readRoom(realization, input.afterId, team.id);
  }

  async listChatMessagesForAdmin(input: {
    realizationId: string;
    afterId?: string;
  }) {
    const realization = await this.requireRealizationOrThrow(
      input.realizationId,
    );
    return this.readRoom(realization, input.afterId, null);
  }

  async postTeamChatMessage(input: { sessionToken: string; content: string }) {
    const { team, realization } = await this.requireTeamSession(
      input.sessionToken,
    );

    if (!realization.riskChatEnabled) {
      throw new BadRequestException('Chat is disabled for this realization');
    }
    if (!realization.riskChatTeamsCanPost) {
      throw new BadRequestException('Teams cannot post in this chat');
    }

    return this.createMessage({
      realizationId: realization.id,
      authorKind: RiskChatAuthorKind.TEAM,
      teamId: team.id,
      authorName: resolveRiskTeamDisplayName(team),
      content: this.requireChatContent(input.content),
    });
  }

  async postGameMasterChatMessage(input: {
    realizationId: string;
    content: string;
  }) {
    const realization = await this.requireRealizationOrThrow(
      input.realizationId,
    );
    // The Game Master posts even with team posting turned off — that switch is
    // exactly how an announcements-only channel is set up.
    if (!realization.riskChatEnabled) {
      throw new BadRequestException('Chat is disabled for this realization');
    }

    return this.createMessage({
      realizationId: realization.id,
      authorKind: RiskChatAuthorKind.GAME_MASTER,
      teamId: null,
      authorName: 'Mistrz Gry',
      content: this.requireChatContent(input.content),
    });
  }

  private async readRoom(
    realization: { id: string; riskChatEnabled: boolean; riskChatTeamsCanPost: boolean },
    afterId: string | undefined,
    // Who is reading, so the tablet can tell its own lines apart without having
    // to know its team id from anywhere else — the mobile session does not
    // carry one. Null for the admin panel.
    currentTeamId: string | null,
  ) {
    if (!realization.riskChatEnabled) {
      return {
        enabled: false as const,
        canPost: false,
        currentTeamId,
        messages: [],
      };
    }

    await this.syncSystemMessages(realization.id);

    const after = afterId
      ? await this.prisma.riskChatMessage.findUnique({
          where: { id: afterId },
          select: { createdAt: true },
        })
      : null;

    // Ordered oldest-first when returned, but the cold-open tail has to be taken
    // from the newest end — hence the descending fetch and the reverse below.
    const rows = after
      ? await this.prisma.riskChatMessage.findMany({
          where: {
            realizationId: realization.id,
            createdAt: { gt: after.createdAt },
          },
          orderBy: { createdAt: 'asc' },
          include: { team: { select: { color: true, badgeImageUrl: true } } },
        })
      : (
          await this.prisma.riskChatMessage.findMany({
            where: { realizationId: realization.id },
            orderBy: { createdAt: 'desc' },
            take: RISK_CHAT_HISTORY_LIMIT,
            include: { team: { select: { color: true, badgeImageUrl: true } } },
          })
        ).reverse();

    return {
      enabled: true as const,
      canPost: realization.riskChatTeamsCanPost,
      currentTeamId,
      messages: rows.map((row) => ({
        id: row.id,
        authorKind: row.authorKind,
        teamId: row.teamId,
        authorName: row.authorName,
        content: row.content,
        systemEvent: row.systemEvent,
        teamColor: row.team?.color ?? null,
        teamBadgeImageUrl: row.team?.badgeImageUrl ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  private requireChatContent(value: string) {
    const content = value.trim();
    if (!content) {
      throw new BadRequestException('Message is empty');
    }
    if (content.length > RISK_CHAT_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException('Message is too long');
    }
    return content;
  }

  private async createMessage(data: {
    realizationId: string;
    authorKind: RiskChatAuthorKind;
    teamId: string | null;
    authorName: string;
    content: string;
    systemEvent?: string;
    dedupeKey?: string;
  }) {
    // Same shape readRoom returns, colour included. The sender renders its own
    // message from this response rather than waiting for the next poll — and
    // that poll only asks for messages *newer* than the one it already holds,
    // so anything missing here would never be filled in later.
    const row = await this.prisma.riskChatMessage.create({
      data,
      include: { team: { select: { color: true, badgeImageUrl: true } } },
    });
    return {
      id: row.id,
      authorKind: row.authorKind,
      teamId: row.teamId,
      authorName: row.authorName,
      content: row.content,
      systemEvent: row.systemEvent,
      teamColor: row.team?.color ?? null,
      teamBadgeImageUrl: row.team?.badgeImageUrl ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Writes a system message unless the room already holds one with the same
   * dedupe key.
   *
   * Every tablet polling the room re-derives the same events at the same time,
   * so this races with itself by design. The unique index on
   * (realizationId, dedupeKey) is what settles it: the loser of the race gets a
   * P2002 and we swallow it, which is cheaper and more reliable than locking.
   */
  private async announceSystemMessage(input: {
    realizationId: string;
    teamId: string | null;
    systemEvent: string;
    dedupeKey: string;
    content: string;
  }) {
    try {
      await this.prisma.riskChatMessage.create({
        data: {
          realizationId: input.realizationId,
          authorKind: RiskChatAuthorKind.SYSTEM,
          teamId: input.teamId,
          authorName: 'System',
          content: input.content,
          systemEvent: input.systemEvent,
          dedupeKey: input.dedupeKey,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  // Public so scanCard can announce an exhausted pool, which is the one event
  // that IS a real moment in the code rather than something derived on read.
  async announceDeckExhausted(input: {
    realizationId: string;
    teamId: string;
    teamName: string;
    categoryId: string;
    categoryName: string;
    difficulty: RiskDifficulty;
  }) {
    await this.announceSystemMessage({
      realizationId: input.realizationId,
      teamId: input.teamId,
      systemEvent: RISK_CHAT_SYSTEM_EVENTS.deckExhausted,
      dedupeKey: `${RISK_CHAT_SYSTEM_EVENTS.deckExhausted}:${input.teamId}:${input.categoryId}:${input.difficulty}`,
      content: `${input.teamName} wyczerpała karty w kategorii „${input.categoryName}”.`,
    });
  }

  private async syncSystemMessages(realizationId: string) {
    const realization = await this.prisma.realization.findUnique({
      where: { id: realizationId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        durationMinutes: true,
      },
    });
    if (!realization) {
      return;
    }

    if (realization.startedAt) {
      await this.announceSystemMessage({
        realizationId,
        teamId: null,
        systemEvent: RISK_CHAT_SYSTEM_EVENTS.gameStart,
        dedupeKey: RISK_CHAT_SYSTEM_EVENTS.gameStart,
        content: 'Gra rozpoczęta. Powodzenia!',
      });
    }

    const hasEnded =
      realization.status === 'DONE' ||
      (realization.startedAt !== null &&
        realization.startedAt.getTime() +
          realization.durationMinutes * 60_000 <=
          Date.now());
    if (hasEnded) {
      await this.announceSystemMessage({
        realizationId,
        teamId: null,
        systemEvent: RISK_CHAT_SYSTEM_EVENTS.gameEnd,
        dedupeKey: RISK_CHAT_SYSTEM_EVENTS.gameEnd,
        content: 'Koniec gry. Dziękujemy za grę!',
      });
    }

    // Only while the game is actually running: announcing a leader before the
    // start or after the finish is noise.
    if (!realization.startedAt || hasEnded) {
      return;
    }

    // Same ordering the leaderboard uses elsewhere (points desc, then slot).
    const leader = await this.prisma.team.findFirst({
      where: { realizationId },
      orderBy: [{ points: 'desc' }, { slotNumber: 'asc' }],
      select: { id: true, name: true, slotNumber: true, points: true },
    });
    if (!leader || leader.points <= 0) {
      return;
    }

    const lastLeadChange = await this.prisma.riskChatMessage.findFirst({
      where: {
        realizationId,
        systemEvent: RISK_CHAT_SYSTEM_EVENTS.leadChange,
      },
      orderBy: { createdAt: 'desc' },
      select: { teamId: true },
    });
    if (lastLeadChange?.teamId === leader.id) {
      return;
    }

    const leaderName = resolveRiskTeamDisplayName(leader);
    await this.announceSystemMessage({
      realizationId,
      teamId: leader.id,
      systemEvent: RISK_CHAT_SYSTEM_EVENTS.leadChange,
      // Scored into the key so the same team retaking the lead later announces
      // again, while a repeated poll at the same score stays silent.
      dedupeKey: `${RISK_CHAT_SYSTEM_EVENTS.leadChange}:${leader.id}:${leader.points}`,
      content: `${leaderName} wychodzi na prowadzenie (${leader.points} pkt).`,
    });
  }

  // --- Świnie: przeszkadzajki rzucane między drużynami ---

  async getPigState(input: { sessionToken: string }) {
    const { team, realization } = await this.requireTeamSession(
      input.sessionToken,
    );

    if (!realization.pigsEnabled) {
      return {
        enabled: false as const,
        held: null,
        incoming: null,
        targets: [],
      };
    }

    await this.syncPigGrants(realization.id);
    return this.readPigState(
      realization.id,
      team.id,
      realization.pigShowThrowerName,
    );
  }

  async listPigStateForAdmin(realizationId: string) {
    const realization = await this.requireRealizationOrThrow(realizationId);
    if (!realization.pigsEnabled) {
      return { enabled: false as const, teams: [] };
    }

    await this.syncPigGrants(realization.id);

    const now = new Date();
    const [teams, held, effects] = await Promise.all([
      this.prisma.team.findMany({
        where: { realizationId },
        orderBy: { slotNumber: 'asc' },
        select: { id: true, name: true, slotNumber: true, points: true },
      }),
      this.prisma.riskPig.findMany({ where: { realizationId } }),
      this.prisma.riskPigEffect.findMany({
        where: { realizationId, expiresAt: { gt: now } },
      }),
    ]);

    const heldByTeam = new Map(held.map((pig) => [pig.ownerTeamId, pig]));
    const effectByTeam = new Map(
      effects.map((effect) => [effect.targetTeamId, effect]),
    );

    return {
      enabled: true as const,
      teams: teams.map((item) => {
        const effect = effectByTeam.get(item.id);
        return {
          teamId: item.id,
          teamName: resolveRiskTeamDisplayName(item),
          points: item.points,
          heldPigType: heldByTeam.get(item.id)?.type ?? null,
          activePigType: effect?.type ?? null,
          activeFromName: effect?.fromName ?? null,
          activeSecondsLeft: effect
            ? Math.max(
                0,
                Math.ceil((effect.expiresAt.getTime() - now.getTime()) / 1000),
              )
            : null,
        };
      }),
    };
  }

  async throwPig(input: { sessionToken: string; targetTeamId?: string }) {
    const { team, realization } = await this.requireTeamSession(
      input.sessionToken,
    );

    if (!realization.pigsEnabled) {
      throw new BadRequestException('Pigs are disabled for this realization');
    }

    const held = await this.prisma.riskPig.findUnique({
      where: { ownerTeamId: team.id },
    });
    if (!held) {
      throw new BadRequestException('This team holds no pig');
    }

    const available = await this.listAvailablePigTargets(
      realization.id,
      team.id,
    );
    if (available.length === 0) {
      throw new BadRequestException('No team can be targeted right now');
    }

    // Omitting the target means "pick for me" — the picker offers that as a
    // button, and it is also the fallback the client uses when the chosen team
    // got hit by somebody else between rendering the list and tapping.
    const target = input.targetTeamId
      ? available.find((item) => item.id === input.targetTeamId)
      : available[Math.floor(Math.random() * available.length)];
    if (!target) {
      throw new BadRequestException('This team cannot be targeted right now');
    }

    const fromName = resolveRiskTeamDisplayName(team);
    const expiresAt = new Date(
      Date.now() + realization.pigEffectSeconds * 1000,
    );

    await this.prisma.$transaction([
      this.prisma.riskPig.delete({ where: { id: held.id } }),
      this.prisma.riskPigEffect.create({
        data: {
          realizationId: realization.id,
          targetTeamId: target.id,
          fromTeamId: team.id,
          fromName,
          type: held.type,
          expiresAt,
        },
      }),
    ]);

    await this.announcePigThrow({
      realizationId: realization.id,
      targetTeamId: target.id,
      fromName,
      showThrowerName: realization.pigShowThrowerName,
      targetName: resolveRiskTeamDisplayName(target),
      type: held.type,
    });

    return this.readPigState(
      realization.id,
      team.id,
      realization.pigShowThrowerName,
    );
  }

  async throwPigAsGameMaster(input: {
    realizationId: string;
    targetTeamId: string;
    type: RiskPigType;
  }) {
    const realization = await this.requireRealizationOrThrow(
      input.realizationId,
    );
    if (!realization.pigsEnabled) {
      throw new BadRequestException('Pigs are disabled for this realization');
    }

    const target = await this.prisma.team.findUnique({
      where: { id: input.targetTeamId },
      select: { id: true, name: true, slotNumber: true, realizationId: true },
    });
    if (!target || target.realizationId !== realization.id) {
      throw new NotFoundException('Team not found');
    }

    // The Game Master overwrites whatever is running rather than being told the
    // team is busy — a manual throw is a deliberate act, not part of the
    // economy the availability rule exists to balance.
    await this.prisma.riskPigEffect.deleteMany({
      where: { targetTeamId: target.id },
    });
    await this.prisma.riskPigEffect.create({
      data: {
        realizationId: realization.id,
        targetTeamId: target.id,
        fromTeamId: null,
        fromName: 'Mistrz Gry',
        type: input.type,
        expiresAt: new Date(Date.now() + realization.pigEffectSeconds * 1000),
      },
    });

    await this.announcePigThrow({
      realizationId: realization.id,
      targetTeamId: target.id,
      fromName: 'Mistrz Gry',
      // The Game Master is never anonymous: an announcement from the host is
      // the one case where knowing the source is the whole point.
      showThrowerName: true,
      targetName: resolveRiskTeamDisplayName(target),
      type: input.type,
    });

    return this.listPigStateForAdmin(realization.id);
  }

  private async readPigState(
    realizationId: string,
    teamId: string,
    showThrowerName: boolean,
  ) {
    const now = new Date();
    const [held, incoming, targets] = await Promise.all([
      this.prisma.riskPig.findUnique({ where: { ownerTeamId: teamId } }),
      this.prisma.riskPigEffect.findUnique({
        where: { targetTeamId: teamId },
      }),
      this.listPigTargets(realizationId, teamId),
    ]);

    return {
      enabled: true as const,
      held: held ? { type: held.type } : null,
      incoming:
        incoming && incoming.expiresAt.getTime() > now.getTime()
          ? {
              type: incoming.type,
              // Masked for the victim only — the stored row keeps the real name
              // so the Game Master's panel can still say who threw it.
              fromName: showThrowerName ? incoming.fromName : null,
              // An absolute instant rather than a countdown: the tablet ticks
              // between five-second polls, and counting down a number the
              // client also mutates makes the timer drift and forces an effect
              // to depend on something it changes itself.
              expiresAt: incoming.expiresAt.toISOString(),
            }
          : null,
      targets,
    };
  }

  private async listPigTargets(realizationId: string, teamId: string) {
    const now = new Date();
    const [teams, effects] = await Promise.all([
      this.prisma.team.findMany({
        where: { realizationId, id: { not: teamId } },
        orderBy: { slotNumber: 'asc' },
        select: { id: true, name: true, slotNumber: true, color: true },
      }),
      this.prisma.riskPigEffect.findMany({
        where: { realizationId, expiresAt: { gt: now } },
        select: { targetTeamId: true },
      }),
    ]);

    const busy = new Set(effects.map((effect) => effect.targetTeamId));
    return teams.map((item) => ({
      teamId: item.id,
      teamName: resolveRiskTeamDisplayName(item),
      teamColor: item.color,
      // A team already under a pig is greyed out rather than hidden: seeing that
      // somebody is currently having a bad time is half the fun.
      isAvailable: !busy.has(item.id),
    }));
  }

  private async listAvailablePigTargets(realizationId: string, teamId: string) {
    const now = new Date();
    const [teams, effects] = await Promise.all([
      this.prisma.team.findMany({
        where: { realizationId, id: { not: teamId } },
        select: { id: true, name: true, slotNumber: true },
      }),
      this.prisma.riskPigEffect.findMany({
        where: { realizationId, expiresAt: { gt: now } },
        select: { targetTeamId: true },
      }),
    ]);

    const busy = new Set(effects.map((effect) => effect.targetTeamId));
    return teams.filter((item) => !busy.has(item.id));
  }

  private async announcePigThrow(input: {
    realizationId: string;
    targetTeamId: string;
    fromName: string;
    showThrowerName: boolean;
    targetName: string;
    type: RiskPigType;
  }) {
    await this.announceSystemMessage({
      realizationId: input.realizationId,
      teamId: input.targetTeamId,
      systemEvent: RISK_CHAT_SYSTEM_EVENTS.pigThrown,
      // Unique per throw: unlike the derived events, this one is a real moment
      // and every single one of them belongs in the room's history.
      dedupeKey: `${RISK_CHAT_SYSTEM_EVENTS.pigThrown}:${randomUUID()}`,
      // Composed once, at throw time: a chat line is history and cannot be
      // masked retroactively if the setting changes later in the game.
      content: input.showThrowerName
        ? `${input.fromName} rzuca świnię „${RISK_PIG_LABELS[input.type]}” w drużynę ${input.targetName}!`
        : `Ktoś rzuca świnię „${RISK_PIG_LABELS[input.type]}” w drużynę ${input.targetName}!`,
    });
  }

  /**
   * Hands out pigs for every grant tick that has come due since the last read.
   *
   * There is no scheduler in this backend, so this runs off the polls instead —
   * the same approach the chat's system messages use. Every tablet re-derives
   * the same tick at the same time, so the unique index on
   * (realizationId, teamId, tickKey) is what settles the race: whoever inserts
   * the grant row first is the one that creates the pig.
   */
  private async syncPigGrants(realizationId: string) {
    const realization = await this.prisma.realization.findUnique({
      where: { id: realizationId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        durationMinutes: true,
        pigsEnabled: true,
        pigGrantIntervalMinutes: true,
        pigTypesEnabled: true,
      },
    });
    if (
      !realization?.pigsEnabled ||
      !realization.startedAt ||
      realization.status === 'DONE' ||
      realization.pigGrantIntervalMinutes <= 0
    ) {
      return;
    }

    const endsAt =
      realization.startedAt.getTime() + realization.durationMinutes * 60_000;
    if (Date.now() >= endsAt) {
      return;
    }

    const intervalMs = realization.pigGrantIntervalMinutes * 60_000;
    const elapsed = Date.now() - realization.startedAt.getTime();
    // Tick 0 is the moment the game starts; the first hand-out is one whole
    // interval later, so nobody is throwing pigs before anyone has played.
    const tickIndex = Math.floor(elapsed / intervalMs);
    if (tickIndex < 1) {
      return;
    }

    const tickKey = `tick:${tickIndex}`;
    const teams = await this.prisma.team.findMany({
      where: { realizationId },
      select: { id: true, points: true, slotNumber: true },
    });
    if (teams.length < 2) {
      return;
    }

    const grantCounts = await this.prisma.riskPigGrant.groupBy({
      by: ['teamId'],
      where: { realizationId },
      _count: { teamId: true },
    });
    const receivedByTeam = new Map(
      grantCounts.map((row) => [row.teamId, row._count.teamId]),
    );

    const weakestCount = Math.max(
      1,
      Math.round(teams.length * RISK_PIG_WEAKEST_FRACTION),
    );
    const weakest = [...teams].sort(
        (a, b) => a.points - b.points || a.slotNumber - b.slotNumber,
      )
      .slice(0, weakestCount);
    const weakestIds = new Set(weakest.map((item) => item.id));

    // The "random" slot, chosen from whoever has received the fewest pigs so
    // far. Ties break on a hash of (tick, team) rather than Math.random so two
    // tablets syncing the same tick agree on the winner — and so the order
    // still looks arbitrary instead of marching down the slot numbers.
    const wildcards = teams
      .filter((item) => !weakestIds.has(item.id))
      .sort((a, b) => {
        const received =
          (receivedByTeam.get(a.id) ?? 0) - (receivedByTeam.get(b.id) ?? 0);
        if (received !== 0) {
          return received;
        }
        return (
          stableTieBreak(tickKey, a.id) - stableTieBreak(tickKey, b.id)
        );
      })
      .slice(0, RISK_PIG_WILDCARD_COUNT);

    const pool =
      realization.pigTypesEnabled.length > 0
        ? realization.pigTypesEnabled
        : RISK_PIG_TYPES;

    for (const recipient of [...weakest, ...wildcards]) {
      try {
        // Grant row first: it is the unique-guarded one, so winning it is what
        // earns the right to create the pig.
        await this.prisma.riskPigGrant.create({
          data: { realizationId, teamId: recipient.id, tickKey },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }

      // Holding is capped at one, so a team sitting on an unused pig simply
      // skips this round rather than stockpiling.
      const alreadyHolding = await this.prisma.riskPig.findUnique({
        where: { ownerTeamId: recipient.id },
      });
      if (alreadyHolding) {
        continue;
      }

      await this.prisma.riskPig.create({
        data: {
          realizationId,
          ownerTeamId: recipient.id,
          type: pool[Math.floor(Math.random() * pool.length)],
        },
      });
    }
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

  // A pool row ships its station mapped exactly like GET /station, not as the
  // raw Prisma row. Two reasons, both load bearing for the admin editor:
  // `type` has to be the kebab-case string the admin uses (the raw row carries
  // the SCREAMING_CASE enum), and a realization-owned deck's stations exist
  // nowhere else the admin can reach — GET /station lists templates only — so
  // this response is the only source for their editable content.
  private static mapCategoryStations<
    TCategory extends { poolStations: { station: PrismaStationRow }[] },
  >(category: TCategory) {
    return {
      ...category,
      poolStations: category.poolStations.map((poolStation) => ({
        ...poolStation,
        station: mapStation(poolStation.station),
      })),
    };
  }

  private static mapSchemeStations<
    TScheme extends {
      schemeCategories: {
        category: { poolStations: { station: PrismaStationRow }[] };
      }[];
    },
  >(scheme: TScheme) {
    return {
      ...scheme,
      schemeCategories: scheme.schemeCategories.map((schemeCategory) => ({
        ...schemeCategory,
        category: RiskQuizService.mapCategoryStations(schemeCategory.category),
      })),
    };
  }

  // --- Schemes ("talie") — assemble existing Categories, same relationship
  // shape as Scenario -> Station: a scheme assigns, it doesn't own content. ---

  async listSchemes() {
    const schemes = await this.prisma.riskScheme.findMany({
      // Templates only — realization-owned clones are reached through
      // getRealizationScheme(), never through the shared library.
      where: { realizationId: null },
      orderBy: { name: 'asc' },
      include: RiskQuizService.schemeCategoriesInclude,
    });
    return schemes.map((scheme) => RiskQuizService.mapSchemeStations(scheme));
  }

  async createScheme(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Scheme name is required');
    }
    return RiskQuizService.mapSchemeStations(
      await this.prisma.riskScheme.create({
        data: { name: trimmed },
        include: RiskQuizService.schemeCategoriesInclude,
      }),
    );
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
      const schemeCategory = await this.prisma.riskSchemeCategory.create({
        data: { schemeId, categoryId, order: count },
        include: { category: { include: RiskQuizService.poolStationsInclude } },
      });
      return {
        ...schemeCategory,
        category: RiskQuizService.mapCategoryStations(schemeCategory.category),
      };
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
    const categories = await this.prisma.riskCategory.findMany({
      // Templates only — see listSchemes().
      where: { realizationId: null },
      orderBy: { name: 'asc' },
      include: RiskQuizService.poolStationsInclude,
    });
    return categories.map((category) =>
      RiskQuizService.mapCategoryStations(category),
    );
  }

  async createCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Category name is required');
    }
    const codeSlug = await this.generateUniqueCategoryCodeSlug(trimmed);
    return RiskQuizService.mapCategoryStations(
      await this.prisma.riskCategory.create({
        data: { name: trimmed, codeSlug },
        include: RiskQuizService.poolStationsInclude,
      }),
    );
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

  // Finds a codeSlug for `name` that isn't already taken by another TEMPLATE
  // category, appending -2, -3, ... on collision (e.g. two names that slugify
  // the same). Only templates are considered: realization-owned clones
  // deliberately duplicate their source's slug (that is what keeps printed QR
  // stickers portable across realizations), so counting them as collisions
  // would push every new template onto a needless -2 suffix.
  private async generateUniqueCategoryCodeSlug(
    name: string,
    excludeCategoryId?: string,
  ): Promise<string> {
    const baseSlug = slugify(name);
    let candidate = baseSlug;
    let suffix = 1;

    for (;;) {
      const existing = await this.prisma.riskCategory.findFirst({
        where: { codeSlug: candidate, realizationId: null },
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

    // Ryzykanci must stay fully separate from the normal game: a station that
    // belongs to a scenario instance tracks its progress via TeamTaskProgress,
    // keyed by that row's id. If the same row were also referenced by a
    // RiskPoolStation, admin resets of one system (e.g. resetMobileAdminTeamTask)
    // would silently leave the other's progress (RiskAttempt) stale, since
    // neither reset touches both tables.
    //
    // Scenario membership is the real disqualifier — NOT realizationId, which a
    // legitimately risk-owned station now carries too (see
    // cloneSchemeForRealization). A realization-owned risk station is fine as
    // long as it belongs to the same realization as the category receiving it.
    if (station.scenarioInstanceId !== null) {
      throw new BadRequestException(
        'Stanowisko należące do scenariusza nie może trafić do puli Ryzykantów.',
      );
    }

    if (RISK_EXCLUDED_STATION_TYPES.has(station.type)) {
      throw new BadRequestException(
        'Ten typ zadania nie jest dostępny w Ryzykantach.',
      );
    }

    const category = await this.prisma.riskCategory.findUnique({
      where: { id: input.categoryId },
      select: { realizationId: true },
    });
    if (!category) {
      throw new BadRequestException('Category not found');
    }
    if (
      station.realizationId !== null &&
      station.realizationId !== category.realizationId
    ) {
      throw new BadRequestException(
        'Stanowisko należy do innej realizacji niż ta pula.',
      );
    }

    let created: PrismaRiskPoolStationRow & { station: PrismaStationRow };
    try {
      created = await this.prisma.riskPoolStation.create({
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

    return { ...created, station: mapStation(created.station) };
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

        for (let index = 1; index <= RISK_CARDS_PER_POOL; index += 1) {
          const code = buildRiskCardCode(categorySlug, difficulty, index);
          if (existingCodes.has(code)) continue;

          await this.prisma.riskCard.create({
            data: { realizationId, categoryId: category.id, difficulty, code },
          });
        }
      }
    }

    return this.listCards(realizationId);
  }

  /**
   * Printable card codes for a deck in the library, derived rather than read:
   * a template scheme owns no RiskCard rows (those are per realization), but
   * codes are deterministic from (category slug, difficulty, index), so the
   * stickers can be printed once from the library and stay valid in every
   * realization built from this deck.
   *
   * Shares buildRiskCardCode() with generateMissingCards() on purpose — two
   * copies of the format would drift and silently invalidate printed sheets.
   */
  async listSchemeCardCodes(schemeId: string) {
    const scheme = await this.prisma.riskScheme.findUnique({
      where: { id: schemeId },
    });
    if (!scheme) {
      throw new NotFoundException('Scheme not found');
    }

    const schemeCategories = await this.prisma.riskSchemeCategory.findMany({
      where: { schemeId },
      include: { category: true },
      orderBy: { order: 'asc' },
    });

    const codes: {
      categoryId: string;
      categoryName: string;
      difficulty: RiskDifficulty;
      code: string;
    }[] = [];

    for (const { category } of schemeCategories) {
      const categorySlug = await this.ensureCategoryCodeSlug(category);
      for (const difficulty of RISK_DIFFICULTY_ORDER) {
        for (let index = 1; index <= RISK_CARDS_PER_POOL; index += 1) {
          codes.push({
            categoryId: category.id,
            categoryName: category.name,
            difficulty,
            code: buildRiskCardCode(categorySlug, difficulty, index),
          });
        }
      }
    }

    return codes;
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
      select: { pointsDelta: true, isCorrect: true },
    });

    if (attempts.length === 0) {
      await this.prisma.riskPendingDraw.deleteMany({ where: { teamId } });
      return { teamId, resetCount: 0, pointsAdjusted: 0 };
    }

    // Undecided photo cards carry their frozen award in pointsDelta but that
    // award never reached the team, so taking it away here would leave the team
    // short by exactly the amount it was never given.
    const pointsToRemove = attempts.reduce(
      (sum, attempt) => (attempt.isCorrect === null ? sum : sum + attempt.pointsDelta),
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
        // A photo card waiting for the Game Master is neither passed nor
        // failed — same "in-progress" the classic board uses for a submitted
        // photo, so the admin table reads identically in both games.
        const status: 'todo' | 'in-progress' | 'done' | 'failed' = !attempt
          ? 'todo'
          : attempt.isCorrect === null
            ? 'in-progress'
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
          // The frozen award is not on the team's account yet, so show nothing
          // until the verdict lands.
          pointsAwarded: attempt && attempt.isCorrect !== null ? attempt.pointsDelta : 0,
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
    const existingAttempt = await this.prisma.riskAttempt.findFirst({
      where: { teamId, stationId },
    });

    // Approving a card the team sent for review — a photo or a written answer —
    // pays what it locked in at that moment (difficulty points times the streak
    // multiplier back then), not the flat rate an out-of-band admin override
    // uses. Otherwise the award would depend on how long the Game Master took
    // to look at it.
    const isPendingReviewDecision =
      existingAttempt !== null && existingAttempt.isCorrect === null;
    const pointsDelta = isCorrect
      ? isPendingReviewDecision
        ? existingAttempt.pointsDelta
        : RISK_DIFFICULTY_POINTS[poolStation.difficulty].correct
      : RISK_DIFFICULTY_POINTS[poolStation.difficulty].incorrect;

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
    existingAttempt: { id: string; pointsDelta: number; isCorrect: boolean | null },
    isCorrect: boolean,
    pointsDelta: number,
    teamId: string,
  ) {
    // An undecided attempt's pointsDelta was frozen, not paid out, so there is
    // nothing to take back before paying the decided amount.
    const alreadyApplied =
      existingAttempt.isCorrect === null ? 0 : existingAttempt.pointsDelta;
    const pointsAdjustment = pointsDelta - alreadyApplied;
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

    // Treat remote launch as a latest-command-wins signal. Repeated clicks
    // replace a command that the tablet has not consumed yet instead of
    // forcing the admin through a misleading "cancel active card" state.
    return this.prisma.riskPendingDraw.upsert({
      where: { teamId },
      create: { teamId, cardId: card.id, stationId: chosen.stationId },
      update: { cardId: card.id, stationId: chosen.stationId },
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
