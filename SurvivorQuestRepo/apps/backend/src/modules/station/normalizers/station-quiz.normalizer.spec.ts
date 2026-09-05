import { BadRequestException } from '@nestjs/common';

import { buildStationQuizFromInput } from './station-quiz.normalizer';

describe('buildStationQuizFromInput — types without quizData', () => {
  it('returns undefined for a station type that stores no quiz', () => {
    expect(
      buildStationQuizFromInput({ question: 'x' }, 'time'),
    ).toBeUndefined();
    expect(
      buildStationQuizFromInput({ question: 'x' }, 'photo-task'),
    ).toBeUndefined();
    expect(
      buildStationQuizFromInput({ question: 'x' }, 'qr-hunt'),
    ).toBeUndefined();
  });

  it('rejects a missing or non-object payload for a quiz type', () => {
    expect(() => buildStationQuizFromInput(undefined, 'quiz')).toThrow(
      BadRequestException,
    );
    expect(() => buildStationQuizFromInput(['a'], 'quiz')).toThrow(
      BadRequestException,
    );
  });
});

// Zagadki słowne trzymają hasło w `question`, a tablica odpowiedzi jest tylko
// atrapą utrzymującą wiersz w kształcie, który przechodzi przez czytnik.
describe('buildStationQuizFromInput — word puzzles', () => {
  it('mirrors the question into the first answer slot', () => {
    expect(
      buildStationQuizFromInput({ question: '  TAJNE  ' }, 'anagram'),
    ).toEqual({
      question: 'TAJNE',
      answers: ['TAJNE', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
    });
  });

  it('keeps an in-range caesarShift for caesar-cipher', () => {
    expect(
      buildStationQuizFromInput(
        { question: 'TAJNE', caesarShift: 25 },
        'caesar-cipher',
      )?.caesarShift,
    ).toBe(25);
  });

  it('leaves the shift unset when the admin did not pick one', () => {
    for (const value of [undefined, null, '']) {
      expect(
        buildStationQuizFromInput(
          { question: 'TAJNE', caesarShift: value },
          'caesar-cipher',
        )?.caesarShift,
      ).toBeUndefined();
    }
  });

  it('rejects a caesarShift outside 1-25', () => {
    for (const value of [0, 26, 'abc', 2.5]) {
      expect(() =>
        buildStationQuizFromInput(
          { question: 'TAJNE', caesarShift: value },
          'caesar-cipher',
        ),
      ).toThrow(BadRequestException);
    }
  });

  it('never attaches a shift to a non-caesar word puzzle', () => {
    expect(
      buildStationQuizFromInput(
        { question: 'TAJNE', caesarShift: 5 },
        'wordle',
      ),
    ).not.toHaveProperty('caesarShift');
  });

  it('rejects a blank question', () => {
    expect(() =>
      buildStationQuizFromInput({ question: '   ' }, 'wordle'),
    ).toThrow(BadRequestException);
  });
});

describe('buildStationQuizFromInput — reviewed-answer', () => {
  it('de-duplicates the reviewer key points case-insensitively, keeping order', () => {
    expect(
      buildStationQuizFromInput(
        {
          question: 'Opisz strategię',
          acceptedAnswers: ['Plan', '  ', 'plan', 'Podział ról'],
        },
        'reviewed-answer',
      ),
    ).toEqual({
      question: 'Opisz strategię',
      answers: ['Opisz strategię', 'A', 'B', 'C'],
      correctAnswerIndex: 0,
      acceptedAnswers: ['Plan', 'Podział ról'],
    });
  });

  it('keeps a card that has no key points at all', () => {
    expect(
      buildStationQuizFromInput({ question: 'Opisz' }, 'reviewed-answer'),
    ).not.toHaveProperty('acceptedAnswers');
  });

  // Walidacja HTTP odrzuca śmieci, bo klient da się poprawić. Szkic osadzony
  // w realizacji pomija je po cichu — inaczej jedno felerne pole wywracałoby
  // zapis całej realizacji.
  it('rejects malformed key points on the HTTP path but skips them on a draft', () => {
    const payload = { question: 'Opisz', acceptedAnswers: 'nie-tablica' };

    expect(() => buildStationQuizFromInput(payload, 'reviewed-answer')).toThrow(
      BadRequestException,
    );
    expect(
      buildStationQuizFromInput(payload, 'reviewed-answer', {
        onInvalidAnswerKeys: 'skip',
      }),
    ).not.toHaveProperty('acceptedAnswers');
  });
});

describe('buildStationQuizFromInput — open question', () => {
  it.each(['open-quiz', 'fill-blank'] as const)(
    'takes the typed answer from the first slot for %s',
    (type) => {
      expect(
        buildStationQuizFromInput(
          {
            question: 'Kto założył Warszawę?',
            answers: ['  Książę Janusz  '],
            acceptedAnswers: ['janusz', 'Książę Janusz', 'Janusz'],
          },
          type,
        ),
      ).toEqual({
        question: 'Kto założył Warszawę?',
        answers: ['Książę Janusz', 'A', 'B', 'C'],
        correctAnswerIndex: 0,
        // "Książę Janusz" wypada jako duplikat samej odpowiedzi, a "Janusz"
        // jako duplikat wcześniejszego "janusz" — porównanie ignoruje wielkość
        // liter, bo tak samo sprawdzana jest potem odpowiedź drużyny.
        acceptedAnswers: ['janusz'],
      });
    },
  );

  it('rejects an open question with no answer', () => {
    expect(() =>
      buildStationQuizFromInput(
        { question: 'Pytanie', answers: ['   '] },
        'open-quiz',
      ),
    ).toThrow(BadRequestException);
  });
});

describe('buildStationQuizFromInput — four-slot types', () => {
  const quiz = {
    question: 'Stolica Polski?',
    answers: [' Warszawa ', 'Kraków', 'Gdańsk', 'Poznań'],
    correctAnswerIndex: 2,
    audioUrl: '  https://cdn.example/a.mp3  ',
  };

  it('trims the slots and keeps the chosen index', () => {
    expect(buildStationQuizFromInput(quiz, 'quiz')).toMatchObject({
      answers: ['Warszawa', 'Kraków', 'Gdańsk', 'Poznań'],
      correctAnswerIndex: 2,
      audioUrl: 'https://cdn.example/a.mp3',
    });
  });

  it('accepts a stringified index from a form payload', () => {
    expect(
      buildStationQuizFromInput(
        { ...quiz, correctAnswerIndex: '3' },
        'audio-quiz',
      )?.correctAnswerIndex,
    ).toBe(3);
  });

  it('rejects an index outside the four slots', () => {
    expect(() =>
      buildStationQuizFromInput({ ...quiz, correctAnswerIndex: 4 }, 'quiz'),
    ).toThrow(BadRequestException);
  });

  it('rejects a payload that does not carry exactly four slots', () => {
    expect(() =>
      buildStationQuizFromInput({ ...quiz, answers: ['a', 'b'] }, 'quiz'),
    ).toThrow(BadRequestException);
  });

  // matching i true-false rozkładają odpowiedź na wszystkie cztery sloty, więc
  // nie ma jednego "poprawnego" indeksu do zapamiętania.
  it('normalizes matching pairs and pins the index', () => {
    expect(
      buildStationQuizFromInput(
        {
          question: 'Dopasuj',
          answers: [
            'Polska = Warszawa',
            'Czechy: Praga',
            'Litwa -> Wilno',
            'Łotwa = Ryga',
          ],
          correctAnswerIndex: 3,
        },
        'matching',
      ),
    ).toMatchObject({
      answers: [
        'Polska -> Warszawa',
        'Czechy -> Praga',
        'Litwa -> Wilno',
        'Łotwa -> Ryga',
      ],
      correctAnswerIndex: 0,
    });
  });

  it('normalizes true/false verdicts and pins the index', () => {
    expect(
      buildStationQuizFromInput(
        {
          question: 'Oceń zdania',
          answers: [
            'Zdanie A ::T',
            'Zdanie B :: F',
            'Zdanie C :: T',
            'Zdanie D :: F',
          ],
          correctAnswerIndex: 2,
        },
        'true-false',
      ),
    ).toMatchObject({
      answers: [
        'Zdanie A :: T',
        'Zdanie B :: F',
        'Zdanie C :: T',
        'Zdanie D :: F',
      ],
      correctAnswerIndex: 0,
    });
  });

  it('rejects a blank slot', () => {
    expect(() =>
      buildStationQuizFromInput(
        { ...quiz, answers: ['Warszawa', '', 'Gdańsk', 'Poznań'] },
        'quiz',
      ),
    ).toThrow(BadRequestException);
  });
});
