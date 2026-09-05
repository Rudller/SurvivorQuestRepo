import {
  QUIZ_ANSWER_COUNT,
  isPuzzleSecretQuestionStationType,
} from './station.rules';
import type { StationQuiz, StationType } from './station.types';

// Pojedyncze źródło prawdy dla pól StationQuiz.
//
// Zanim to powstało, quizData było przepisywane pole po polu w jedenastu ręcznie
// pisanych literałach (walidacja HTTP, normalizator szkiców, oba kierunki mappera,
// gałąź tłumaczeń, dwie projekcje na tablet, kolejka Game Mastera, ocena odpowiedzi
// Ryzykantów). Trzy z nich zdążyły się rozjechać. Ten moduł jest czysty — bez
// importów Nest — żeby mapper, helpery językowe i serwisy mogły z niego korzystać.

export type StationQuizFieldRole =
  // Treść oceniana łącznie: answers i correctAnswerIndex muszą pochodzić z tego
  // samego źródła, bo indeks bez swojej tablicy wskazuje na cudzą odpowiedź.
  | 'content'
  // Zasób towarzyszący; może mieć wersję per język, ale bazowy jest wystarczający.
  | 'media'
  // Mechanika zagadki. Nigdy nie pochodzi z tłumaczenia — nie jest tekstem, tylko
  // parametrem, i admin nie ma dla niej pola per język.
  | 'mechanics';

export type StationQuizFieldSpec = {
  required: boolean;
  role: StationQuizFieldRole;
};

// `satisfies Record<keyof StationQuiz, ...>` jest tu urządzeniem antydryfowym:
// dodanie pola do StationQuiz bez zadeklarowania jego roli to błąd kompilacji,
// a nie ciche zniknięcie pola z połowy projekcji.
export const STATION_QUIZ_FIELDS = {
  question: { required: true, role: 'content' },
  answers: { required: true, role: 'content' },
  correctAnswerIndex: { required: true, role: 'content' },
  acceptedAnswers: { required: false, role: 'content' },
  audioUrl: { required: false, role: 'media' },
  caesarShift: { required: false, role: 'mechanics' },
} as const satisfies Record<keyof StationQuiz, StationQuizFieldSpec>;

export type StationQuizFieldName = keyof typeof STATION_QUIZ_FIELDS;

export const STATION_QUIZ_FIELD_NAMES = Object.keys(
  STATION_QUIZ_FIELDS,
) as StationQuizFieldName[];

// Co wolno zapisać w translations[language].quiz. Mechanika zostaje w bazowej
// stacji, więc per-językowa kopia nie może się z nią rozjechać.
export const STATION_TRANSLATION_QUIZ_FIELD_NAMES =
  STATION_QUIZ_FIELD_NAMES.filter(
    (field) => STATION_QUIZ_FIELDS[field].role !== 'mechanics',
  );

export type SerializeStationQuizOptions = {
  fields?: readonly StationQuizFieldName[];
};

function trimmedOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function collectAcceptedAnswers(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const collected = value
    .filter(
      (answer): answer is string =>
        typeof answer === 'string' && answer.trim().length > 0,
    )
    .map((answer) => answer.trim());

  return collected.length ? collected : undefined;
}

export function parseCaesarShift(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return undefined;
  }

  return value >= 1 && value <= 25 ? value : undefined;
}

/**
 * Zapis quizu do JSON-a. Puste opcjonalne pola są pomijane, żeby quizData nie
 * puchło od kluczy o wartości undefined — tak samo, jak robił to ręczny literał
 * w toPrismaStationQuizData.
 */
export function serializeStationQuiz(
  quiz: StationQuiz,
  options: SerializeStationQuizOptions = {},
): Record<string, unknown> {
  const allowed = new Set<StationQuizFieldName>(
    options.fields ?? STATION_QUIZ_FIELD_NAMES,
  );
  const serialized: Record<string, unknown> = {};

  if (allowed.has('question')) {
    serialized.question = quiz.question;
  }
  if (allowed.has('answers')) {
    serialized.answers = quiz.answers;
  }
  if (allowed.has('correctAnswerIndex')) {
    serialized.correctAnswerIndex = quiz.correctAnswerIndex;
  }

  const acceptedAnswers = collectAcceptedAnswers(quiz.acceptedAnswers);
  if (allowed.has('acceptedAnswers') && acceptedAnswers) {
    serialized.acceptedAnswers = acceptedAnswers;
  }

  const audioUrl = trimmedOrUndefined(quiz.audioUrl);
  if (allowed.has('audioUrl') && audioUrl) {
    serialized.audioUrl = audioUrl;
  }

  if (allowed.has('caesarShift') && quiz.caesarShift !== undefined) {
    serialized.caesarShift = quiz.caesarShift;
  }

  return serialized;
}

export type ReadStationQuizOptions = {
  /**
   * Tłumaczenie wolno zapisać z pustym slotem odpowiedzi — bazowa stacja i tak
   * dostarcza komplet. Wiersz bazowy z pustym slotem jest natomiast niesprawny
   * i musi zostać odrzucony.
   */
  allowBlankAnswers?: boolean;
  /**
   * Ładunki z formularza admina potrafią przynieść indeks jako string. Odczyt
   * wiersza z bazy takiej tolerancji nie ma, żeby uszkodzony rekord nie zaczął
   * nagle wyglądać na sprawny.
   */
  coerceCorrectAnswerIndex?: boolean;
};

/**
 * Odczyt quizu z nieznanego JSON-a. Biała lista: nieznane klucze są pomijane,
 * ale nie unieważniają wiersza — inaczej rekord zapisany przez nowszy build
 * przestałby się parsować po cofnięciu wdrożenia.
 */
export function readStationQuiz(
  raw: unknown,
  options: ReadStationQuizOptions = {},
): StationQuiz | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }

  const payload = raw as Record<string, unknown>;
  const question = payload.question;
  const answers = payload.answers;

  if (
    typeof question !== 'string' ||
    !Array.isArray(answers) ||
    answers.length !== QUIZ_ANSWER_COUNT ||
    !answers.every((answer) => typeof answer === 'string')
  ) {
    return undefined;
  }

  const rawIndex = payload.correctAnswerIndex;
  if (!options.coerceCorrectAnswerIndex && typeof rawIndex !== 'number') {
    return undefined;
  }

  const normalizedQuestion = question.trim();
  const normalizedAnswers = answers.map((answer) => answer.trim());
  const correctAnswerIndex = Math.round(Number(rawIndex));

  if (
    !normalizedQuestion ||
    (!options.allowBlankAnswers &&
      normalizedAnswers.some((answer) => !answer)) ||
    !Number.isInteger(correctAnswerIndex) ||
    correctAnswerIndex < 0 ||
    correctAnswerIndex >= QUIZ_ANSWER_COUNT
  ) {
    return undefined;
  }

  const acceptedAnswers = collectAcceptedAnswers(payload.acceptedAnswers);
  const caesarShift = parseCaesarShift(payload.caesarShift);

  return {
    question: normalizedQuestion,
    answers: [
      normalizedAnswers[0],
      normalizedAnswers[1],
      normalizedAnswers[2],
      normalizedAnswers[3],
    ],
    correctAnswerIndex,
    // Klucz zostaje nawet przy braku wartości — tak zachowywał się
    // parseStationQuizData i konsumenci porównują na to całe obiekty.
    audioUrl: trimmedOrUndefined(payload.audioUrl),
    ...(acceptedAnswers ? { acceptedAnswers } : {}),
    ...(caesarShift !== undefined ? { caesarShift } : {}),
  };
}

export type StationQuizText = {
  question?: string;
  acceptedAnswers?: string[];
};

/**
 * Odczyt ratunkowy: samo pytanie i klucz odpowiedzi, bez wymogu kompletnej
 * tablicy answers. Stacje reviewed-answer zapisane przez starszy build takiej
 * tablicy nie mają, a kolejka Game Mastera i tak musi pokazać pytanie.
 */
export function readStationQuizText(raw: unknown): StationQuizText {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const payload = raw as Record<string, unknown>;
  const question = trimmedOrUndefined(payload.question);
  if (!question) {
    return {};
  }

  const acceptedAnswers = collectAcceptedAnswers(payload.acceptedAnswers);

  return {
    question,
    ...(acceptedAnswers ? { acceptedAnswers } : {}),
  };
}

/**
 * Scala bazowy quiz z per-jezykowymi nadpisaniami wedlug rol pol.
 *
 * Zastepuje pickFirstQuiz, ktore zwracalo CALY przetlumaczony obiekt. Skoro
 * tlumaczenie z zalozenia nie niesie mechaniki, takie podmienienie gubilo ja
 * bezszelestnie - konsumenci lataly to potem po swojemu albo wcale.
 */
export function mergeStationQuizTranslation(
  base: StationQuiz | undefined,
  candidates: Array<StationQuiz | undefined>,
  stationType: StationType,
): StationQuiz | undefined {
  const translation = candidates.find(
    (candidate) => candidate && Array.isArray(candidate.answers),
  );

  if (!base) {
    // Stacja bez bazowego quizu, ale z przetlumaczonym, to uszkodzone dane.
    // Mechanike bralibysmy znikad, wiec nie udajemy, ze ja mamy.
    if (!translation) {
      return undefined;
    }

    const { caesarShift: _mechanics, ...withoutMechanics } = translation;
    return withoutMechanics;
  }

  if (!translation) {
    return base;
  }

  // Grupa `content` jest atomowa: answers i correctAnswerIndex musza pochodzic
  // z tego samego zrodla, inaczej angielski quiz jest oceniany polskim kluczem.
  // Dla zagadek, ktorych pytanie JEST trescia lamiglowki, cala grupa zostaje
  // bazowa - przetlumaczone haslo to inna zagadka, nie ta sama po angielsku.
  const content = isPuzzleSecretQuestionStationType(stationType)
    ? base
    : translation;

  return {
    question: content.question,
    answers: content.answers,
    correctAnswerIndex: content.correctAnswerIndex,
    ...(content.acceptedAnswers?.length
      ? { acceptedAnswers: content.acceptedAnswers }
      : {}),
    // Nagranie zwykle istnieje tylko po bazowemu; brak wersji per jezyk nie moze
    // wyciszyc stacji.
    audioUrl:
      trimmedOrUndefined(translation.audioUrl) ??
      trimmedOrUndefined(base.audioUrl),
    // Mechanika zawsze z bazy - nie jest tekstem i nie ma pola per jezyk.
    ...(base.caesarShift !== undefined
      ? { caesarShift: base.caesarShift }
      : {}),
  };
}
