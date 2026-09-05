import { StationType as PrismaStationType } from '@prisma/client';

import {
  mapStation,
  toPrismaStationQuizData,
  toPrismaStationTranslationsData,
} from './station.mapper';
import type { StationQuiz, StationTranslations } from '../domain/station.types';

function buildStationRow(quizData: unknown, translations?: unknown) {
  return {
    id: 'station-1',
    name: 'Szyfr Cezara',
    type: PrismaStationType.CAESAR_CIPHER,
    categories: [],
    description: '',
    imageUrl: null,
    points: 10,
    timeLimitSeconds: 0,
    completionCode: null,
    qrEntryCode: null,
    qrScanCodes: null,
    quizData: quizData as never,
    translations: (translations ??
      toPrismaStationTranslationsData(undefined)) as never,
    challengeDifficultyMode: 'admin',
    challengeDifficulty: 'medium',
    completionStopwatchEnabled: false,
    allowConcurrentTeams: false,
    fastestCompletionBonusPoints: 0,
    color: '#ffffff',
    latitude: null,
    longitude: null,
    sourceTemplateId: null,
    scenarioInstanceId: null,
    realizationId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('station.mapper caesar shift persistence', () => {
  const caesarQuiz: StationQuiz = {
    question: 'TAJNEHASLO',
    answers: ['TAJNEHASLO', 'A', 'B', 'C'],
    correctAnswerIndex: 0,
    caesarShift: 5,
  };

  it('writes caesarShift into quizData', () => {
    expect(toPrismaStationQuizData(caesarQuiz)).toMatchObject({
      caesarShift: 5,
    });
  });

  it('reads caesarShift back out of quizData', () => {
    const stored = toPrismaStationQuizData(caesarQuiz);
    const station = mapStation(buildStationRow(stored));

    expect(station.quiz?.caesarShift).toBe(5);
  });

  it('omits caesarShift when it was never set', () => {
    const stored = toPrismaStationQuizData({
      question: 'TAJNEHASLO',
      answers: ['TAJNEHASLO', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
    });
    const station = mapStation(buildStationRow(stored));

    expect(station.quiz?.caesarShift).toBeUndefined();
  });

  it('ignores an out-of-range caesarShift stored by an older build', () => {
    const station = mapStation(
      buildStationRow({
        question: 'TAJNEHASLO',
        answers: ['TAJNEHASLO', 'A', 'B', 'C'],
        correctAnswerIndex: 0,
        caesarShift: 99,
      }),
    );

    expect(station.quiz?.caesarShift).toBeUndefined();
  });

  it('keeps acceptedAnswers round-tripping', () => {
    const stored = toPrismaStationQuizData({
      question: 'Stolica Polski?',
      answers: ['Warszawa', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      acceptedAnswers: ['warszawa', 'wawa'],
    });
    const station = mapStation(buildStationRow(stored));

    expect(station.quiz?.acceptedAnswers).toEqual(['warszawa', 'wawa']);
  });
});

describe('station.mapper quiz shape', () => {
  it('drops a quiz whose answers are not four slots', () => {
    const station = mapStation(
      buildStationRow({
        question: 'TAJNEHASLO',
        answers: ['TAJNEHASLO', 'A'],
        correctAnswerIndex: 0,
      }),
    );

    expect(station.quiz).toBeUndefined();
  });
});

// Tlumaczenie przechowuje wylacznie tekst. Mechanika zagadki zostaje w bazowej
// stacji, bo admin nie ma dla niej pola per jezyk - kopia per jezyk moglaby sie
// z baza rozjechac i nikt by tego nie zobaczyl.
describe('station.mapper translation quiz persistence', () => {
  const translated: StationTranslations = {
    english: {
      name: 'Caesar cipher',
      quiz: {
        question: 'SECRETWORD',
        answers: ['SECRETWORD', 'A', 'B', 'C'],
        correctAnswerIndex: 0,
        acceptedAnswers: ['secretword'],
        caesarShift: 11,
      },
    },
  };

  function storedEnglishQuiz() {
    const stored = toPrismaStationTranslationsData(translated) as Record<
      string,
      { quiz?: Record<string, unknown> }
    >;

    return stored.english.quiz;
  }

  it('stores every translatable quiz field', () => {
    expect(storedEnglishQuiz()).toMatchObject({
      question: 'SECRETWORD',
      answers: ['SECRETWORD', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      acceptedAnswers: ['secretword'],
    });
  });

  it('never stores caesarShift in a per-language override', () => {
    expect(storedEnglishQuiz()).not.toHaveProperty('caesarShift');
  });

  it('round-trips a stored translation back into an entity', () => {
    const station = mapStation(
      buildStationRow(null, toPrismaStationTranslationsData(translated)),
    );

    expect(station.translations?.english?.quiz).toMatchObject({
      question: 'SECRETWORD',
      correctAnswerIndex: 0,
      acceptedAnswers: ['secretword'],
    });
    expect(station.translations?.english?.name).toBe('Caesar cipher');
  });
});
