import {
  STATION_QUIZ_FIELDS,
  STATION_QUIZ_FIELD_NAMES,
  STATION_TRANSLATION_QUIZ_FIELD_NAMES,
  readStationQuiz,
  readStationQuizText,
  serializeStationQuiz,
} from './station-quiz.schema';
import type { StationQuiz } from './station.types';

function buildQuiz(overrides: Partial<StationQuiz> = {}): StationQuiz {
  return {
    question: 'Stolica Polski?',
    answers: ['Warszawa', 'Kraków', 'Gdańsk', 'Poznań'],
    correctAnswerIndex: 0,
    ...overrides,
  };
}

describe('STATION_QUIZ_FIELDS', () => {
  // Kanarek: nowe pole w StationQuiz musi tu dojść razem ze swoją rolą, inaczej
  // cicho wypadnie z którejś projekcji — dokładnie tak zgubił się caesarShift
  // w tłumaczeniach.
  it('lists every StationQuiz field exactly once, in declaration order', () => {
    expect(STATION_QUIZ_FIELD_NAMES).toEqual([
      'question',
      'answers',
      'correctAnswerIndex',
      'acceptedAnswers',
      'audioUrl',
      'caesarShift',
    ]);
  });

  it('marks the atomically-graded fields as content', () => {
    expect(STATION_QUIZ_FIELDS.question.role).toBe('content');
    expect(STATION_QUIZ_FIELDS.answers.role).toBe('content');
    expect(STATION_QUIZ_FIELDS.correctAnswerIndex.role).toBe('content');
    expect(STATION_QUIZ_FIELDS.acceptedAnswers.role).toBe('content');
  });

  it('marks caesarShift as mechanics and audioUrl as media', () => {
    expect(STATION_QUIZ_FIELDS.caesarShift.role).toBe('mechanics');
    expect(STATION_QUIZ_FIELDS.audioUrl.role).toBe('media');
  });

  it('keeps mechanics out of the per-language override allow-list', () => {
    expect(STATION_TRANSLATION_QUIZ_FIELD_NAMES).not.toContain('caesarShift');
    expect(STATION_TRANSLATION_QUIZ_FIELD_NAMES).toContain('question');
    expect(STATION_TRANSLATION_QUIZ_FIELD_NAMES).toContain('answers');
    expect(STATION_TRANSLATION_QUIZ_FIELD_NAMES).toContain('audioUrl');
  });
});

describe('serializeStationQuiz', () => {
  it('omits optional fields that carry no value', () => {
    const serialized = serializeStationQuiz(
      buildQuiz({
        audioUrl: '   ',
        acceptedAnswers: [],
        caesarShift: undefined,
      }),
    );

    expect(serialized).not.toHaveProperty('audioUrl');
    expect(serialized).not.toHaveProperty('acceptedAnswers');
    expect(serialized).not.toHaveProperty('caesarShift');
  });

  it('keeps optional fields that do carry a value', () => {
    const serialized = serializeStationQuiz(
      buildQuiz({
        audioUrl: 'https://cdn.example/a.mp3',
        acceptedAnswers: ['warszawa'],
        caesarShift: 5,
      }),
    );

    expect(serialized).toEqual({
      question: 'Stolica Polski?',
      answers: ['Warszawa', 'Kraków', 'Gdańsk', 'Poznań'],
      correctAnswerIndex: 0,
      audioUrl: 'https://cdn.example/a.mp3',
      acceptedAnswers: ['warszawa'],
      caesarShift: 5,
    });
  });

  it('drops fields outside the requested allow-list', () => {
    const serialized = serializeStationQuiz(buildQuiz({ caesarShift: 5 }), {
      fields: STATION_TRANSLATION_QUIZ_FIELD_NAMES,
    });

    expect(serialized).not.toHaveProperty('caesarShift');
    expect(serialized.question).toBe('Stolica Polski?');
  });
});

describe('readStationQuiz', () => {
  it('reads a well-formed stored row and trims it', () => {
    expect(
      readStationQuiz({
        question: '  Stolica Polski?  ',
        answers: [' Warszawa ', 'Kraków', 'Gdańsk', 'Poznań'],
        correctAnswerIndex: 0,
      }),
    ).toMatchObject({
      question: 'Stolica Polski?',
      answers: ['Warszawa', 'Kraków', 'Gdańsk', 'Poznań'],
      correctAnswerIndex: 0,
    });
  });

  it('rejects a row whose answers are not exactly four slots', () => {
    expect(
      readStationQuiz({
        question: 'Q',
        answers: ['a', 'b'],
        correctAnswerIndex: 0,
      }),
    ).toBeUndefined();
  });

  it('rejects a row with a blank answer slot by default', () => {
    expect(
      readStationQuiz({
        question: 'Q',
        answers: ['a', '', 'c', 'd'],
        correctAnswerIndex: 0,
      }),
    ).toBeUndefined();
  });

  // Tłumaczenie wolno zostawić z pustym slotem — tak zachowuje się dzisiejsze
  // ensureStationTranslationQuiz i ta łagodność musi przetrwać scalenie.
  it('accepts a blank answer slot when reading a per-language override', () => {
    expect(
      readStationQuiz(
        { question: 'Q', answers: ['a', '', 'c', 'd'], correctAnswerIndex: 0 },
        { allowBlankAnswers: true },
      ),
    ).toMatchObject({ answers: ['a', '', 'c', 'd'] });
  });

  it('rejects a correctAnswerIndex outside the answer range', () => {
    expect(
      readStationQuiz({
        question: 'Q',
        answers: ['a', 'b', 'c', 'd'],
        correctAnswerIndex: 4,
      }),
    ).toBeUndefined();
  });

  it('ignores an out-of-range caesarShift stored by an older build', () => {
    expect(
      readStationQuiz({
        question: 'Q',
        answers: ['a', 'b', 'c', 'd'],
        correctAnswerIndex: 0,
        caesarShift: 99,
      })?.caesarShift,
    ).toBeUndefined();
  });

  it('keeps an in-range caesarShift', () => {
    expect(
      readStationQuiz({
        question: 'Q',
        answers: ['a', 'b', 'c', 'd'],
        correctAnswerIndex: 0,
        caesarShift: 25,
      })?.caesarShift,
    ).toBe(25);
  });

  // Wiersze produkcyjne mogą pochodzić z nowszego builda; nieznany klucz nie ma
  // prawa unieważnić całego quizu.
  it('still parses a row carrying an unknown extra key', () => {
    expect(
      readStationQuiz({
        question: 'Q',
        answers: ['a', 'b', 'c', 'd'],
        correctAnswerIndex: 1,
        somethingFromTheFuture: true,
      }),
    ).toMatchObject({ correctAnswerIndex: 1 });
  });

  it('drops unknown keys instead of forwarding them', () => {
    expect(
      readStationQuiz({
        question: 'Q',
        answers: ['a', 'b', 'c', 'd'],
        correctAnswerIndex: 1,
        somethingFromTheFuture: true,
      }),
    ).not.toHaveProperty('somethingFromTheFuture');
  });

  it('returns undefined for a non-object payload', () => {
    expect(readStationQuiz(null)).toBeUndefined();
    expect(readStationQuiz(['a'])).toBeUndefined();
    expect(readStationQuiz('quiz')).toBeUndefined();
  });

  it('coerces a stringified index only when the caller asks for it', () => {
    const raw = {
      question: 'Q',
      answers: ['a', 'b', 'c', 'd'],
      correctAnswerIndex: '2',
    };

    expect(readStationQuiz(raw)).toBeUndefined();
    expect(
      readStationQuiz(raw, { coerceCorrectAnswerIndex: true }),
    ).toMatchObject({ correctAnswerIndex: 2 });
  });
});

describe('readStationQuizText', () => {
  // reviewed-answer zapisane przez starszy build bywa bez tablicy answers.
  // readStationQuiz takie wiersze odrzuca, a kolejka Game Mastera i tak musi
  // pokazać pytanie.
  it('salvages the question from a row that has no answers array', () => {
    expect(
      readStationQuizText({
        question: '  Opisz swoją strategię  ',
        acceptedAnswers: ['plan', '  ', 'strategia'],
      }),
    ).toEqual({
      question: 'Opisz swoją strategię',
      acceptedAnswers: ['plan', 'strategia'],
    });
  });

  it('returns an empty result for a row with no usable question', () => {
    expect(readStationQuizText({ acceptedAnswers: ['x'] })).toEqual({});
    expect(readStationQuizText(null)).toEqual({});
  });
});
