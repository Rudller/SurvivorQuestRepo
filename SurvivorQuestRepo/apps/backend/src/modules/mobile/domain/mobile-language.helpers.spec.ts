import {
  resolveLocalizedStationPresentation,
  resolveRealizationLanguageContext,
} from './mobile-language.helpers';
import type {
  StationEntity,
  StationQuiz,
  StationTranslations,
  StationType,
} from '../../station/station.service';

// Realizacja wielojęzyczna oglądana przez gracza, który wybrał angielski.
//
// Uwaga na kształt wejścia: resolveAvailableLanguages przy language !== 'other'
// zwraca dokładnie jeden język, więc realizacja oznaczona wprost jako polska (czy
// angielska) NIGDY nie serwuje translations — zawsze trafia w skrót "język
// bazowy". Wielojęzyczność wyraża się przez language: 'other' plus listę w
// customLanguage. Bez tego każdy test lokalizacji przechodziłby fałszywie,
// porównując treść bazową samą ze sobą.
function englishPlayerContext() {
  return resolveRealizationLanguageContext({
    language: 'other',
    customLanguage: 'polski + angielski',
    selectedLanguage: 'english',
  });
}

function buildStation(input: {
  type: StationType;
  quiz: StationQuiz;
  translations?: StationTranslations;
}): StationEntity {
  return {
    id: 'station-1',
    name: 'Stacja',
    description: 'Opis',
    type: input.type,
    quiz: input.quiz,
    translations: input.translations,
  } as StationEntity;
}

describe('resolveLocalizedStationPresentation — mechanics never come from a translation', () => {
  // caesarShift nie jest tekstem, tylko parametrem zagadki. Admin nie ma dla
  // niego pola per język, więc przetłumaczona wersja quizu go nie niesie —
  // a bez niego panel wylicza inny szyfr niż ten, który admin widział.
  it('keeps the base caesarShift when the translation carries none', () => {
    const station = buildStation({
      type: 'caesar-cipher',
      quiz: {
        question: 'WKDMQH',
        answers: ['WKDMQH', 'A', 'B', 'C'],
        correctAnswerIndex: 0,
        caesarShift: 7,
      },
      translations: {
        english: {
          quiz: {
            question: 'VHFUHW',
            answers: ['VHFUHW', 'A', 'B', 'C'],
            correctAnswerIndex: 0,
          },
        },
      },
    });

    expect(
      resolveLocalizedStationPresentation(station, englishPlayerContext()).quiz
        ?.caesarShift,
    ).toBe(7);
  });

  it('ignores a caesarShift that somehow ended up inside a translation', () => {
    const station = buildStation({
      type: 'caesar-cipher',
      quiz: {
        question: 'WKDMQH',
        answers: ['WKDMQH', 'A', 'B', 'C'],
        correctAnswerIndex: 0,
        caesarShift: 7,
      },
      translations: {
        english: {
          quiz: {
            question: 'WKDMQH',
            answers: ['WKDMQH', 'A', 'B', 'C'],
            correctAnswerIndex: 0,
            caesarShift: 19,
          },
        },
      },
    });

    expect(
      resolveLocalizedStationPresentation(station, englishPlayerContext()).quiz
        ?.caesarShift,
    ).toBe(7);
  });
});

describe('resolveLocalizedStationPresentation — puzzle secrets follow the player language', () => {
  // Hasło zagadki słownej to treść zagadki: angielski gracz ma dostać planszę
  // z angielskim hasłem (KOMUNIKAT → MESSAGE), a nie polskie litery pod
  // angielskim opisem. Zepsute maszynowe tłumaczenia haseł blokuje teraz admin
  // (auto-tłumacz kopiuje hasło bazowe), więc tłumaczenie w bazie jest celowe.
  it('serves the translated secret of a word puzzle', () => {
    const station = buildStation({
      type: 'boggle',
      quiz: {
        question: 'KOMUNIKAT',
        answers: ['KOMUNIKAT', 'A', 'B', 'C'],
        correctAnswerIndex: 0,
      },
      translations: {
        english: {
          quiz: {
            question: 'MESSAGE',
            answers: ['MESSAGE', 'A', 'B', 'C'],
            correctAnswerIndex: 0,
          },
        },
      },
    });

    const localized = resolveLocalizedStationPresentation(
      station,
      englishPlayerContext(),
    );

    expect(localized.quiz?.question).toBe('MESSAGE');
    expect(localized.quiz?.answers[0]).toBe('MESSAGE');
  });

  it('falls back to the base secret when the language has no quiz translation', () => {
    const station = buildStation({
      type: 'anagram',
      quiz: {
        question: 'ALERT',
        answers: ['ALERT', 'A', 'B', 'C'],
        correctAnswerIndex: 0,
      },
      translations: { english: { name: 'Incident timeline' } },
    });

    expect(
      resolveLocalizedStationPresentation(station, englishPlayerContext()).quiz
        ?.question,
    ).toBe('ALERT');
  });

  // mini-sudoku opisuje zadanie prozą — plansza nie bierze się z treści pytania,
  // więc tu tłumaczenie jest jak najbardziej na miejscu.
  it('still translates a prose-prompt puzzle', () => {
    const station = buildStation({
      type: 'mini-sudoku',
      quiz: {
        question: 'Uzupełnij planszę',
        answers: ['1', '2', '3', '4'],
        correctAnswerIndex: 0,
      },
      translations: {
        english: {
          quiz: {
            question: 'Fill in the grid',
            answers: ['1', '2', '3', '4'],
            correctAnswerIndex: 0,
          },
        },
      },
    });

    expect(
      resolveLocalizedStationPresentation(station, englishPlayerContext()).quiz
        ?.question,
    ).toBe('Fill in the grid');
  });
});

describe('resolveLocalizedStationPresentation — content is graded as one unit', () => {
  // answers i correctAnswerIndex muszą pochodzić z tego samego źródła. Wzięcie
  // indeksu z bazy, a odpowiedzi z tłumaczenia, ocenia angielski quiz polskim
  // kluczem.
  it('takes answers and the index together from the translation', () => {
    const station = buildStation({
      type: 'quiz',
      quiz: {
        question: 'Stolica Polski?',
        answers: ['Kraków', 'Warszawa', 'Gdańsk', 'Poznań'],
        correctAnswerIndex: 1,
      },
      translations: {
        english: {
          quiz: {
            question: 'Capital of Poland?',
            answers: ['Cracow', 'Gdansk', 'Warsaw', 'Poznan'],
            correctAnswerIndex: 2,
          },
        },
      },
    });

    const localized = resolveLocalizedStationPresentation(
      station,
      englishPlayerContext(),
    );

    expect(localized.quiz?.answers).toEqual([
      'Cracow',
      'Gdansk',
      'Warsaw',
      'Poznan',
    ]);
    expect(localized.quiz?.correctAnswerIndex).toBe(2);
  });

  it('falls back to the whole base quiz when there is no usable translation', () => {
    const station = buildStation({
      type: 'quiz',
      quiz: {
        question: 'Stolica Polski?',
        answers: ['Kraków', 'Warszawa', 'Gdańsk', 'Poznań'],
        correctAnswerIndex: 1,
      },
      translations: { english: { name: 'Station' } },
    });

    const localized = resolveLocalizedStationPresentation(
      station,
      englishPlayerContext(),
    );

    expect(localized.quiz?.question).toBe('Stolica Polski?');
    expect(localized.quiz?.correctAnswerIndex).toBe(1);
  });
});

describe('resolveLocalizedStationPresentation — audio', () => {
  // Nagranie zwykle istnieje tylko w wersji bazowej; brak per-językowego pliku
  // nie może wyciszyć stacji.
  it('keeps the base audio when the translation has none', () => {
    const station = buildStation({
      type: 'audio-quiz',
      quiz: {
        question: 'Co słyszysz?',
        answers: ['Sowa', 'Wilk', 'Sarna', 'Dzik'],
        correctAnswerIndex: 0,
        audioUrl: 'https://cdn.example/pl.mp3',
      },
      translations: {
        english: {
          quiz: {
            question: 'What do you hear?',
            answers: ['Owl', 'Wolf', 'Deer', 'Boar'],
            correctAnswerIndex: 0,
          },
        },
      },
    });

    expect(
      resolveLocalizedStationPresentation(station, englishPlayerContext()).quiz
        ?.audioUrl,
    ).toBe('https://cdn.example/pl.mp3');
  });

  it('prefers a per-language recording when the translation supplies one', () => {
    const station = buildStation({
      type: 'audio-quiz',
      quiz: {
        question: 'Co słyszysz?',
        answers: ['Sowa', 'Wilk', 'Sarna', 'Dzik'],
        correctAnswerIndex: 0,
        audioUrl: 'https://cdn.example/pl.mp3',
      },
      translations: {
        english: {
          quiz: {
            question: 'What do you hear?',
            answers: ['Owl', 'Wolf', 'Deer', 'Boar'],
            correctAnswerIndex: 0,
            audioUrl: 'https://cdn.example/en.mp3',
          },
        },
      },
    });

    expect(
      resolveLocalizedStationPresentation(station, englishPlayerContext()).quiz
        ?.audioUrl,
    ).toBe('https://cdn.example/en.mp3');
  });
});

describe('resolveLocalizedStationPresentation — base language short circuit', () => {
  it('serves the live base fields to a player on the base language', () => {
    const station = buildStation({
      type: 'quiz',
      quiz: {
        question: 'Stolica Polski?',
        answers: ['Kraków', 'Warszawa', 'Gdańsk', 'Poznań'],
        correctAnswerIndex: 1,
      },
      translations: {
        english: {
          quiz: {
            question: 'Capital of Poland?',
            answers: ['Cracow', 'Gdansk', 'Warsaw', 'Poznan'],
            correctAnswerIndex: 2,
          },
        },
      },
    });

    const localized = resolveLocalizedStationPresentation(
      station,
      resolveRealizationLanguageContext({ language: 'polish' }),
    );

    expect(localized.quiz?.question).toBe('Stolica Polski?');
  });
});
