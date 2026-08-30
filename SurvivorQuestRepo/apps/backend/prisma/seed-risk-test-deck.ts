import { PrismaClient, RiskDifficulty, StationType } from '@prisma/client';

const prisma = new PrismaClient();

const STATION_TIME_LIMIT_SECONDS = 60;
const STATION_POINTS = 100;
const SCHEME_NAME = 'TEST — Wszystkie stanowiska';

// Mirrors the fixed "technical" placeholder prompts used by the admin create-station
// form for types whose real puzzle content is generated client-side on mobile — see
// apps/admin/src/features/games/station.utils.ts (MEMORY_SYSTEM_STATION_PROMPT,
// MATCHING_SYSTEM_STATION_PROMPT).
const MEMORY_SYSTEM_STATION_PROMPT = 'Znajdź wszystkie pary ikon w maksymalnie 6 pomyłkach.';
const MATCHING_SYSTEM_STATION_PROMPT =
  'Twoim zadaniem jest poprawnie dopasować elementy z lewej i prawej strony zgodnie z poleceniem.';
const TRUE_FALSE_SYSTEM_STATION_PROMPT =
  'Oznaczcie każde zdanie jako prawdziwe lub fałszywe.';

// Excluded on purpose: strong-password, mini-sudoku, qr-hunt and rebus don't
// make sense as risk-quiz cards — the risk-quiz mobile screen scores
// quiz/audio-quiz server-side (see ANSWER_INDEX_TYPES in
// apps/mobile/src/features/risk-quiz/ui/risk-quiz-screen.tsx); every other
// type falls back to a plain description + "Ukończone/Poddaję się" self-report,
// which doesn't work for these (rebus needs an image we don't have here, and
// strong-password/mini-sudoku/qr-hunt need their own dedicated interaction).

// The DB-persisted shape of Station.quizData — see toPrismaStationQuizData /
// parseStationQuizData in apps/backend/src/modules/station/mappers/station.mapper.ts.
// For "word puzzle" types (wordle, hangman, mastermind, anagram, caesar-cipher,
// memory, simon, rebus, boggle, mini-sudoku, strong-password) only `question` is
// meaningful — it holds the actual secret/sequence/prompt — while `answers` is
// force-filled with the secret plus filler options, matching
// normalizeStationQuizForType() in apps/admin/src/features/games/station.utils.ts.
type QuizPayload = {
  question: string;
  answers: [string, string, string, string];
  correctAnswerIndex: number;
  acceptedAnswers?: string[];
  audioUrl?: string;
};

function secretQuiz(secret: string): QuizPayload {
  return { question: secret, answers: [secret, 'A', 'B', 'C'], correctAnswerIndex: 0 };
}

type StationDef = {
  prismaType: StationType;
  categoryName: string;
  stationName: string;
  description: string;
  imageUrl?: string;
  quizData?: QuizPayload;
  completionCode?: string;
  qrScanCodes?: string[];
};

const STATION_DEFS: StationDef[] = [
  {
    prismaType: StationType.QUIZ,
    categoryName: 'TEST — Quiz',
    stationName: 'TEST — Quiz',
    description: 'Testowe pytanie quizowe.',
    quizData: {
      question: 'Ile stanowisk jest w talii testowej?',
      answers: ['19', '10', '5', '25'],
      correctAnswerIndex: 0,
    },
  },
  {
    prismaType: StationType.AUDIO_QUIZ,
    categoryName: 'TEST — Quiz audio',
    stationName: 'TEST — Quiz audio',
    description: 'Testowe pytanie quizu audio.',
    quizData: {
      question: 'Testowe pytanie quizu audio — wybierz dowolną odpowiedź.',
      answers: ['Poprawna', 'Błędna 1', 'Błędna 2', 'Błędna 3'],
      correctAnswerIndex: 0,
      // Free, publicly hosted sample clip — just for exercising playback in
      // the test deck, not real quiz content. (w3schools' horse.mp3 used to
      // be here but now 403s on direct fetches — verified this one with
      // curl before using it.)
      audioUrl: 'https://download.samplelib.com/mp3/sample-3s.mp3',
    },
  },
  {
    prismaType: StationType.OPEN_QUIZ,
    categoryName: 'TEST — Quiz otwarty',
    stationName: 'TEST — Quiz otwarty',
    description: 'Testowe pytanie otwarte.',
    // Free, publicly hosted photo — just to exercise the "real image set"
    // layout path (media panel shows the photo instead of the fallback
    // brain icon), not real quiz content. Verified with curl before using it.
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
    quizData: {
      question: 'Jak nazywa się ta gra?',
      answers: ['SurvivorQuest', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      acceptedAnswers: ['Survivor Quest'],
    },
  },
  {
    prismaType: StationType.TIME,
    categoryName: 'TEST — Na czas',
    stationName: 'TEST — Na czas',
    description: 'Testowe stanowisko na czas — wpisz dowolny 8-znakowy kod ukończenia (nie jest tu weryfikowany), np. TESTTIME.',
    completionCode: 'TESTTIME',
  },
  {
    prismaType: StationType.POINTS,
    categoryName: 'TEST — Na punkty',
    stationName: 'TEST — Na punkty',
    description: 'Testowe stanowisko na punkty — wpisz dowolny 8-znakowy kod ukończenia (nie jest tu weryfikowany), np. TESTPKT1.',
    completionCode: 'TESTPKT1',
  },
  {
    prismaType: StationType.WORDLE,
    categoryName: 'TEST — Wordle',
    stationName: 'TEST — Wordle',
    description: 'Testowe hasło Wordle.',
    quizData: secretQuiz('SURVIVOR'),
  },
  {
    prismaType: StationType.HANGMAN,
    categoryName: 'TEST — Wisielec',
    stationName: 'TEST — Wisielec',
    description: 'Testowe hasło Wisielca.',
    quizData: secretQuiz('SURVIVOR QUEST'),
  },
  {
    prismaType: StationType.MASTERMIND,
    categoryName: 'TEST — Mastermind',
    stationName: 'TEST — Mastermind',
    description: 'Testowy kod Mastermind.',
    quizData: secretQuiz('ABCD'),
  },
  {
    prismaType: StationType.ANAGRAM,
    categoryName: 'TEST — Anagram',
    stationName: 'TEST — Anagram',
    description: 'Testowe hasło Anagramu.',
    quizData: secretQuiz('PRZYGODA'),
  },
  {
    prismaType: StationType.CAESAR_CIPHER,
    categoryName: 'TEST — Szyfr Cezara',
    stationName: 'TEST — Szyfr Cezara',
    description: 'Testowe hasło Szyfru Cezara.',
    quizData: secretQuiz('SZYFR'),
  },
  {
    prismaType: StationType.MEMORY,
    categoryName: 'TEST — Memory',
    stationName: 'TEST — Memory',
    description: 'Testowe zadanie Memory.',
    quizData: secretQuiz(MEMORY_SYSTEM_STATION_PROMPT),
  },
  {
    prismaType: StationType.SIMON,
    categoryName: 'TEST — Simon mówi',
    stationName: 'TEST — Simon mówi',
    description: 'Testowa sekwencja Simon.',
    quizData: secretQuiz('1-2-3-4-5-6-7-8-9-1'),
  },
  {
    prismaType: StationType.BOGGLE,
    categoryName: 'TEST — Boggle',
    stationName: 'TEST — Boggle',
    description: 'Testowe hasło Boggle.',
    quizData: secretQuiz('PLAN'),
  },
  {
    prismaType: StationType.MATCHING,
    categoryName: 'TEST — Dopasowywanie',
    stationName: 'TEST — Dopasowywanie',
    description: 'Testowe zadanie dopasowywania par.',
    quizData: {
      question: MATCHING_SYSTEM_STATION_PROMPT,
      answers: ['Pies -> Kość', 'Kot -> Mysz', 'Ptak -> Gniazdo', 'Ryba -> Woda'],
      correctAnswerIndex: 0,
    },
  },
  {
    prismaType: StationType.PHOTO_TASK,
    categoryName: 'TEST — Zadanie fotograficzne',
    stationName: 'TEST — Zadanie fotograficzne',
    description: 'Zrób dowolne zdjęcie, aby zaliczyć to testowe zadanie.',
  },
  {
    prismaType: StationType.REVIEWED_ANSWER,
    categoryName: 'TEST — Odpowiedź opisowa',
    stationName: 'TEST — Odpowiedź opisowa',
    description:
      'Wpiszcie dowolną odpowiedź — trafi do Mistrza Gry, który zdecyduje w panelu bieżącej realizacji.',
    quizData: {
      question: 'Opiszcie własnymi słowami, na czym polega ta gra.',
      answers: ['Opiszcie własnymi słowami, na czym polega ta gra.', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      // Key points the Game Master ticks off while reading; never sent to the
      // tablet (see toRiskStationPayload in risk-quiz.service.ts).
      acceptedAnswers: ['drużyny losują karty', 'za poprawne odpowiedzi są punkty'],
    },
  },
  {
    prismaType: StationType.TRUE_FALSE,
    categoryName: 'TEST — Prawda czy fałsz',
    stationName: 'TEST — Prawda czy fałsz',
    description: 'Testowe zadanie prawda/fałsz — liczy się komplet czterech trafień.',
    quizData: {
      question: TRUE_FALSE_SYSTEM_STATION_PROMPT,
      // "statement :: T|F" — the verdict rides beside the statement so the
      // auto-translator can rewrite the wording without touching the flag.
      answers: [
        'SurvivorQuest to gra terenowa. :: T',
        'Talia testowa ma jedną kartę. :: F',
        'Drużyny skanują kody QR. :: T',
        'Mistrz Gry gra razem z drużynami. :: F',
      ],
      correctAnswerIndex: 0,
    },
  },
  {
    prismaType: StationType.FILL_BLANK,
    categoryName: 'TEST — Uzupełnij lukę',
    stationName: 'TEST — Uzupełnij lukę',
    description: 'Testowe zadanie z luką do uzupełnienia.',
    quizData: {
      question: 'Ta gra nazywa się ___ i jest grą terenową.',
      answers: ['SurvivorQuest', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      acceptedAnswers: ['Survivor Quest'],
    },
  },
];

async function pruneStaleCategories() {
  const currentNames = new Set(STATION_DEFS.map((def) => def.categoryName));
  const existingTestCategories = await prisma.riskCategory.findMany({
    where: { name: { startsWith: 'TEST — ' } },
    include: { poolStations: true },
  });

  for (const category of existingTestCategories) {
    if (currentNames.has(category.name)) {
      continue;
    }

    const stationIds = category.poolStations.map((poolStation) => poolStation.stationId);
    await prisma.riskCategory.delete({ where: { id: category.id } });
    if (stationIds.length > 0) {
      await prisma.station.deleteMany({ where: { id: { in: stationIds } } });
    }

    console.log(`Usunięto nieaktualną kategorię testową "${category.name}".`);
  }
}

async function main() {
  await pruneStaleCategories();

  const schemeCategoryIds: string[] = [];

  for (const [index, def] of STATION_DEFS.entries()) {
    // Names are only unique among templates now (realization-owned clones reuse
    // their source's name), so these can't be by-name upserts.
    const category =
      (await prisma.riskCategory.findFirst({
        where: { name: def.categoryName, realizationId: null },
      })) ??
      (await prisma.riskCategory.create({ data: { name: def.categoryName } }));
    schemeCategoryIds.push(category.id);

    const existingPoolStation = await prisma.riskPoolStation.findFirst({
      where: { categoryId: category.id, difficulty: RiskDifficulty.EASY },
    });

    const stationData = {
      name: def.stationName,
      type: def.prismaType,
      description: def.description,
      imageUrl: def.imageUrl,
      points: STATION_POINTS,
      timeLimitSeconds: STATION_TIME_LIMIT_SECONDS,
      quizData: def.quizData,
      completionCode: def.completionCode,
      qrScanCodes: def.qrScanCodes ?? [],
    };

    if (existingPoolStation) {
      await prisma.station.update({
        where: { id: existingPoolStation.stationId },
        data: stationData,
      });
      console.log(`[${index + 1}/${STATION_DEFS.length}] Zaktualizowano "${def.stationName}" w kategorii "${def.categoryName}".`);
      continue;
    }

    const station = await prisma.station.create({ data: stationData });

    await prisma.riskPoolStation.create({
      data: {
        categoryId: category.id,
        difficulty: RiskDifficulty.EASY,
        stationId: station.id,
      },
    });

    console.log(`[${index + 1}/${STATION_DEFS.length}] Dodano "${def.stationName}" do kategorii "${def.categoryName}".`);
  }

  const scheme =
    (await prisma.riskScheme.findFirst({
      where: { name: SCHEME_NAME, realizationId: null },
    })) ?? (await prisma.riskScheme.create({ data: { name: SCHEME_NAME } }));

  for (const [order, categoryId] of schemeCategoryIds.entries()) {
    await prisma.riskSchemeCategory.upsert({
      where: { schemeId_categoryId: { schemeId: scheme.id, categoryId } },
      update: { order },
      create: { schemeId: scheme.id, categoryId, order },
    });
  }

  console.log(`Gotowe: talia "${SCHEME_NAME}" zawiera ${schemeCategoryIds.length} kategorii (jedna na typ stanowiska).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
